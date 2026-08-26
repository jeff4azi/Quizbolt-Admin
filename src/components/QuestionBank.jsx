import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Upload,
  Trash2,
  Edit,
  Filter,
  Check,
  X,
  BookOpen,
  HelpCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function QuestionBank({ initialCourseCode = "" }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [university, setUniversity] = useState("");
  const [courseCode, setCourseCode] = useState(initialCourseCode);
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");

  // Statistics
  const [stats, setStats] = useState({
    total: 13891,
    objective: 12556,
    theory: 203,
    fib: 1132,
  });

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [bulkJsonText, setBulkJsonText] = useState("");
  const [actionMessage, setActionMessage] = useState(null);

  // Form State for Add/Edit
  const [formData, setFormData] = useState({
    question_id: "",
    course_code: initialCourseCode || "",
    university: "BOUESTI",
    type: "objective",
    question: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    correct: "",
    reason: "",
    difficulty: "Medium",
    section: "",
    keywordsStr: "",
    model_answer: "",
    answersStr: "",
  });

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("questions")
        .select("*", { count: "exact" });

      if (university) query = query.ilike("university", university.trim());
      if (courseCode) query = query.ilike("course_code", courseCode.trim());
      if (type) query = query.eq("type", type.trim());
      if (difficulty) query = query.ilike("difficulty", difficulty.trim());
      if (search) {
        const s = `%${search.trim()}%`;
        query = query.or(`question.ilike.${s},question_id.ilike.${s}`);
      }

      const fromIndex = (page - 1) * limit;
      const toIndex = fromIndex + limit - 1;

      query = query
        .order("course_code", { ascending: true })
        .order("order_index", { ascending: true })
        .range(fromIndex, toIndex);

      const { data, count, error } = await query;
      if (error) throw error;

      setQuestions(data || []);
      setTotal(count || 0);
      setTotalPages(Math.ceil((count || 0) / limit) || 1);
    } catch (err) {
      console.error("Error fetching questions:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: totalC } = await supabase.from("questions").select("*", { count: "exact", head: true });
      const { count: objC } = await supabase.from("questions").select("*", { count: "exact", head: true }).eq("type", "objective");
      const { count: thC } = await supabase.from("questions").select("*", { count: "exact", head: true }).eq("type", "theory");
      const { count: fibC } = await supabase.from("questions").select("*", { count: "exact", head: true }).eq("type", "fib");

      setStats({
        total: totalC || 0,
        objective: objC || 0,
        theory: thC || 0,
        fib: fibC || 0,
      });
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [page, university, courseCode, type, difficulty]);

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const openAddModal = () => {
    setEditingQuestion(null);
    setFormData({
      question_id: "",
      course_code: courseCode || "",
      university: "BOUESTI",
      type: "objective",
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correct: "",
      reason: "",
      difficulty: "Medium",
      section: "",
      keywordsStr: "",
      model_answer: "",
      answersStr: "",
    });
    setIsEditModalOpen(true);
  };

  const openEditModal = (q) => {
    setEditingQuestion(q);
    setFormData({
      question_id: q.question_id || "",
      course_code: q.course_code || "",
      university: q.university || "BOUESTI",
      type: q.type || "objective",
      question: q.question || "",
      optionA: q.options && q.options[0] ? q.options[0] : "",
      optionB: q.options && q.options[1] ? q.options[1] : "",
      optionC: q.options && q.options[2] ? q.options[2] : "",
      optionD: q.options && q.options[3] ? q.options[3] : "",
      correct: q.correct || "",
      reason: q.reason || "",
      difficulty: q.difficulty || "Medium",
      section: q.section || "",
      keywordsStr: q.keywords ? JSON.stringify(q.keywords) : "",
      model_answer: q.model_answer || "",
      answersStr: q.answers ? JSON.stringify(q.answers) : "",
    });
    setIsEditModalOpen(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const options =
        formData.type === "objective"
          ? [formData.optionA, formData.optionB, formData.optionC, formData.optionD].filter(Boolean)
          : null;

      let keywords = null;
      if (formData.type === "theory" && formData.keywordsStr) {
        try { keywords = JSON.parse(formData.keywordsStr); } catch (e) {}
      }

      let answers = null;
      if (formData.type === "fib" && formData.answersStr) {
        try { answers = JSON.parse(formData.answersStr); } catch (e) {}
      }

      const payload = {
        question_id: formData.question_id,
        course_code: formData.course_code,
        university: formData.university,
        type: formData.type,
        question: formData.question,
        options,
        correct: formData.type === "objective" ? formData.correct : null,
        reason: formData.reason,
        difficulty: formData.difficulty,
        section: formData.section,
        keywords,
        model_answer: formData.model_answer,
        answers,
      };

      let res;
      if (editingQuestion) {
        res = await fetch(`${API_BASE_URL}/api/admin/questions/${editingQuestion.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE_URL}/api/admin/questions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) throw new Error("Failed to save question");

      setIsEditModalOpen(false);
      setActionMessage({ type: "success", text: `Question ${editingQuestion ? "updated" : "created"} successfully!` });
      setTimeout(() => setActionMessage(null), 4000);
      fetchQuestions();
      fetchStats();
    } catch (err) {
      alert(`Error saving question: ${err.message}`);
    }
  };

  const handleDeleteQuestion = async (id, questionId) => {
    if (!window.confirm(`Are you sure you want to delete question ${questionId}?`)) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/questions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete question");

      setActionMessage({ type: "success", text: `Question ${questionId} deleted successfully.` });
      setTimeout(() => setActionMessage(null), 4000);
      fetchQuestions();
      fetchStats();
    } catch (err) {
      alert(`Error deleting question: ${err.message}`);
    }
  };

  const handleBulkImport = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const parsed = JSON.parse(bulkJsonText);
      const questionsArray = Array.isArray(parsed) ? parsed : [parsed];

      const res = await fetch(`${API_BASE_URL}/api/admin/questions/bulk-import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questions: questionsArray }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Bulk import failed");

      setIsBulkModalOpen(false);
      setBulkJsonText("");
      setActionMessage({ type: "success", text: `Imported ${data.importedCount} questions successfully!` });
      setTimeout(() => setActionMessage(null), 4000);
      fetchQuestions();
      fetchStats();
    } catch (err) {
      alert(`Invalid JSON or Import Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Question Bank Repository
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Manage 13,800+ objective, theory, and fill-in-blank questions stored in Supabase Postgres DB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Upload className="w-4 h-4 text-slate-400" />
            Bulk Import (JSON)
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Questions</div>
            <div className="text-xl font-black text-white">{stats.total.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Objective (MCQ)</div>
            <div className="text-xl font-black text-white">{stats.objective.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Theory</div>
            <div className="text-xl font-black text-white">{stats.theory.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fill-in-Blank</div>
            <div className="text-xl font-black text-white">{stats.fib.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search question prompt or Question ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filter:</span>

          <select
            value={university}
            onChange={(e) => { setUniversity(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Universities</option>
            <option value="BOUESTI">BOUESTI</option>
            <option value="LASU">LASU</option>
            <option value="TASUED">TASUED</option>
          </select>

          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            <option value="objective">Objective (MCQ)</option>
            <option value="theory">Theory</option>
            <option value="fib">Fill in Blank</option>
          </select>

          <select
            value={difficulty}
            onChange={(e) => { setDifficulty(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <input
            type="text"
            placeholder="Course (e.g. CSC115)..."
            value={courseCode}
            onChange={(e) => { setCourseCode(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
          />

          {(university || type || difficulty || courseCode || search) && (
            <button
              onClick={() => {
                setUniversity(""); setType(""); setDifficulty(""); setCourseCode(""); setSearch(""); setPage(1);
              }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Questions Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            Querying Supabase database...
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <p className="font-semibold text-slate-300">No questions found</p>
            <p className="text-[11px]">Try clearing search parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Code / ID</th>
                  <th className="py-3 px-4">Uni</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 w-2/5">Question Text</th>
                  <th className="py-3 px-4">Answer / Explanation</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-indigo-400">{q.course_code}</div>
                      <div className="text-[11px] text-slate-500">{q.question_id}</div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-300">{q.university}</td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        q.type === "objective"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : q.type === "theory"
                          ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {q.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-200">
                      <div className="line-clamp-2 font-medium">{q.question}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {q.type === "objective" && (
                        <div className="line-clamp-2"><span className="text-emerald-400 font-bold">Ans:</span> {q.correct}</div>
                      )}
                      {q.type === "theory" && (
                        <div className="line-clamp-2"><span className="text-purple-400 font-bold">Ans:</span> {q.model_answer || "Keywords set"}</div>
                      )}
                      {q.type === "fib" && (
                        <div className="line-clamp-2"><span className="text-emerald-400 font-bold">Ans:</span> {q.answers ? JSON.stringify(q.answers) : "-"}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(q)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                          title="Edit Question"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id, q.question_id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
            Showing <span className="font-bold text-white">{questions.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{" "}
            <span className="font-bold text-white">{Math.min(page * limit, total)}</span> of{" "}
            <span className="font-bold text-white">{total.toLocaleString()}</span> questions
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="font-semibold text-slate-300 px-2">Page {page} of {totalPages}</span>
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

      {/* Edit Question Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">
                {editingQuestion ? `Edit Question (${formData.question_id})` : "Add Question"}
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Question ID</label>
                  <input
                    type="text"
                    required
                    placeholder="CSC115-001"
                    value={formData.question_id}
                    onChange={(e) => setFormData({ ...formData, question_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="CSC115"
                    value={formData.course_code}
                    onChange={(e) => setFormData({ ...formData, course_code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">University</label>
                  <select
                    value={formData.university}
                    onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="BOUESTI">BOUESTI</option>
                    <option value="LASU">LASU</option>
                    <option value="TASUED">TASUED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Question Text</label>
                <textarea
                  required
                  rows={3}
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {formData.type === "objective" && (
                <div className="space-y-2 p-3 bg-slate-800/60 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-300">MCQ Options</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Option A"
                      value={formData.optionA}
                      onChange={(e) => setFormData({ ...formData, optionA: e.target.value })}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                    <input
                      type="text"
                      placeholder="Option B"
                      value={formData.optionB}
                      onChange={(e) => setFormData({ ...formData, optionB: e.target.value })}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                    <input
                      type="text"
                      placeholder="Option C"
                      value={formData.optionC}
                      onChange={(e) => setFormData({ ...formData, optionC: e.target.value })}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                    <input
                      type="text"
                      placeholder="Option D"
                      value={formData.optionD}
                      onChange={(e) => setFormData({ ...formData, optionD: e.target.value })}
                      className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 mt-2">Correct Answer String</label>
                    <input
                      type="text"
                      placeholder="Exact option string..."
                      value={formData.correct}
                      onChange={(e) => setFormData({ ...formData, correct: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Explanation / Reason</label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                Bulk Question Import (JSON)
              </h2>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <textarea
              rows={10}
              placeholder='[{"question_id": "CSC115-999", "course_code": "CSC115", "university": "BOUESTI", "type": "objective", "question": "...", "options": ["A", "B", "C", "D"], "correct": "A"}]'
              value={bulkJsonText}
              onChange={(e) => setBulkJsonText(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!bulkJsonText.trim()}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl disabled:opacity-50"
              >
                Run Bulk Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
