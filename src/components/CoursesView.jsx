import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import {
  useUniversities,
  useColleges,
} from "../hooks/useUniversitiesAndColleges";

export default function CoursesView({ onNavigateToQuestions }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  // Real universities/colleges from Supabase (no more hardcoded lists)
  const { universities } = useUniversities();

  // Filters
  const [search, setSearch] = useState("");
  const [university, setUniversity] = useState("");
  const [level, setLevel] = useState("");
  const [semester, setSemester] = useState("");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams({
        page,
        limit,
        search,
        university,
        level,
        semester,
      });

      const res = await fetch(`${API_BASE_URL}/api/admin/courses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
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
  }, [page, university, level, semester]);

  // Update the selected-colleges default whenever the real college list for
  // the chosen university (re)loads, or the course group changes.
  useEffect(() => {
    if (formData.course_group === "general") {
      setSelectedColleges(["ALL"]);
    } else {
      if (selectedColleges.length === 1 && selectedColleges[0] === "ALL") {
        setSelectedColleges(availableColleges.map((c) => c.id));
      }
    }
  }, [availableColleges, formData.course_group]);

  const toggleCollegeSelection = (collegeId) => {
    if (formData.course_group === "general") return;
    if (selectedColleges.includes(collegeId)) {
      const next = selectedColleges.filter(
        (id) => id !== "ALL" && id !== collegeId,
      );
      setSelectedColleges(next);
    } else {
      const next = [
        ...selectedColleges.filter((id) => id !== "ALL"),
        collegeId,
      ];
      setSelectedColleges(next);
    }
  };

  const handleSelectAllColleges = () => {
    if (formData.course_group === "general") return;
    const allIds = availableColleges.map((c) => c.id);
    if (selectedColleges.length === allIds.length) {
      setSelectedColleges([]);
    } else {
      setSelectedColleges(allIds);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCourses();
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const finalColleges =
        formData.course_group === "general"
          ? ["ALL"]
          : selectedColleges.length > 0
            ? selectedColleges
            : ["ALL"];

      const payload = {
        course_code: formData.course_code.trim().toUpperCase(),
        name: formData.course_code.trim().toUpperCase(),
        title: formData.title.trim(),
        course_group: formData.course_group,
        colleges: finalColleges,
        level: parseInt(formData.level, 10),
        semester: parseInt(formData.semester, 10),
        university: formData.university,
        file: formData.course_code.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      };

      const res = await fetch(`${API_BASE_URL}/api/admin/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create course");

      setIsAddModalOpen(false);
      setNotification({
        type: "success",
        text: `Course ${data.course_code} created successfully!`,
      });
      setTimeout(() => setNotification(null), 4000);
      fetchCourses();
    } catch (err) {
      alert(`Error creating course: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Courses Metadata Management
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Browse and manage all registered course codes, level & semester
            metadata across institutions.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
        >
          <Plus className="w-4 h-4" /> Add New Course
        </button>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search course code or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          <select
            value={university}
            onChange={(e) => {
              setUniversity(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.id}
              </option>
            ))}
          </select>

          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Levels</option>
            <option value="100">100 Level</option>
            <option value="200">200 Level</option>
            <option value="300">300 Level</option>
            <option value="400">400 Level</option>
          </select>

          <select
            value={semester}
            onChange={(e) => {
              setSemester(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Semesters</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            Loading course metadata...
          </div>
        ) : courses.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No course records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">University</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4">Colleges</th>
                  <th className="py-3 px-4">Level / Sem</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-indigo-400">
                      {c.course_code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-300">
                      {c.university}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-white">
                      {c.title}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                        {c.course_group}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {Array.isArray(c.colleges)
                        ? c.colleges.join(", ")
                        : "ALL"}
                    </td>
                    <td className="py-3.5 px-4 text-purple-300 font-semibold">
                      {c.level}L / Sem {c.semester}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() =>
                          onNavigateToQuestions &&
                          onNavigateToQuestions(c.course_code)
                        }
                        className="px-2.5 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-bold hover:bg-indigo-600 hover:text-white transition"
                      >
                        View Questions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing{" "}
            <span className="font-bold text-white">
              {courses.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-bold text-white">
              {Math.min(page * limit, total)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-white">
              {total.toLocaleString()}
            </span>{" "}
            courses
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
              <h2 className="text-base font-bold text-white">
                Create New Course Entry
              </h2>
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
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Course Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CSC115"
                    value={formData.course_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        course_code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    University
                  </label>
                  <select
                    value={formData.university}
                    onChange={(e) =>
                      setFormData({ ...formData, university: e.target.value })
                    }
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
                <label className="block text-slate-400 mb-1 font-semibold">
                  Full Course Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Hardware and Maintenance"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Group
                  </label>
                  <select
                    value={formData.course_group}
                    onChange={(e) =>
                      setFormData({ ...formData, course_group: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="general">General</option>
                    <option value="departmental">Departmental</option>
                    <option value="vocational">Vocational</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Level
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) =>
                      setFormData({ ...formData, level: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Semester
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) =>
                      setFormData({ ...formData, semester: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-400 font-semibold">
                    Colleges for {formData.university}
                  </label>
                  {formData.course_group !== "general" && (
                    <button
                      type="button"
                      onClick={handleSelectAllColleges}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline"
                    >
                      {selectedColleges.length === availableColleges.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  )}
                </div>

                {formData.course_group === "general" ? (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-xs flex items-center justify-between">
                    <span>
                      ✨ <strong>General Course:</strong> Offered to ALL
                      colleges in {formData.university}.
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-bold">
                      ALL
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 p-2 bg-slate-950/60 border border-slate-800 rounded-xl max-h-36 overflow-y-auto">
                      {availableColleges.map((c) => {
                        const isSelected = selectedColleges.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCollegeSelection(c.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700"
                            }`}
                          >
                            <span>{c.name || c.id}</span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Click the pills above to select which{" "}
                      {formData.university} colleges offer this{" "}
                      {formData.course_group} course.
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
