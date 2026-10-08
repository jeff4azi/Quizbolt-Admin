import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Upload,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  ChevronDown,
  BookOpen,
  MoveRight,
  Sparkles,
} from "lucide-react";
import { API_BASE_URL } from "../../config/apiConfig";
import { supabase } from "../../lib/supabaseClient";
import QuestionDrawer from "./QuestionDrawer";
import BulkImportWizard from "./BulkImportWizard";

export default function CourseWorkspace({
  activeCourse, // { course_code, university, title }
  onBack,
  allCourses = [],
  adminRecord = null,
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  // Tabs: 'all', 'objective', 'theory', 'fib', 'matching', 'needs_review'
  const [activeTab, setActiveTab] = useState("all");

  // Filters within workspace
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");

  // Live breakdown counts
  const [breakdown, setBreakdown] = useState({
    total: 0,
    objective: 0,
    theory: 0,
    fib: 0,
    matching: 0,
  });
  const [needsReviewCount, setNeedsReviewCount] = useState(0);

  // Duplicate detection state
  const [duplicatePairs, setDuplicatePairs] = useState([]);
  const [duplicatePairsCount, setDuplicatePairsCount] = useState(0);
  const [duplicateThreshold, setDuplicateThreshold] = useState(0.70);
  const [includeOtherTypes, setIncludeOtherTypes] = useState(false);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);

  const fetchDuplicates = async () => {
    if (!activeCourse?.university || !activeCourse?.course_code) return;
    setLoadingDuplicates(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const params = new URLSearchParams({
        university: activeCourse.university,
        course_code: activeCourse.course_code,
        threshold: duplicateThreshold,
        include_other_types: includeOtherTypes,
      });
      const res = await fetch(`${API_BASE_URL}/api/admin/questions/duplicates?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const resData = await res.json();
        setDuplicatePairs(resData.pairs || []);
        setDuplicatePairsCount(resData.count || 0);
      }
    } catch (err) {
      console.error("Error fetching duplicate question pairs:", err);
    } finally {
      setLoadingDuplicates(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, [activeCourse, duplicateThreshold, includeOtherTypes]);

  const handleDismissDuplicate = async (pair) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/admin/questions/duplicates/dismiss`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          university: activeCourse.university,
          course_code: activeCourse.course_code,
          question_id_a: pair.question_id_a,
          question_id_b: pair.question_id_b,
        }),
      });
      if (res.ok) {
        setNotification({ type: "success", message: "Pair marked as 'Not a Duplicate'." });
        fetchDuplicates();
      }
    } catch (err) {
      setNotification({ type: "error", message: err.message });
    }
  };

  // Multi-selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals & Drawers
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

  // Bulk actions modal state
  const [bulkActionType, setBulkActionType] = useState(null); // 'difficulty', 'section', 'move'
  const [bulkDifficulty, setBulkDifficulty] = useState("medium");
  const [bulkSection, setBulkSection] = useState("");
  const [targetMoveCourse, setTargetMoveCourse] = useState("");

  // 10-second Undo toast state
  const [undoToast, setUndoToast] = useState(null); // { questions: [...], timerId: ..., secondsLeft: 10 }
  const undoTimerRef = useRef(null);

  // Notification message
  const [notification, setNotification] = useState(null);

  // Fetch single course question counts breakdown & needs-review count
  const fetchCounts = async () => {
    if (!activeCourse) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      // 1. Single course counts breakdown
      const params = new URLSearchParams({
        university: activeCourse.university,
        course_code: activeCourse.course_code,
      });

      const resCounts = await fetch(
        `${API_BASE_URL}/api/admin/courses/${activeCourse.course_code}/question-counts?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resCounts.ok) {
        const countsData = await resCounts.json();
        setBreakdown({
          total: Number(countsData.total) || 0,
          objective: Number(countsData.objective) || 0,
          theory: Number(countsData.theory) || 0,
          fib: Number(countsData.fib) || 0,
          matching: Number(countsData.matching) || 0,
        });
      }

      // 2. Needs review count
      const resReview = await fetch(
        `${API_BASE_URL}/api/admin/questions/needs-review?${params}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (resReview.ok) {
        const reviewData = await resReview.json();
        setNeedsReviewCount(reviewData.count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch workspace question counts:", err);
    }
  };

  // Fetch questions for this course
  const fetchQuestions = async () => {
    if (!activeCourse) return;
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (activeTab === "needs_review") {
        const params = new URLSearchParams({
          university: activeCourse.university,
          course_code: activeCourse.course_code,
          page,
          limit,
        });
        const res = await fetch(`${API_BASE_URL}/api/admin/questions/needs-review?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const resData = await res.json();
          let list = resData.data || resData.questions || [];
          if (search) {
            list = list.filter((q) => (q.question || "").toLowerCase().includes(search.toLowerCase()));
          }
          setQuestions(list);
          setTotalQuestions(resData.total !== undefined ? resData.total : (resData.count || 0));
          setTotalPages(resData.totalPages || 1);
        }
      } else {
        const params = new URLSearchParams({
          university: activeCourse.university,
          course_code: activeCourse.course_code,
          page,
          limit,
          search,
          difficulty: difficultyFilter,
        });
        if (activeTab !== "all") {
          params.append("type", activeTab);
        }

        const res = await fetch(`${API_BASE_URL}/api/admin/questions?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const resData = await res.json();
          let list = resData.questions || resData.data || [];
          if (sectionFilter) {
            list = list.filter(
              (q) => (q.section || "").toLowerCase() === sectionFilter.toLowerCase()
            );
          }
          setQuestions(list);
          setTotalQuestions(resData.total !== undefined ? resData.total : (resData.count || 0));
          setTotalPages(resData.totalPages || 1);
        }
      }
    } catch (err) {
      console.error("Error fetching workspace questions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [activeCourse]);

  useEffect(() => {
    fetchQuestions();
    setSelectedIds([]);
  }, [activeCourse, activeTab, page, search, difficultyFilter, sectionFilter]);

  // Unique sections list from currently loaded questions
  const availableSections = Array.from(
    new Set(questions.map((q) => q.section).filter(Boolean))
  );

  // Multi-select toggle
  const toggleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === questions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questions.map((q) => q.id));
    }
  };

  // Create or Update Question handler
  const handleSaveQuestion = async (payload, existingId) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;

    if (existingId) {
      const res = await fetch(`${API_BASE_URL}/api/admin/questions/${existingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update question.");
      }
      setNotification({ type: "success", message: "Question updated successfully!" });
    } else {
      const res = await fetch(`${API_BASE_URL}/api/admin/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create question.");
      }
      setNotification({ type: "success", message: "Question created successfully!" });
    }

    fetchQuestions();
    fetchCounts();
  };

  // Single delete question
  const handleDeleteSingle = async (q) => {
    if (!window.confirm(`Delete question "${q.question_id}"?`)) return;
    executeDeleteWithUndo([q]);
  };

  // Bulk delete selected questions
  const handleBulkDelete = () => {
    const toDelete = questions.filter((q) => selectedIds.includes(q.id));
    if (toDelete.length === 0) return;
    if (!window.confirm(`Delete ${toDelete.length} selected questions?`)) return;
    executeDeleteWithUndo(toDelete);
  };

  // 10-second client-side delete with undo
  const executeDeleteWithUndo = async (deletedQuestions) => {
    const ids = deletedQuestions.map((q) => q.id);

    // 1. Immediately remove from local state
    setQuestions((prev) => prev.filter((q) => !ids.includes(q.id)));
    setSelectedIds([]);

    // 2. Call API bulk-delete
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      await fetch(`${API_BASE_URL}/api/admin/questions/bulk-delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      });
    } catch (err) {
      console.error("Failed to delete from database:", err);
    }

    // 3. Clear any existing timer
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);

    // 4. Start 10-second countdown in UI
    let countdown = 10;
    setUndoToast({
      questions: deletedQuestions,
      secondsLeft: countdown,
    });

    undoTimerRef.current = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(undoTimerRef.current);
        setUndoToast(null);
        fetchCounts();
      } else {
        setUndoToast((prev) => (prev ? { ...prev, secondsLeft: countdown } : null));
      }
    }, 1000);
  };

  // Undo delete clicked
  const handleUndoDelete = async () => {
    if (!undoToast?.questions || undoToast.questions.length === 0) return;

    if (undoTimerRef.current) clearInterval(undoTimerRef.current);
    const restored = undoToast.questions;
    setUndoToast(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      // Re-insert deleted rows
      await fetch(`${API_BASE_URL}/api/admin/questions/bulk-import-rpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questions: restored }),
      });

      setNotification({
        type: "success",
        message: `Restored ${restored.length} questions successfully!`,
      });
    } catch (err) {
      setNotification({ type: "error", message: "Failed to undo delete." });
    } finally {
      fetchQuestions();
      fetchCounts();
    }
  };

  // Execute Bulk Update (difficulty, section, or move)
  const handleExecuteBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      let updates = {};
      if (bulkActionType === "difficulty") {
        updates.difficulty = bulkDifficulty;
      } else if (bulkActionType === "section") {
        updates.section = bulkSection.trim() || null;
      } else if (bulkActionType === "move") {
        const [targetUni, targetCode] = targetMoveCourse.split("::");
        if (!targetUni || !targetCode) return;
        updates.university = targetUni;
        updates.course_code = targetCode;
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/questions/bulk-update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: selectedIds,
          updates,
        }),
      });

      if (res.ok) {
        setNotification({
          type: "success",
          message: `Successfully updated ${selectedIds.length} questions.`,
        });
        setBulkActionType(null);
        setSelectedIds([]);
        fetchQuestions();
        fetchCounts();
      } else {
        const err = await res.json();
        const conflictMsg =
          err.conflicts && err.conflicts.length > 0
            ? ` [Clashing IDs: ${err.conflicts.join(", ")}]`
            : "";
        setNotification({
          type: "error",
          message: (err.error || "Bulk update failed.") + conflictMsg,
        });
      }
    } catch (err) {
      setNotification({ type: "error", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Workspace Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Return to Course Catalog"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-black text-indigo-400">
                  {activeCourse.course_code}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                  {activeCourse.university}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-white mt-0.5">
                {activeCourse.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportWizardOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              Import Questions
            </button>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setIsDrawerOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>
        </div>

        {/* Live Type Breakdown Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
          <span className="px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
            Total: <strong className="text-white">{breakdown.total}</strong>
          </span>
          <span className="px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
            MCQ: <strong className="text-indigo-400">{breakdown.objective}</strong>
          </span>
          <span className="px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
            Theory: <strong className="text-amber-400">{breakdown.theory}</strong>
          </span>
          <span className="px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
            FIB: <strong className="text-emerald-400">{breakdown.fib}</strong>
          </span>
          <span className="px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
            Matching: <strong className="text-sky-400">{breakdown.matching}</strong>
          </span>
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

      {/* Workspace Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-2">
        {[
          { id: "all", label: "All Questions", count: breakdown.total },
          { id: "objective", label: "Objective (MCQ)", count: breakdown.objective },
          { id: "theory", label: "Theory", count: breakdown.theory },
          { id: "fib", label: "Fill-in-the-Blank", count: breakdown.fib },
          { id: "matching", label: "Matching", count: breakdown.matching },
          {
            id: "needs_review",
            label: "Needs Review",
            count: needsReviewCount,
            alert: needsReviewCount > 0,
          },
          {
            id: "duplicates",
            label: "Duplicates",
            count: duplicatePairsCount,
            alert: duplicatePairsCount > 0,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                tab.alert
                  ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                  : activeTab === tab.id
                  ? "bg-indigo-700 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter / Search within Workspace */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search questions in this course..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab !== "needs_review" && (
            <select
              value={difficultyFilter}
              onChange={(e) => {
                setDifficultyFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          )}

          {availableSections.length > 0 && activeTab !== "needs_review" && (
            <select
              value={sectionFilter}
              onChange={(e) => {
                setSectionFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[160px] truncate"
            >
              <option value="">All Sections</option>
              {availableSections.map((sec, i) => (
                <option key={i} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Floating Multi-Select Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-40 bg-indigo-950/95 border border-indigo-700/70 shadow-2xl rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white">
              {selectedIds.length} question{selectedIds.length > 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Update Difficulty */}
            <button
              onClick={() => setBulkActionType("difficulty")}
              className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Set Difficulty
            </button>

            {/* Update Section */}
            <button
              onClick={() => setBulkActionType("section")}
              className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Set Section
            </button>

            {/* Move to another Course */}
            <button
              onClick={() => setBulkActionType("move")}
              className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-indigo-500/40 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <MoveRight className="w-3.5 h-3.5" /> Move Course
            </button>

            {/* Bulk Delete */}
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating 10-Second Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-amber-500/50 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Deleted {undoToast.questions.length} questions</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Available to restore for {undoToast.secondsLeft} seconds...
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndoDelete}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Undo ({undoToast.secondsLeft}s)
            </button>
            <button
              onClick={() => setUndoToast(null)}
              className="p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Sub-Modal */}
      {bulkActionType && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {bulkActionType === "difficulty" && "Bulk Set Difficulty"}
                {bulkActionType === "section" && "Bulk Set Curriculum Section"}
                {bulkActionType === "move" && "Move Questions to Another Course"}
              </h3>
              <button
                onClick={() => setBulkActionType(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <p className="text-slate-400">
                Applying to <span className="font-bold text-white">{selectedIds.length}</span> selected questions.
              </p>

              {bulkActionType === "difficulty" && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Difficulty</label>
                  <select
                    value={bulkDifficulty}
                    onChange={(e) => setBulkDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              )}

              {bulkActionType === "section" && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Section / Topic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Chapter 3: Networking"
                    value={bulkSection}
                    onChange={(e) => setBulkSection(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              )}

              {bulkActionType === "move" && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Target Course (Keyed by University + Course Code)
                  </label>
                  <select
                    value={targetMoveCourse}
                    onChange={(e) => setTargetMoveCourse(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="">Select Target Course...</option>
                    {allCourses.map((c) => {
                      const val = `${c.university}::${c.course_code}`;
                      return (
                        <option key={val} value={val}>
                          {c.university} — {c.course_code} ({c.title})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-end gap-2">
              <button
                onClick={() => setBulkActionType(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkUpdate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicates Tab View OR Main Questions Table */}
      {activeTab === "duplicates" ? (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-6 text-xs">
              <div className="flex items-center gap-3">
                <label className="text-slate-400 font-semibold">
                  Similarity Threshold: <strong className="text-indigo-400 font-mono text-sm">{Math.round(duplicateThreshold * 100)}%</strong>
                </label>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.05"
                  value={duplicateThreshold}
                  onChange={(e) => setDuplicateThreshold(parseFloat(e.target.value))}
                  className="w-40 accent-indigo-500 cursor-pointer"
                />
              </div>

              <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeOtherTypes}
                  onChange={(e) => setIncludeOtherTypes(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Include other types</span>
              </label>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Found <strong className="text-amber-400">{duplicatePairs.length}</strong> candidate pair{duplicatePairs.length !== 1 ? "s" : ""}
            </div>
          </div>

          {loadingDuplicates ? (
            <div className="py-20 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Scanning table using trigram similarity index...
            </div>
          ) : duplicatePairs.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="font-bold text-slate-300">No duplicate questions found!</p>
              <p className="text-[11px] text-slate-500">
                All question stems in this course are distinct at the {Math.round(duplicateThreshold * 100)}% threshold.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {duplicatePairs.map((pair, idx) => {
                const simPct = Math.round((pair.similarity_score || 0) * 100);
                return (
                  <div
                    key={`${pair.question_id_a}_${pair.question_id_b}_${idx}`}
                    className={`p-4 rounded-2xl border transition space-y-3 ${
                      pair.is_conflict
                        ? "bg-rose-950/20 border-rose-500/40"
                        : "bg-slate-900 border-slate-800"
                    }`}
                  >
                    {/* Header Badges & Dismiss Action */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {simPct}% Similarity
                        </span>
                        {pair.is_exact && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Exact Match
                          </span>
                        )}
                        {pair.is_conflict && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                            <AlertTriangle className="w-4 h-4 text-rose-400" /> High Priority Conflict: Answers Differ!
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDismissDuplicate(pair)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition"
                      >
                        Not a Duplicate
                      </button>
                    </div>

                    {/* Side-by-side comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                      {/* Left Question A */}
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-400 text-xs">{pair.question_id_a}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                            {pair.type_a}
                          </span>
                        </div>
                        <p className="text-white font-medium leading-relaxed">{pair.question_a}</p>
                        {pair.correct_a && (
                          <div className="text-[11px] text-emerald-400 font-mono pt-1 border-t border-slate-800/60">
                            Answer: <strong className="text-emerald-300">{pair.correct_a}</strong>
                          </div>
                        )}
                      </div>

                      {/* Right Question B */}
                      <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-indigo-400 text-xs">{pair.question_id_b}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                            {pair.type_b}
                          </span>
                        </div>
                        <p className="text-white font-medium leading-relaxed">{pair.question_b}</p>
                        {pair.correct_b && (
                          <div className="text-[11px] text-emerald-400 font-mono pt-1 border-t border-slate-800/60">
                            Answer: <strong className="text-emerald-300">{pair.correct_b}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Main Questions List Table */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading questions...
          </div>
        ) : questions.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 space-y-2">
            <p>No questions found in this view.</p>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setIsDrawerOpen(true);
              }}
              className="px-4 py-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold hover:bg-indigo-600 hover:text-white transition"
            >
              + Create First Question
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <th className="py-3 px-4 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="text-slate-400 hover:text-white"
                      title="Select all"
                    >
                      {selectedIds.length === questions.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 w-28">ID</th>
                  <th className="py-3 px-4 w-24">Type</th>
                  <th className="py-3 px-4">Question Prompt</th>
                  <th className="py-3 px-4 w-28">Difficulty</th>
                  <th className="py-3 px-4 w-32">Section</th>
                  {activeTab === "needs_review" && (
                    <th className="py-3 px-4 w-44">Validation Flags</th>
                  )}
                  <th className="py-3 px-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {questions.map((q) => {
                  const isSelected = selectedIds.includes(q.id);

                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-slate-800/40 transition group ${
                        isSelected ? "bg-indigo-950/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelectRow(q.id)}
                          className="text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400 text-xs tracking-wide">
                        {q.question_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                          {q.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-md">
                        <p className="text-white font-medium line-clamp-2 leading-relaxed">
                          {q.question}
                        </p>
                        {q.type === "objective" && q.correct && (
                          <span className="text-[11px] text-emerald-400 block mt-0.5 font-mono">
                            &bull; Ans: {q.correct}
                          </span>
                        )}
                        {q.type === "theory" && q.model_answer && (
                          <span className="text-[11px] text-amber-400 block mt-0.5 font-mono line-clamp-1">
                            &bull; Key: {q.model_answer}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${
                            q.difficulty === "easy"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : q.difficulty === "hard"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {q.difficulty || "medium"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] truncate max-w-[120px]">
                        {q.section || "—"}
                      </td>
                      {activeTab === "needs_review" && (
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(q.review_flags || []).map((flag, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              >
                                {flag.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingQuestion(q);
                              setIsDrawerOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit question"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(q)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Delete question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
            Showing <span className="font-bold text-white">{questions.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{" "}
            <span className="font-bold text-white">{Math.min(page * limit, totalQuestions)}</span> of{" "}
            <span className="font-bold text-white">{totalQuestions.toLocaleString()}</span> questions
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
      )}

      {/* Slide-in Question Drawer */}
      <QuestionDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestion}
        question={editingQuestion}
        activeCourse={activeCourse}
        existingQuestions={questions}
      />

      {/* Bulk Import Questions Wizard */}
      <BulkImportWizard
        isOpen={isImportWizardOpen}
        onClose={() => setIsImportWizardOpen(false)}
        activeCourse={activeCourse}
        existingQuestions={questions}
        onImportComplete={() => {
          fetchQuestions();
          fetchCounts();
        }}
      />
    </div>
  );
}
