import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  Filter,
  Layers,
  FileQuestion,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  ArrowRight,
  School,
  Database,
  CheckCircle2,
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import { useUniversities } from "../hooks/useUniversitiesAndColleges";
import CourseWorkspace from "./question-bank/CourseWorkspace";

export default function QuestionBank({
  initialCourseCode = "",
  initialUniversity = "",
  adminRecord = null,
}) {
  const { universities } = useUniversities();

  // Selected course for Workspace view: null | { course_code, university, title, ... }
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Landing Course Picker state
  const [courses, setCourses] = useState([]);
  const [countsMap, setCountsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters for Landing Picker
  const [search, setSearch] = useState("");
  const [selectedUni, setSelectedUni] = useState(initialUniversity || "");
  const [selectedLevel, setSelectedLevel] = useState("");

  // Fetch course counts from backend API
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
      console.error("Error fetching question counts:", err);
    }
  };

  // Fetch all courses for the picker
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams({
        limit: "250",
      });
      if (selectedUni) params.append("university", selectedUni);
      if (selectedLevel) params.append("level", selectedLevel);

      const res = await fetch(`${API_BASE_URL}/api/admin/courses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const list = data.courses || [];
        setCourses(list);

        // If initialCourseCode was passed, check if we should auto-open workspace
        if (initialCourseCode && !selectedCourse) {
          const found = list.find((c) => {
            const codeMatch = c.course_code.toUpperCase() === initialCourseCode.toUpperCase();
            if (initialUniversity) {
              return codeMatch && c.university.toUpperCase() === initialUniversity.toUpperCase();
            }
            return codeMatch;
          });
          if (found) {
            setSelectedCourse(found);
          } else {
            // Create fallback placeholder course object if not yet in courses list
            setSelectedCourse({
              course_code: initialCourseCode.toUpperCase(),
              university: initialUniversity || "GENERAL",
              title: `Course ${initialCourseCode}`,
            });
          }
        }
      }
    } catch (err) {
      console.error("Error fetching courses for question bank:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [selectedUni, selectedLevel]);

  // Handle external initialCourseCode change
  useEffect(() => {
    if (initialCourseCode) {
      const found = courses.find((c) => {
        const codeMatch = c.course_code.toUpperCase() === initialCourseCode.toUpperCase();
        if (initialUniversity) {
          return codeMatch && c.university.toUpperCase() === initialUniversity.toUpperCase();
        }
        return codeMatch;
      });
      if (found) {
        setSelectedCourse(found);
      } else {
        setSelectedCourse({
          course_code: initialCourseCode.toUpperCase(),
          university: initialUniversity || "GENERAL",
          title: `Course ${initialCourseCode}`,
        });
      }
    }
  }, [initialCourseCode, initialUniversity, courses]);

  // Filtered courses for display
  const filteredCourses = courses.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.course_code || "").toLowerCase().includes(q) ||
      (c.title || "").toLowerCase().includes(q)
    );
  });

  // Calculate totals
  const totalQuestionsInSystem = Object.values(countsMap).reduce(
    (acc, curr) => acc + (curr.total || 0),
    0
  );

  // If a course is selected, render the CourseWorkspace
  if (selectedCourse) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <CourseWorkspace
          activeCourse={selectedCourse}
          onBack={() => setSelectedCourse(null)}
          allCourses={courses}
          adminRecord={adminRecord}
        />
      </div>
    );
  }

  // Otherwise, render the Landing Screen (Course Picker)
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <Database className="w-6 h-6 text-indigo-400" />
            Question Bank
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and manage questions structured cleanly by university and course curriculum.
          </p>
        </div>

        {/* Global summary stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
            <span className="text-slate-400 block text-[10px] uppercase">Indexed Courses</span>
            <span className="text-base font-black text-white">{courses.length}</span>
          </div>
          <div className="bg-slate-900 border border-indigo-500/30 px-4 py-2 rounded-xl">
            <span className="text-indigo-400 block text-[10px] uppercase">Total Questions</span>
            <span className="text-base font-black text-indigo-300">
              {totalQuestionsInSystem.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search course code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* University Selector */}
        <select
          value={selectedUni}
          onChange={(e) => setSelectedUni(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Universities</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.id}
            </option>
          ))}
        </select>

        {/* Level Selector */}
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Levels</option>
          <option value="100">100 Level</option>
          <option value="200">200 Level</option>
          <option value="300">300 Level</option>
          <option value="400">400 Level</option>
          <option value="500">500 Level</option>
        </select>
      </div>

      {/* Course Cards Grid */}
      {loading ? (
        <div className="py-24 text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading course catalog...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-20 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          No courses found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((c) => {
            const countKey = `${(c.university || "").trim().toUpperCase()}_${(c.course_code || "").trim().toUpperCase()}`;
            const counts = countsMap[countKey] || {
              total: 0,
              objective: 0,
              theory: 0,
              fib: 0,
              matching: 0,
            };

            return (
              <div
                key={c.id || `${c.university}_${c.course_code}`}
                onClick={() => setSelectedCourse(c)}
                className="group cursor-pointer bg-slate-900/80 hover:bg-slate-800/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-lg font-black text-indigo-400 group-hover:text-indigo-300 transition tracking-wide">
                      {c.course_code}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                      {c.university}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white group-hover:text-white transition line-clamp-1 mb-2">
                    {c.title}
                  </h3>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-4 font-mono">
                    <span className="text-purple-300">{c.level}L / Sem {c.semester}</span>
                    <span>&bull;</span>
                    <span className="uppercase text-slate-400">{c.course_group}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 font-mono ${
                        counts.total > 0
                          ? "bg-indigo-950/60 text-indigo-300 border-indigo-800/60"
                          : "bg-slate-800/40 text-slate-500 border-slate-700/40"
                      }`}
                    >
                      <FileQuestion className="w-3.5 h-3.5" />
                      {counts.total} questions
                    </span>
                  </div>

                  <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Open Bank <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
