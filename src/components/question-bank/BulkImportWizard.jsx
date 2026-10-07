import React, { useState } from "react";
import {
  X,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Sparkles,
  Layers,
  Info,
} from "lucide-react";
import { API_BASE_URL } from "../../config/apiConfig";
import { supabase } from "../../lib/supabaseClient";
import { parseJson, parseCsv, parsePlainText } from "../../lib/questionParsers";
import { validateQuestion, detectDuplicates, deriveNextQuestionId } from "../../lib/questionValidators";

export default function BulkImportWizard({
  isOpen,
  onClose,
  activeCourse = null, // { course_code, university, title }
  existingQuestions = [],
  onImportComplete,
}) {
  const [step, setStep] = useState(1); // 1: Defaults, 2: Input, 3: Preview/Execute, 4: Result

  // Step 1: Defaults
  const [defaults, setDefaults] = useState({
    course_code: activeCourse?.course_code || "",
    university: activeCourse?.university || "",
    type: "objective",
    difficulty: "medium",
    section: "",
  });

  // Step 2: Input
  const [format, setFormat] = useState("csv"); // 'csv', 'json', 'plaintext'
  const [rawText, setRawText] = useState("");
  const [parseError, setParseError] = useState("");

  // Step 3: Parsed & Validated List
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [validationSummary, setValidationSummary] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    duplicates: 0,
  });

  // Step 4: Submission & Result
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { inserted_count, skipped_count, batch_id }
  const [isUndoing, setIsUndoing] = useState(false);
  const [undoSuccess, setUndoSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === "string") {
        setRawText(content);
        if (file.name.endsWith(".json")) setFormat("json");
        else if (file.name.endsWith(".txt")) setFormat("plaintext");
        else setFormat("csv");
      }
    };
    reader.readAsText(file);
  };

  const handleParseAndValidate = () => {
    setParseError("");
    if (!rawText.trim()) {
      setParseError("Please paste or upload question data.");
      return;
    }

    let parseRes;
    const defs = {
      ...defaults,
      course_code: activeCourse?.course_code || defaults.course_code,
      university: activeCourse?.university || defaults.university,
    };

    if (format === "json") {
      parseRes = parseJson(rawText, defs);
    } else if (format === "plaintext") {
      parseRes = parsePlainText(rawText, defs);
    } else {
      parseRes = parseCsv(rawText, defs);
    }

    if (!parseRes.success) {
      setParseError(parseRes.error);
      return;
    }

    // Assign IDs to questions lacking question_id
    const existingIds = existingQuestions.map((q) => q.question_id);
    let assignedList = [];
    let currentExisting = [...existingIds];

    parseRes.questions.forEach((q) => {
      if (!q.question_id) {
        const nextId = deriveNextQuestionId(
          currentExisting,
          activeCourse?.course_code || defaults.course_code,
          q.type
        );
        currentExisting.push(nextId);
        assignedList.push({ ...q, question_id: nextId });
      } else {
        currentExisting.push(q.question_id);
        assignedList.push(q);
      }
    });

    // Detect duplicates
    const duplicateChecked = detectDuplicates(assignedList, existingQuestions);

    // Validate each question
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    const validatedList = duplicateChecked.map((q) => {
      const { isValid, errors, warnings, flags } = validateQuestion(q);
      if (q._isDuplicate) duplicateCount++;
      if (isValid) validCount++;
      else invalidCount++;
      return {
        ...q,
        _isValid: isValid,
        _errors: errors,
        _warnings: warnings,
        _flags: flags,
      };
    });

    setPreviewQuestions(validatedList);
    setValidationSummary({
      total: validatedList.length,
      valid: validCount,
      invalid: invalidCount,
      duplicates: duplicateCount,
    });
    setStep(3);
  };

  const handleExecuteImport = async () => {
    setIsSubmitting(true);
    setParseError("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      // Filter only questions with valid stems & options
      const payloadQuestions = previewQuestions
        .filter((q) => !q._isDuplicate)
        .map(({ _isValid, _errors, _warnings, _flags, _isDuplicate, _duplicateReason, ...rest }) => rest);

      const res = await fetch(`${API_BASE_URL}/api/admin/questions/bulk-import-rpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questions: payloadQuestions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Bulk import failed.");
      }

      setImportResult(data);
      setStep(4);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      setParseError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoImport = async () => {
    if (!importResult?.batch_id) return;
    setIsUndoing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/questions/batch/${importResult.batch_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revert import.");

      setUndoSuccess(true);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      setParseError(err.message);
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" /> Bulk Import Questions
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                {activeCourse?.course_code}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Target Course: {activeCourse?.university} — {activeCourse?.title}
            </p>
          </div>

          {/* Stepper pills */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
            <span
              className={`px-2.5 py-1 rounded-lg ${
                step === 1 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              1. Defaults
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg ${
                step === 2 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              2. Data Input
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg ${
                step === 3 ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400"
              }`}
            >
              3. Validation
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4">
          {parseError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* STEP 1: Defaults */}
          {step === 1 && (
            <div className="space-y-4 text-xs max-w-xl mx-auto py-2">
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  Defaults are automatically applied to imported rows whenever the source data
                  does not explicitly specify the field.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Course Code</label>
                  <input
                    type="text"
                    disabled
                    value={activeCourse?.course_code || defaults.course_code}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-indigo-400 font-mono font-bold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">University</label>
                  <input
                    type="text"
                    disabled
                    value={activeCourse?.university || defaults.university}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-semibold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Default Type</label>
                  <select
                    value={defaults.type}
                    onChange={(e) => setDefaults({ ...defaults, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="objective">Objective (MCQ)</option>
                    <option value="theory">Theory</option>
                    <option value="fib">Fill-in-Blank</option>
                    <option value="matching">Matching</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Default Difficulty</label>
                  <select
                    value={defaults.difficulty}
                    onChange={(e) => setDefaults({ ...defaults, difficulty: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Default Section</label>
                  <input
                    type="text"
                    placeholder="e.g. Module 1"
                    value={defaults.section}
                    onChange={(e) => setDefaults({ ...defaults, section: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Input */}
          {step === 2 && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {[
                    { id: "csv", label: "CSV" },
                    { id: "json", label: "JSON" },
                    { id: "plaintext", label: "Plain Text / Test Bank" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormat(f.id)}
                      className={`px-3 py-1.5 rounded-xl font-semibold border transition ${
                        format === f.id
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <label className="cursor-pointer text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold">
                  <Upload className="w-3.5 h-3.5" /> Upload File (.csv, .json, .txt)
                  <input
                    type="file"
                    accept=".csv,.json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <textarea
                rows={11}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={
                  format === "csv"
                    ? "type,question,options,correct,reason,difficulty,section\nobjective,\"What is HTML?\",Markup language|Programming language|Hardware,Markup language,\"HTML stands for HyperText Markup Language\",easy,Web"
                    : format === "plaintext"
                    ? "1. What is HTML?\nA) Markup language\nB) Programming language\nC) Database\nAnswer: A\nExplanation: HyperText Markup Language"
                    : '[\n  {\n    "type": "objective",\n    "question": "What is HTML?",\n    "options": ["Markup language", "Programming language"],\n    "correct": "Markup language"\n  }\n]'
                }
                className="w-full p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* STEP 3: Validation & Preview */}
          {step === 3 && (
            <div className="space-y-4 text-xs">
              {/* Stat summary cards */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase">Total Questions</span>
                  <span className="text-lg font-black text-white">{validationSummary.total}</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-emerald-500/20">
                  <span className="text-emerald-400 block text-[10px] font-semibold uppercase">Valid Ready</span>
                  <span className="text-lg font-black text-emerald-400">{validationSummary.valid}</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-rose-500/20">
                  <span className="text-rose-400 block text-[10px] font-semibold uppercase">Issues / Errors</span>
                  <span className="text-lg font-black text-rose-400">{validationSummary.invalid}</span>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-amber-500/20">
                  <span className="text-amber-400 block text-[10px] font-semibold uppercase">Duplicates (Skipped)</span>
                  <span className="text-lg font-black text-amber-400">{validationSummary.duplicates}</span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-800/60 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="p-2.5">QID</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Question Stem</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {previewQuestions.map((q, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-800/30 ${
                          q._isDuplicate
                            ? "bg-amber-950/20"
                            : !q._isValid
                            ? "bg-rose-950/20"
                            : ""
                        }`}
                      >
                        <td className="p-2.5 font-mono font-bold text-indigo-400 text-[11px]">
                          {q.question_id}
                        </td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                            {q.type}
                          </span>
                        </td>
                        <td className="p-2.5 max-w-md truncate text-slate-200">
                          {q.question}
                        </td>
                        <td className="p-2.5 text-[11px]">
                          {q._isDuplicate ? (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Duplicate (Will Skip)
                            </span>
                          ) : !q._isValid ? (
                            <span className="text-rose-400 font-semibold" title={q._errors.join(", ")}>
                              Error: {q._errors[0]}
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Ready
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Result & Undo */}
          {step === 4 && (
            <div className="text-center py-8 space-y-4">
              {undoSuccess ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center mx-auto border border-slate-700">
                    <RotateCcw className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Import Reverted Successfully</h3>
                  <p className="text-xs text-slate-400">
                    All questions created during this session batch have been removed.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Import Finished!</h3>
                  <div className="flex justify-center gap-6 font-mono text-xs">
                    <div>
                      <span className="text-slate-400 block">Inserted</span>
                      <span className="text-xl font-black text-emerald-400">
                        {importResult?.inserted_count || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Skipped (Existing)</span>
                      <span className="text-xl font-black text-amber-400">
                        {importResult?.skipped_count || 0}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-center gap-3">
                    <button
                      disabled={isUndoing}
                      onClick={handleUndoImport}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      {isUndoing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reverting...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" /> Undo Import
                        </>
                      )}
                    </button>
                    <button
                      onClick={onClose}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
                    >
                      Done & View Questions
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between shrink-0">
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
            )}

            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition"
              >
                Next: Data Input <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 2 && (
              <button
                onClick={handleParseAndValidate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition"
              >
                Parse & Validate <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                disabled={isSubmitting || validationSummary.valid === 0}
                onClick={handleExecuteImport}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Import {validationSummary.valid} Questions
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
