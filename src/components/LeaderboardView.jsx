import React, { useState, useEffect, useMemo } from "react";
import {
  Award,
  RefreshCw,
  Check,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Eye,
  X,
  Copy,
  Zap,
  Flame,
  User,
  Calendar,
  GraduationCap,
  ChevronDown,
  ShieldAlert,
  Sparkles,
  Clock,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function LeaderboardView() {
  const [data, setData] = useState({
    mode: "snapshot",
    selected_week: "",
    available_weeks: [],
    summary: {
      total_competitors: 0,
      top_student: null,
      average_score_percent: 0,
      dominant_university: "N/A",
      fastest_pace_seconds: null,
      flagged_count: 0,
    },
    rankings: [],
  });

  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Filters state
  const [viewMode, setViewMode] = useState("snapshot"); // 'snapshot' | 'live'
  const [selectedWeek, setSelectedWeek] = useState("");
  const [universityFilter, setUniversityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rank"); // 'rank' | 'score' | 'pace' | 'attempts' | 'name'

  // Student Audit Modal State
  const [auditUser, setAuditUser] = useState(null);
  const [auditDetails, setAuditDetails] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Fetch Available Courses for filter
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/admin/courses?limit=150`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const resData = await res.json();
          setCourses(resData.courses || []);
        }
      } catch (err) {
        console.error("Failed to load courses for leaderboard filter:", err);
      }
    };
    fetchCourses();
  }, []);

  // Fetch Leaderboard Data
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams({
        mode: viewMode,
        university: universityFilter,
        type: typeFilter,
        course_id: courseFilter,
        limit: "100",
      });

      if (viewMode === "snapshot" && selectedWeek) {
        params.append("week_start", selectedWeek);
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/leaderboard?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const resData = await res.json();
        setData(resData);
        if (!selectedWeek && resData.selected_week) {
          setSelectedWeek(resData.selected_week);
        }
      }
    } catch (err) {
      console.error("Error fetching leaderboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [viewMode, selectedWeek, universityFilter, typeFilter, courseFilter]);

  // Recompute snapshot
  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/leaderboard/recompute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to recompute leaderboard");

      const resData = await res.json();
      setNotification({
        type: "success",
        text: resData.message || "Leaderboard rank snapshot recomputed successfully!",
      });
      setTimeout(() => setNotification(null), 5000);
      fetchLeaderboard();
    } catch (err) {
      setNotification({ type: "error", text: `Error: ${err.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setRecomputing(false);
    }
  };

  // Inspect student audit details
  const handleInspectStudent = async (studentItem) => {
    setAuditUser(studentItem);
    setLoadingAudit(true);
    setAuditDetails(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/leaderboard/student/${studentItem.user_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const details = await res.json();
        setAuditDetails(details);
      }
    } catch (err) {
      console.error("Failed to load student audit details:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Copy User ID to clipboard
  const handleCopyUserId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!data.rankings || data.rankings.length === 0) return;

    const headers = [
      "Rank",
      "Full Name",
      "Username",
      "University",
      "Department",
      "Level",
      "Best Score %",
      "Course Code",
      "Score Points",
      "Total Questions",
      "Duration (Sec)",
      "Pace (Sec/Q)",
      "Total Attempts",
      "Suspicious Speed Flag",
      "User ID",
      "Updated At",
    ];

    const rows = filteredRankings.map((r) => [
      r.rank,
      `"${r.student?.full_name || ""}"`,
      `"${r.student?.user_name || ""}"`,
      `"${r.student?.university || ""}"`,
      `"${r.student?.department || ""}"`,
      r.student?.year || "",
      r.best_percent,
      r.best_attempt?.course_id || "",
      r.best_attempt?.score ?? "",
      r.best_attempt?.total_questions ?? "",
      r.best_attempt?.time_taken_seconds ?? "",
      r.best_attempt?.pace_seconds_per_question ?? "",
      r.attempts_count || 1,
      r.is_suspicious_speed ? "YES" : "NO",
      r.user_id,
      r.updated_at,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `leaderboard_${viewMode}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and Sort Rankings
  const filteredRankings = useMemo(() => {
    let list = [...(data.rankings || [])];

    // Client-side user deduplication guarantee
    const seen = new Set();
    const uniqueList = [];
    for (const item of list) {
      if (!seen.has(item.user_id)) {
        seen.add(item.user_id);
        uniqueList.push(item);
      }
    }
    list = uniqueList;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const name = (r.student?.full_name || "").toLowerCase();
        const username = (r.student?.user_name || "").toLowerCase();
        const dept = (r.student?.department || "").toLowerCase();
        const course = (r.best_attempt?.course_id || "").toLowerCase();
        const uid = (r.user_id || "").toLowerCase();
        return (
          name.includes(q) ||
          username.includes(q) ||
          dept.includes(q) ||
          course.includes(q) ||
          uid.includes(q)
        );
      });
    }

    if (sortBy === "score") {
      list.sort((a, b) => {
        if (b.best_percent !== a.best_percent) return b.best_percent - a.best_percent;
        const timeA = a.best_attempt?.time_taken_seconds ?? 999999;
        const timeB = b.best_attempt?.time_taken_seconds ?? 999999;
        return timeA - timeB;
      });
    } else if (sortBy === "pace") {
      list.sort((a, b) => {
        const paceA = a.best_attempt?.pace_seconds_per_question ?? 999999;
        const paceB = b.best_attempt?.pace_seconds_per_question ?? 999999;
        return paceA - paceB;
      });
    } else if (sortBy === "attempts") {
      list.sort((a, b) => (b.attempts_count || 0) - (a.attempts_count || 0));
    } else if (sortBy === "name") {
      list.sort((a, b) =>
        (a.student?.full_name || "").localeCompare(b.student?.full_name || "")
      );
    } else {
      list.sort((a, b) => a.rank - b.rank);
    }

    return list;
  }, [data.rankings, searchQuery, sortBy]);

  // Format seconds to human time
  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "N/A";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    if (m === 0) return `${s}s`;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* ─── Top Header & Controls ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <Award className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Leaderboard Intelligence & Audits
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Monitor student competition rankings, speed integrity, weekly snapshots, and attempt telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setViewMode("snapshot")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === "snapshot"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Weekly Snapshots
            </button>
            <button
              onClick={() => setViewMode("live")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                viewMode === "live"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Standings
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? "animate-spin" : ""}`} />
            <span>Recompute Ranks</span>
          </button>
        </div>
      </div>

      {/* ─── Notification Banner ────────────────────────────────────────── */}
      {notification && (
        <div
          className={`p-3.5 border rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ─── Executive KPI Cards (5 Cards) ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Leader */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Rank #1 Leader</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-base font-black text-white truncate">
              {data.summary?.top_student?.name || "No Competitors"}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="font-black text-amber-400 font-mono text-sm">
                {data.summary?.top_student ? `${data.summary.top_student.score_percent}%` : "0%"}
              </span>
              {data.summary?.top_student?.course_id && (
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                  {data.summary.top_student.course_id}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Competitors */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Competitors</span>
            <User className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-white font-mono">
              {data.summary?.total_competitors || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Active test takers ranked
            </p>
          </div>
        </div>

        {/* Card 3: Class Average */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Average Score</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {data.summary?.average_score_percent || 0}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cohort average percentage
            </p>
          </div>
        </div>

        {/* Card 4: Fastest Pace */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Fastest Pace</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-cyan-300 font-mono">
              {data.summary?.fastest_pace_seconds !== null ? `${data.summary.fastest_pace_seconds}s` : "N/A"}
              <span className="text-xs font-normal text-slate-400 font-sans ml-1">/q</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Top question response velocity
            </p>
          </div>
        </div>

        {/* Card 5: Integrity / Suspicious Speed */}
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Speed Alerts</span>
            <ShieldAlert className={`w-4 h-4 ${data.summary?.flagged_count > 0 ? "text-rose-400 animate-pulse" : "text-slate-500"}`} />
          </div>
          <div className="mt-2.5">
            <div className={`text-2xl font-black font-mono ${data.summary?.flagged_count > 0 ? "text-rose-400" : "text-slate-300"}`}>
              {data.summary?.flagged_count || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Sub-1s answer velocity flags
            </p>
          </div>
        </div>
      </div>

      {/* ─── Filters & Search Toolbar ───────────────────────────────────── */}
      <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, username, department, course, or UUID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Week Selector (Snapshot mode only) */}
          {viewMode === "snapshot" && data.available_weeks?.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                {data.available_weeks.map((w, idx) => (
                  <option key={w} value={w} className="bg-slate-900 text-white">
                    Week of {new Date(w).toLocaleDateString()} {idx === 0 ? "(Latest)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* University Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={universityFilter}
              onChange={(e) => setUniversityFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900 text-white">All Universities</option>
              <option value="TASUED" className="bg-slate-900 text-white">TASUED</option>
              <option value="OOU" className="bg-slate-900 text-white">OOU</option>
              <option value="UNILAG" className="bg-slate-900 text-white">UNILAG</option>
            </select>
          </div>

          {/* Exam Type Segmented Pills */}
          <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex items-center">
            {[
              { id: "all", label: "All Modes" },
              { id: "OBJ", label: "OBJ" },
              { id: "FIB", label: "FIB" },
              { id: "THY", label: "Theory" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  typeFilter === t.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Course Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="all" className="bg-slate-900 text-white">All Courses</option>
              {courses.map((c) => (
                <option key={c.id || c.course_code} value={c.course_code} className="bg-slate-900 text-white">
                  {c.course_code} - {c.name || c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="rank" className="bg-slate-900 text-white">Sort by Rank</option>
              <option value="score" className="bg-slate-900 text-white">Sort by Score</option>
              <option value="pace" className="bg-slate-900 text-white">Sort by Fastest Pace</option>
              <option value="attempts" className="bg-slate-900 text-white">Sort by Attempts Count</option>
              <option value="name" className="bg-slate-900 text-white">Sort by Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Main Leaderboard Table ─────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-slate-400 space-y-3">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading leaderboard analytics & student profiles...</p>
          </div>
        ) : filteredRankings.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs space-y-2">
            <p>No leaderboard standings found for the selected criteria.</p>
            <p className="text-[11px] text-slate-600">
              Try adjusting your university, exam type, or search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="py-3.5 px-4 w-16">Rank</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">University & Dept</th>
                  <th className="py-3.5 px-4">Best Score</th>
                  <th className="py-3.5 px-4">Course Attempted</th>
                  <th className="py-3.5 px-4">Duration & Pace</th>
                  <th className="py-3.5 px-4">Attempts</th>
                  <th className="py-3.5 px-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRankings.map((row, idx) => {
                  const student = row.student;
                  const attempt = row.best_attempt;
                  const displayRank = sortBy === "rank" ? (row.rank || idx + 1) : idx + 1;
                  const isTop1 = displayRank === 1;
                  const isTop2 = displayRank === 2;
                  const isTop3 = displayRank === 3;

                  return (
                    <tr
                      key={row.user_id}
                      className={`hover:bg-slate-800/40 transition group ${
                        row.is_suspicious_speed ? "bg-rose-950/15" : ""
                      }`}
                    >
                      {/* Rank Medal */}
                      <td className="py-3.5 px-4 font-black">
                        {isTop1 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-black text-xs shadow-sm">
                            🥇 #1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-300/20 text-slate-200 border border-slate-300/40 font-mono font-black text-xs shadow-sm">
                            🥈 #2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-700/20 text-amber-400 border border-amber-700/40 font-mono font-black text-xs shadow-sm">
                            🥉 #3
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center font-mono text-slate-400 font-bold px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800/80 min-w-[32px]">
                            #{displayRank}
                          </span>
                        )}
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {student.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt={student.full_name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                              {student.full_name?.charAt(0)?.toUpperCase() || "S"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs truncate max-w-[150px] sm:max-w-[180px]">
                                {student.full_name}
                              </span>
                              {student.is_premium && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  PRO
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <span>@{student.user_name}</span>
                              {student.current_streak > 0 && (
                                <span className="text-amber-400 flex items-center gap-0.5 ml-1">
                                  <Flame className="w-3 h-3 text-amber-400 inline" />
                                  {student.current_streak}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* University & Department */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-indigo-300 uppercase tracking-wide text-xs">
                          {student.university}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                          {student.department} {student.year ? `(${student.year})` : ""}
                        </div>
                      </td>

                      {/* Best Score % */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={`font-black font-mono text-sm ${
                              row.best_percent >= 80
                                ? "text-emerald-400"
                                : row.best_percent >= 50
                                ? "text-amber-400"
                                : "text-rose-400"
                            }`}
                          >
                            {row.best_percent}%
                          </span>
                          {attempt?.score !== undefined && attempt?.total_questions && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              ({attempt.score}/{attempt.total_questions})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Course Code */}
                      <td className="py-3.5 px-4">
                        {attempt?.course_id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700/80 font-mono font-bold text-[11px]">
                              {attempt.course_id}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500">
                              {attempt.type || "OBJ"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">No attempt data</span>
                        )}
                      </td>

                      {/* Duration & Pace */}
                      <td className="py-3.5 px-4">
                        {attempt ? (
                          <div>
                            <div className="font-mono text-slate-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>{formatTime(attempt.time_taken_seconds)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {attempt.pace_seconds_per_question !== null && (
                                <span className="text-[10px] font-mono text-cyan-400">
                                  {attempt.pace_seconds_per_question}s/q
                                </span>
                              )}
                              {row.is_suspicious_speed && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                                  Speed Alert
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">N/A</span>
                        )}
                      </td>

                      {/* Attempts Count */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-300">
                          {row.attempts_count || 1}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          attempt{row.attempts_count !== 1 ? "s" : ""}
                        </span>
                      </td>

                      {/* Audit Details Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleInspectStudent(row)}
                          className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-700/70 hover:border-indigo-500/40 rounded-xl text-xs font-semibold transition flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Student Audit & Attempt History Drawer ─────────────────────────── */}
      {auditUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl p-6 overflow-y-auto space-y-6">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                {auditUser.student?.avatar_url ? (
                  <img
                    src={auditUser.student.avatar_url}
                    alt={auditUser.student.full_name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-300 font-bold text-base">
                    {auditUser.student?.full_name?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {auditUser.student?.full_name}
                    {auditUser.student?.is_premium && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        PREMIUM
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                    <span>@{auditUser.student?.user_name}</span>
                    <span>•</span>
                    <span className="text-indigo-400">{auditUser.student?.university}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setAuditUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Academic Details & User ID Copy */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Department / Level:</span>
                <span className="font-semibold text-white">
                  {auditUser.student?.department} {auditUser.student?.year ? `(${auditUser.student.year})` : ""}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Leaderboard Rank:</span>
                <span className="font-bold text-amber-400 font-mono">
                  #{auditUser.rank} ({auditUser.best_percent}%)
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                <span>User UUID:</span>
                <button
                  onClick={() => handleCopyUserId(auditUser.user_id)}
                  className="flex items-center gap-1 font-mono text-[11px] text-slate-300 hover:text-indigo-300 transition"
                  title="Click to copy full ID"
                >
                  <span>{auditUser.user_id.slice(0, 16)}...</span>
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>
              </div>
            </div>

            {/* Attempt History Section */}
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Exam Attempt Telemetry & History
                </h4>
                <span className="text-[11px] text-slate-500">
                  {auditDetails?.attempts?.length || 0} attempts on record
                </span>
              </div>

              {loadingAudit ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading student exam history...
                </div>
              ) : !auditDetails?.attempts || auditDetails.attempts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No exam attempts found for this student.
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {auditDetails.attempts.map((att) => {
                    const pct = Math.round((att.score / (att.total_questions || 1)) * 100);
                    const pace = att.total_questions > 0
                      ? Math.round((att.time_taken / att.total_questions) * 10) / 10
                      : null;
                    const isSuspicious = pace !== null && pace < 1.0 && pct >= 80;

                    return (
                      <div
                        key={att.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          isSuspicious
                            ? "bg-rose-950/20 border-rose-500/40"
                            : "bg-slate-950/60 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800 text-[11px]">
                              {att.course_id}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {att.type || "OBJ"}
                            </span>
                            {att.is_retake && (
                              <span className="text-[9px] font-bold text-amber-400/80 px-1.5 rounded bg-amber-500/10">
                                Retake
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-black font-mono text-sm ${
                              pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400"
                            }`}
                          >
                            {pct}% ({att.score}/{att.total_questions})
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800/40">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {formatTime(att.time_taken)}
                            {pace !== null && <span className="text-cyan-400 ml-1">({pace}s/q)</span>}
                          </span>
                          <span className="text-slate-500">
                            {new Date(att.date_taken).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
