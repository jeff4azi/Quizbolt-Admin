import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { deriveNextQuestionId, validateQuestion } from "../../lib/questionValidators";
import { supabase } from "../../lib/supabaseClient";

export default function QuestionDrawer({
  isOpen,
  onClose,
  onSave,
  question = null, // null for create, object for edit
  activeCourse = null, // { course_code, university, title }
  existingQuestions = [],
}) {
  const isEditing = Boolean(question?.id);

  const [type, setType] = useState("objective");
  const [stem, setStem] = useState("");
  const [questionId, setQuestionId] = useState("");
  const [showAdvancedId, setShowAdvancedId] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [section, setSection] = useState("");
  const [reason, setReason] = useState("");
  const [courseQuestionIds, setCourseQuestionIds] = useState([]);

  // Objective state
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState("");

  // Theory state
  const [modelAnswer, setModelAnswer] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState("");

  // FIB state
  const [fibAnswers, setFibAnswers] = useState([""]);

  // Matching state
  const [matchPrompt, setMatchPrompt] = useState("");
  const [matchingPairs, setMatchingPairs] = useState([
    { key: "", value: "" },
    { key: "", value: "" },
  ]);

  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all existing IDs for active course to ensure accurate ID generation
  useEffect(() => {
    if (!isOpen || !activeCourse?.course_code || !activeCourse?.university) return;
    async function loadAllCourseIds() {
      try {
        const { data } = await supabase
          .from("questions")
          .select("question_id")
          .eq("university", activeCourse.university)
          .eq("course_code", activeCourse.course_code);
        if (data && data.length > 0) {
          const ids = data.map((d) => d.question_id).filter(Boolean);
          setCourseQuestionIds(ids);
          if (!isEditing && !showAdvancedId) {
            const nextId = deriveNextQuestionId(
              ids,
              activeCourse.course_code,
              type
            );
            setQuestionId(nextId);
          }
        }
      } catch (err) {
        console.error("Failed to load course question IDs:", err);
      }
    }
    loadAllCourseIds();
  }, [isOpen, activeCourse?.university, activeCourse?.course_code]);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    if (question) {
      setType(question.type || "objective");
      setStem(question.question || "");
      setQuestionId(question.question_id || "");
      setDifficulty(question.difficulty || "medium");
      setSection(question.section || "");
      setReason(question.reason || "");

      // Objective
      if (Array.isArray(question.options)) {
        setOptions(question.options);
      } else {
        setOptions(["", "", "", ""]);
      }
      setCorrect(question.correct || "");

      // Theory
      setModelAnswer(question.model_answer || "");
      setKeywords(Array.isArray(question.keywords) ? question.keywords : []);

      // FIB
      if (question.type === "fib" && Array.isArray(question.answers)) {
        setFibAnswers(question.answers);
      } else {
        setFibAnswers([""]);
      }

      // Matching
      setMatchPrompt(question.match_prompt || "");
      if (question.type === "matching" && Array.isArray(question.answers)) {
        setMatchingPairs(
          question.answers.map((item) =>
            typeof item === "object" ? item : { key: item, value: "" }
          )
        );
      } else {
        setMatchingPairs([
          { key: "", value: "" },
          { key: "", value: "" },
        ]);
      }
    } else {
      // Create mode
      const defaultType = "objective";
      setType(defaultType);
      setStem("");
      setDifficulty("medium");
      setSection("");
      setReason("");
      setOptions(["", "", "", ""]);
      setCorrect("");
      setModelAnswer("");
      setKeywords([]);
      setFibAnswers([""]);
      setMatchPrompt("");
      setMatchingPairs([
        { key: "", value: "" },
        { key: "", value: "" },
      ]);

      // Derive auto ID
      const allIds = courseQuestionIds.length > 0 ? courseQuestionIds : existingQuestions.map((q) => q.question_id);
      const nextId = deriveNextQuestionId(
        allIds,
        activeCourse?.course_code || "",
        defaultType
      );
      setQuestionId(nextId);
    }

    setValidationErrors([]);
  }, [isOpen, question, activeCourse]);

  // Recalculate auto ID when type changes in create mode
  const handleTypeChange = (newType) => {
    setType(newType);
    if (!isEditing && !showAdvancedId) {
      const allIds = courseQuestionIds.length > 0 ? courseQuestionIds : existingQuestions.map((q) => q.question_id);
      const nextId = deriveNextQuestionId(
        allIds,
        activeCourse?.course_code || "",
        newType
      );
      setQuestionId(nextId);
    }
  };

  // Option handlers for MCQ
  const handleOptionChange = (idx, value) => {
    const updated = [...options];
    const prevVal = updated[idx];
    updated[idx] = value;
    setOptions(updated);
    if (correct === prevVal && prevVal !== "") {
      setCorrect(value);
    }
  };

  const addOption = () => {
    if (options.length < 8) setOptions([...options, ""]);
  };

  const removeOption = (idx) => {
    if (options.length <= 2) return;
    const removedVal = options[idx];
    const updated = options.filter((_, i) => i !== idx);
    setOptions(updated);
    if (correct === removedVal) {
      setCorrect("");
    }
  };

  // Keywords handlers for Theory
  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  // FIB answer handlers
  const handleFibChange = (idx, value) => {
    const updated = [...fibAnswers];
    updated[idx] = value;
    setFibAnswers(updated);
  };

  const addFibAnswer = () => {
    setFibAnswers([...fibAnswers, ""]);
  };

  const removeFibAnswer = (idx) => {
    if (fibAnswers.length <= 1) return;
    setFibAnswers(fibAnswers.filter((_, i) => i !== idx));
  };

  // Matching pair handlers
  const handleMatchingChange = (idx, field, value) => {
    const updated = [...matchingPairs];
    updated[idx] = { ...updated[idx], [field]: value };
    setMatchingPairs(updated);
  };

  const addMatchingPair = () => {
    setMatchingPairs([...matchingPairs, { key: "", value: "" }]);
  };

  const removeMatchingPair = (idx) => {
    if (matchingPairs.length <= 2) return;
    setMatchingPairs(matchingPairs.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationErrors([]);

    const payload = {
      question_id: questionId.trim(),
      course_code: (activeCourse?.course_code || "").trim().toUpperCase(),
      university: (activeCourse?.university || "").trim().toUpperCase(),
      type,
      question: stem.trim(),
      reason: reason.trim() || null,
      difficulty,
      section: section.trim() || null,
      options: null,
      correct: null,
      model_answer: null,
      keywords: null,
      answers: null,
      match_prompt: null,
    };

    if (type === "objective") {
      const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
      payload.options = cleanOptions;
      payload.correct = correct.trim() || null;
    } else if (type === "theory") {
      payload.model_answer = modelAnswer.trim() || null;
      payload.keywords = keywords.length > 0 ? keywords : null;
    } else if (type === "fib") {
      const cleanFib = fibAnswers.map((a) => a.trim()).filter(Boolean);
      payload.answers = cleanFib;
    } else if (type === "matching") {
      payload.match_prompt = matchPrompt.trim() || null;
      payload.answers = matchingPairs.filter((p) => p.key.trim() && p.value.trim());
    }

    const { isValid, errors } = validateQuestion(payload);
    if (!isValid) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(payload, question?.id);
      onClose();
    } catch (err) {
      setValidationErrors([err.message || "Failed to save question."]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-[#0F1420] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {isEditing ? "Edit Question" : "Create New Question"}
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                {activeCourse?.course_code}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {activeCourse?.university} — {activeCourse?.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {validationErrors.length > 0 && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Please fix the following errors:
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-2">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
              Question Format
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: "objective", label: "MCQ / Objective" },
                { id: "theory", label: "Theory" },
                { id: "fib", label: "Fill-in-Blank" },
                { id: "matching", label: "Matching" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border text-center transition ${
                    type === t.id
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question ID + Advanced Toggle */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold text-[11px]">Question Identifier</span>
              <button
                type="button"
                onClick={() => setShowAdvancedId(!showAdvancedId)}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
              >
                {showAdvancedId ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showAdvancedId ? "Hide Override" : "Override Auto ID"}
              </button>
            </div>
            {showAdvancedId ? (
              <input
                type="text"
                required
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value.toUpperCase())}
                placeholder={
                  type === "theory"
                    ? "e.g. ACC111-T001"
                    : type === "fib"
                    ? "e.g. CSC113-F001"
                    : type === "matching"
                    ? "e.g. CSC113-M001"
                    : "e.g. CSC115-001"
                }
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-indigo-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                  {questionId || "AUTO-GENERATING..."}
                </span>
                <span className="text-[10px] text-slate-500 italic">
                  (Auto-derived from highest ID in course)
                </span>
              </div>
            )}
          </div>

          {/* Stem / Question Text */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
              Question Stem <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              placeholder="Enter the complete question prompt..."
              className="w-full p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed text-xs"
            />
          </div>

          {/* Type-Specific Editors */}
          {type === "objective" && (
            <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                  Options & Correct Answer
                </label>
                <span className="text-[10px] text-slate-500">
                  Select the radio button next to the correct answer
                </span>
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="correct-option"
                      checked={correct === opt && opt.trim() !== ""}
                      onChange={() => setCorrect(opt)}
                      disabled={!opt.trim()}
                      className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-slate-400 text-xs w-4">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      className={`flex-1 px-3 py-2 bg-slate-900 border rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                        correct === opt && opt.trim() !== ""
                          ? "border-emerald-500/60 bg-emerald-950/20"
                          : "border-slate-800"
                      }`}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 8 && (
                <button
                  type="button"
                  onClick={addOption}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition mt-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Option
                </button>
              )}
            </div>
          )}

          {type === "theory" && (
            <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] tracking-wider mb-1.5">
                  Model Answer / Marking Guide
                </label>
                <textarea
                  rows={4}
                  value={modelAnswer}
                  onChange={(e) => setModelAnswer(e.target.value)}
                  placeholder="Provide standard model response or evaluation criteria..."
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] tracking-wider mb-1.5">
                  Grading Keywords / Key Concepts
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                    placeholder="Type keyword and press Enter or Add..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold"
                  >
                    Add
                  </button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 rounded-lg flex items-center gap-1.5 text-xs font-mono"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => removeKeyword(kw)}
                          className="hover:text-rose-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {type === "fib" && (
            <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                  Accepted Answers
                </label>
                <span className="text-[10px] text-slate-500">
                  Multiple variations acceptable (case-insensitive in testing)
                </span>
              </div>

              <div className="space-y-2">
                {fibAnswers.map((ans, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 text-xs w-4">#{idx + 1}</span>
                    <input
                      type="text"
                      required
                      value={ans}
                      onChange={(e) => handleFibChange(idx, e.target.value)}
                      placeholder={`Accepted answer ${idx + 1}`}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    {fibAnswers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFibAnswer(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addFibAnswer}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition mt-2"
              >
                <Plus className="w-3.5 h-3.5" /> Add Accepted Variation
              </button>
            </div>
          )}

          {type === "matching" && (
            <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
              <div>
                <label className="block text-slate-300 font-bold uppercase text-[10px] tracking-wider mb-1.5">
                  Matching Prompt / Instructions
                </label>
                <input
                  type="text"
                  value={matchPrompt}
                  onChange={(e) => setMatchPrompt(e.target.value)}
                  placeholder="e.g. Match each protocol with its default port number"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                    Item Pairs (Premise &rarr; Target)
                  </label>
                  <span className="text-[10px] text-slate-500">At least 2 pairs</span>
                </div>

                <div className="space-y-2">
                  {matchingPairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Item / Prompt (e.g. HTTP)"
                        value={pair.key}
                        onChange={(e) => handleMatchingChange(idx, "key", e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <span className="text-slate-500 font-bold">&rarr;</span>
                      <input
                        type="text"
                        required
                        placeholder="Match (e.g. 80)"
                        value={pair.value}
                        onChange={(e) => handleMatchingChange(idx, "value", e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {matchingPairs.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeMatchingPair(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addMatchingPair}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition mt-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Pair
                </button>
              </div>
            </div>
          )}

          {/* Explanation / Reason */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
              Explanation / Detailed Solution
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this answer correct? Explanations appear for students during review."
              className="w-full p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed text-xs"
            />
          </div>

          {/* Metadata: Difficulty & Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 capitalize"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                Curriculum Section / Topic
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. Chapter 1, Data Structures"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Question
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
