import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  Layers,
  HelpCircle,
  FileQuestion,
  Sparkles,
  Edit2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import { useUniversities, useColleges } from "../hooks/useUniversitiesAndColleges";
import CourseImportWizard from "./courses/CourseImportWizard";

export default function CoursesView({ onNavigateToQuestions }) {
  const [courses, setCourses] = useState([]);
  const [countsMap, setCountsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  // Universities list from hook
  const { universities } = useUniversities();

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [university, setUniversity] = useState("");
  const [level, setLevel] = useState("");
  const [semester, setSemester] = useState("");
  const [group, setGroup] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Edit modal state
  const [editingCourse, setEditingCourse] = useState(null); // course object being edited
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete confirm state
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Tracks whether the college picker is in "edit" mode (pre-filled) vs "create" (auto-select all)
  const isEditingMode = useRef(false);

  // Form Data for Single Course
  const [formData, setFormData] = useState({
    course_code: "",
    title: "",
    course_group: "general",
    level: "100",
    semester: "1",
    university: "",
  });
  const [selectedColleges, setSelectedColleges] = useState(["ALL"]);
  const { colleges: availableColleges } = useColleges(formData.university);

  const [notification, setNotification] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch live counts for all courses via backend API
  const fetchCounts = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/admin/questions/course-counts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const map = {};
        (data || []).forEach((row) => {
          const key = `${(row.university || "").trim().toUpperCase()}_${(row.course_code || "").trim().toUpperCase()}`;
          map[key] = {
            total: Number(row.total) || 0,
            objective: Number(row.objective_count) || 0,
            theory: Number(row.theory_count) || 0,
            fib: Number(row.fib_count) || 0,
            matching: Number(row.matching_count) || 0,
          };
        });
        setCountsMap(map);
      }
    } catch (err) {
      console.error("Error fetching course question counts:", err);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams({
        page,
        limit,
        search: debouncedSearch,
        university,
        level,
        semester,
      });

      const res = await fetch(`${API_BASE_URL}/api/admin/courses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        let list = data.courses || [];
        if (group) {
          list = list.filter((c) => (c.course_group || "").toLowerCase() === group.toLowerCase());
        }
        setCourses(list);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchCounts();
  }, [page, debouncedSearch, university, level, semester, group]);

  // Update colleges on modal — only auto-select all colleges when CREATING (not editing)
  useEffect(() => {
    if (formData.course_group === "general") {
      setSelectedColleges(["ALL"]);
    } else {
      // Only auto-select all colleges when creating a new course, not when editing
      if (!isEditingMode.current && selectedColleges.length === 1 && selectedColleges[0] === "ALL") {
        setSelectedColleges(availableColleges.map((c) => c.id));
      }
    }
  }, [availableColleges, formData.course_group]);

  const toggleCollegeSelection = (collegeId) => {
    if (formData.course_group === "general") return;
    if (selectedColleges.includes(collegeId)) {
      setSelectedColleges(selectedColleges.filter((id) => id !== "ALL" && id !== collegeId));
    } else {
      setSelectedColleges([...selectedColleges.filter((id) => id !== "ALL"), collegeId]);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const finalColleges =
        formData.course_group === "general"
          ? ["ALL"]
          : selectedColleges.length === 0
          ? ["ALL"]
          : selectedColleges;

      const payload = {
        ...formData,
        colleges: finalColleges,
      };

      const res = await fetch(`${API_BASE_URL}/api/admin/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({
          course_code: "",
          title: "",
          course_group: "general",
          level: "100",
          semester: "1",
          university: "",
        });
        setNotification({ type: "success", message: "Course created successfully!" });
        fetchCourses();
        fetchCounts();
      } else {
        const errData = await res.json();
        setNotification({ type: "error", message: errData.error || "Failed to create course" });
      }
    } catch (err) {
      setNotification({ type: "error", message: err.message });
    }
  };

  // Open edit modal pre-populated with the selected course
  const openEditModal = (course) => {
    isEditingMode.current = true; // prevent the auto-select effect from overwriting pre-filled colleges
    setEditingCourse(course);
    setFormData({
      course_code: course.course_code || "",
      title: course.title || "",
      course_group: course.course_group || "general",
      level: String(course.level || "100"),
      semester: String(course.semester || "1"),
      // Normalize to lowercase so useColleges() fetches the right data from the API
      university: (course.university || "").toLowerCase(),
    });
    setSelectedColleges(
      Array.isArray(course.colleges) && course.colleges.length > 0
        ? course.colleges
        : ["ALL"]
    );
    setIsEditModalOpen(true);
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse) return;
    setEditSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const finalColleges =
        formData.course_group === "general"
          ? ["ALL"]
          : selectedColleges.length === 0
          ? ["ALL"]
          : selectedColleges;

      const payload = {
        ...formData,
        colleges: finalColleges,
      };

      const res = await fetch(
        `${API_BASE_URL}/api/admin/courses/${editingCourse.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingCourse(null);
        setNotification({ type: "success", message: "Course updated successfully!" });
        fetchCourses();
        fetchCounts();
      } else {
        const errData = await res.json();
        setNotification({ type: "error", message: errData.error || "Failed to update course" });
      }
    } catch (err) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setEditSaving(false);
    }
  };

  // Delete: prompt confirm modal
  const openDeleteModal = (course) => {
    const countKey = `${(course.university || "").trim().toUpperCase()}_${(course.course_code || "").trim().toUpperCase()}`;
    const counts = countsMap[countKey] || { total: 0 };
    setDeletingCourse({ ...course, questionCount: counts.total });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;
    setDeleteLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/courses/${deletingCourse.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const resData = await res.json();

      if (res.ok) {
        setIsDeleteModalOpen(false);
        setDeletingCourse(null);
        setNotification({ type: "success", message: `Course "${deletingCourse.course_code}" deleted.` });
        fetchCourses();
        fetchCounts();
      } else {
        setNotification({ type: "error", message: resData.error || "Failed to delete course" });
        setIsDeleteModalOpen(false);
      }
    } catch (err) {
      setNotification({ type: "error", message: err.message });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Courses Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage degree courses, curriculum structures, and view live Question Bank links across universities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsBulkImportOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            Bulk Import
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* University Filter */}
        <select
          value={university}
          onChange={(e) => {
            setUniversity(e.target.value);
            setPage(1);
          }}
          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Universities</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.id}
            </option>
          ))}
        </select>

        {/* Level Filter */}
        <select
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setPage(1);
          }}
          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Levels</option>
          <option value="100">100 Level</option>
          <option value="200">200 Level</option>
          <option value="300">300 Level</option>
          <option value="400">400 Level</option>
          <option value="500">500 Level</option>
        </select>

        {/* Semester Filter */}
        <select
          value={semester}
          onChange={(e) => {
            setSemester(e.target.value);
            setPage(1);
          }}
          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Semesters</option>
          <option value="1">1st Semester</option>
          <option value="2">2nd Semester</option>
        </select>

        {/* Group Filter */}
        <select
          value={group}
          onChange={(e) => {
            setGroup(e.target.value);
            setPage(1);
          }}
          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Groups</option>
          <option value="general">General</option>
          <option value="departmental">Departmental</option>
          <option value="vocational">Vocational</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500">
            No courses found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">University</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4">Colleges</th>
                  <th className="py-3 px-4">Level / Sem</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {courses.map((c) => {
                  const countKey = `${(c.university || "").trim().toUpperCase()}_${(c.course_code || "").trim().toUpperCase()}`;
                  const counts = countsMap[countKey] || {
                    total: 0,
                    objective: 0,
                    theory: 0,
                    fib: 0,
                    matching: 0,
                  };

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition group">
                      <td className="py-3 px-4 font-bold text-indigo-400 font-mono tracking-wide">
                        {c.course_code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-300">
                        {c.university}
                      </td>
                      <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                        {c.title}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                          {c.course_group}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {Array.isArray(c.colleges) ? c.colleges.join(", ") : "ALL"}
                      </td>
                      <td className="py-3 px-4 text-purple-300 font-semibold">
                        {c.level}L / Sem {c.semester}
                      </td>
                      {/* Live Questions Column with Tooltip on Hover */}
                      <td className="py-3 px-4">
                        <div className="relative inline-block group/tip">
                          <button
                            onClick={() => onNavigateToQuestions && onNavigateToQuestions(c.course_code, c.university)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition ${
                              counts.total > 0
                                ? "bg-indigo-950/60 text-indigo-300 border-indigo-800/60 hover:bg-indigo-900/60"
                                : "bg-slate-800/50 text-slate-500 border-slate-700/50"
                            }`}
                          >
                            <FileQuestion className="w-3.5 h-3.5" />
                            <span>{counts.total.toLocaleString()}</span>
                          </button>

                          {/* Hover breakdown tooltip */}
                          {counts.total > 0 && (
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tip:flex flex-col bg-slate-950 border border-slate-800 shadow-2xl rounded-xl p-2.5 text-[11px] z-30 whitespace-nowrap gap-1">
                              <span className="text-[10px] text-slate-400 font-bold border-b border-slate-800 pb-1 uppercase tracking-wider">
                                Question Breakdown
                              </span>
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-slate-300 font-mono">
                                <span>MCQ: <strong className="text-indigo-400">{counts.objective}</strong></span>
                                <span>Theory: <strong className="text-amber-400">{counts.theory}</strong></span>
                                <span>FIB: <strong className="text-emerald-400">{counts.fib}</strong></span>
                                <span>Matching: <strong className="text-sky-400">{counts.matching}</strong></span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
                            title="Edit course"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-300 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDeleteModal(c); }}
                            title={counts.total > 0 ? `Cannot delete — has ${counts.total} question(s)` : "Delete course"}
                            className={`p-1.5 rounded-lg border transition ${
                              counts.total > 0
                                ? "bg-slate-800/50 border-slate-700/50 text-slate-600 cursor-not-allowed"
                                : "bg-slate-800 hover:bg-rose-600/30 border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300"
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onNavigateToQuestions && onNavigateToQuestions(c.course_code, c.university)}
                            className="px-3 py-1.5 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition flex items-center gap-1.5"
                          >
                            Questions
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <span className="font-bold text-white">{courses.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{" "}
            <span className="font-bold text-white">{Math.min(page * limit, total)}</span> of{" "}
            <span className="font-bold text-white">{total.toLocaleString()}</span> courses
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="font-semibold text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Course Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Create New Course Entry</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSC115"
                    value={formData.course_code}
                    onChange={(e) =>
                      setFormData({ ...formData, course_code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">University</label>
                  <select
                    required
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select University</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Introduction to Computer Science"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="300">300</option>
                    <option value="400">400</option>
                    <option value="500">500</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Group</label>
                  <select
                    value={formData.course_group}
                    onChange={(e) => setFormData({ ...formData, course_group: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="general">General</option>
                    <option value="departmental">Departmental</option>
                    <option value="vocational">Vocational</option>
                  </select>
                </div>
              </div>

              {formData.course_group !== "general" && (
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Applicable Colleges</label>
                  <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                    {availableColleges.map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={selectedColleges.includes(col.id)}
                          onChange={() => toggleCollegeSelection(col.id)}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{col.name || col.id}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Courses Modal */}
      <CourseImportWizard
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        universities={universities}
        onSuccess={() => {
          fetchCourses();
          fetchCounts();
        }}
      />

      {/* Edit Course Modal */}
      {isEditModalOpen && editingCourse && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-white">Edit Course</h2>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">{editingCourse.course_code} · {editingCourse.university}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSC115"
                    value={formData.course_code}
                    onChange={(e) =>
                      setFormData({ ...formData, course_code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">University</label>
                  <select
                    required
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select University</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Course Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="300">300</option>
                    <option value="400">400</option>
                    <option value="500">500</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Semester</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Group</label>
                  <select
                    value={formData.course_group}
                    onChange={(e) => setFormData({ ...formData, course_group: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="general">General</option>
                    <option value="departmental">Departmental</option>
                    <option value="vocational">Vocational</option>
                  </select>
                </div>
              </div>

              {formData.course_group !== "general" && (
                <div>
                  <label className="block text-slate-400 mb-1.5 font-semibold">Applicable Colleges</label>
                  <div className="max-h-32 overflow-y-auto space-y-1 p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                    {availableColleges.map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer py-0.5"
                      >
                        <input
                          type="checkbox"
                          checked={selectedColleges.includes(col.id)}
                          onChange={() => toggleCollegeSelection(col.id)}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{col.name || col.id}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center gap-2"
                >
                  {editSaving ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  ) : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Course Confirmation Modal */}
      {isDeleteModalOpen && deletingCourse && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Delete Course</h2>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{deletingCourse.course_code} · {deletingCourse.university}</p>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="ml-auto text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deletingCourse.questionCount > 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-amber-200">
                  <p className="font-semibold mb-1">Cannot delete this course</p>
                  <p className="text-amber-300/80">
                    <strong className="text-amber-300">{deletingCourse.questionCount}</strong> question{deletingCourse.questionCount !== 1 ? "s" : ""} are linked to this course.
                    Delete or move all questions first before removing the course.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-300 space-y-1">
                <p>Are you sure you want to permanently delete:</p>
                <p className="font-semibold text-white">&ldquo;{deletingCourse.title}&rdquo;</p>
                <p className="text-slate-500 pt-1">This action cannot be undone.</p>
              </div>
            )}

            <div className="pt-1 flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                {deletingCourse.questionCount > 0 ? "Close" : "Cancel"}
              </button>
              {deletingCourse.questionCount === 0 && (
                <button
                  onClick={handleDeleteCourse}
                  disabled={deleteLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
                >
                  {deleteLoading ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
                  ) : (<><Trash2 className="w-3.5 h-3.5" /> Delete Course</>)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}