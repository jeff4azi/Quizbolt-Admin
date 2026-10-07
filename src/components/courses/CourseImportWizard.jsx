import React, { useState } from "react";
import { X, Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "../../config/apiConfig";
import { supabase } from "../../lib/supabaseClient";

export default function CourseImportWizard({ isOpen, onClose, onSuccess, universities = [] }) {
  const [step, setStep] = useState(1); // 1: input, 2: preview
  const [rawText, setRawText] = useState("");
  const [format, setFormat] = useState("csv"); // 'csv' or 'json'
  const [defaultUniversity, setDefaultUniversity] = useState(universities[0]?.id || "");
  const [parsedCourses, setParsedCourses] = useState([]);
  const [parseError, setParseError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState(null);

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
        else setFormat("csv");
      }
    };
    reader.readAsText(file);
  };

  const handleParse = () => {
    setParseError("");
    if (!rawText.trim()) {
      setParseError("Please provide some CSV or JSON data.");
      return;
    }

    try {
      let results = [];
      if (format === "json") {
        const parsed = JSON.parse(rawText);
        const list = Array.isArray(parsed) ? parsed : parsed.courses || [];
        if (!Array.isArray(list) || list.length === 0) {
          throw new Error("JSON must contain an array of course objects.");
        }
        results = list.map((item) => ({
          course_code: (item.course_code || item.code || "").trim().toUpperCase(),
          name: (item.name || item.course_code || item.code || "").trim().toUpperCase(),
          title: (item.title || item.name || "").trim(),
          course_group: item.course_group || item.group || "general",
          colleges: Array.isArray(item.colleges) ? item.colleges : ["ALL"],
          level: parseInt(item.level, 10) || 100,
          semester: parseInt(item.semester, 10) || 1,
          university: (item.university || defaultUniversity || "").trim().toUpperCase(),
        }));
      } else {
        // Simple CSV parser
        const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          throw new Error("CSV requires a header line and at least one data row.");
        }
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
          const row = {};
          headers.forEach((h, idx) => {
            row[h] = cols[idx] !== undefined ? cols[idx] : "";
          });

          const code = (row.course_code || row.code || "").trim().toUpperCase();
          if (!code) continue;

          results.push({
            course_code: code,
            name: (row.name || code).trim().toUpperCase(),
            title: (row.title || row.course_title || code).trim(),
            course_group: row.course_group || row.group || "general",
            colleges: row.colleges ? row.colleges.split("|").map((c) => c.trim()) : ["ALL"],
            level: parseInt(row.level, 10) || 100,
            semester: parseInt(row.semester, 10) || 1,
            university: (row.university || defaultUniversity || "").trim().toUpperCase(),
          });
        }
      }

      if (results.length === 0) {
        throw new Error("No valid courses were extracted from the input.");
      }

      setParsedCourses(results);
      setStep(2);
    } catch (err) {
      setParseError(err.message);
    }
  };

  const handleExecuteImport = async () => {
    setIsSubmitting(true);
    setParseError("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/courses/bulk-import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courses: parsedCourses }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to bulk import courses.");
      }

      setImportResult(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      setParseError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full p-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-400" /> Bulk Import Courses
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload or paste CSV/JSON to upsert courses into the catalog.
            </p>
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
          {importResult ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">Import Complete!</h3>
              <p className="text-sm text-slate-300">
                Successfully upserted <span className="font-bold text-emerald-400">{importResult.imported_count}</span> courses.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition"
              >
                Close & Refresh Catalog
              </button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4 text-xs">
              {parseError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Fallback University</label>
                  <select
                    value={defaultUniversity}
                    onChange={(e) => setDefaultUniversity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select University</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.id}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">Used if row does not specify university.</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Data Format</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat("csv")}
                      className={`flex-1 py-2 rounded-xl font-semibold border transition ${
                        format === "csv"
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat("json")}
                      className={`flex-1 py-2 rounded-xl font-semibold border transition ${
                        format === "json"
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      JSON
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 font-semibold">Paste Course Data</label>
                  <label className="cursor-pointer text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold">
                    <Upload className="w-3.5 h-3.5" /> Upload File
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  rows={9}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={
                    format === "csv"
                      ? "course_code,title,course_group,level,semester,university\nCSC115,Intro to Computer Science,general,100,1,RUN\nMAT111,Algebra,departmental,100,1,RUN"
                      : '[\n  {\n    "course_code": "CSC115",\n    "title": "Intro to Computer Science",\n    "level": 100,\n    "semester": 1,\n    "university": "RUN"\n  }\n]'
                  }
                  className="w-full p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">
                  Reviewing <span className="font-bold text-white">{parsedCourses.length}</span> extracted courses
                </span>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Edit Raw Data
                </button>
              </div>

              {parseError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-800/60 sticky top-0 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">University</th>
                      <th className="p-2.5">Group</th>
                      <th className="p-2.5">Level/Sem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-mono text-[11px]">
                    {parsedCourses.map((c, i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold text-indigo-400">{c.course_code}</td>
                        <td className="p-2.5 font-sans text-slate-200">{c.title}</td>
                        <td className="p-2.5 text-slate-300">{c.university}</td>
                        <td className="p-2.5 text-slate-400 uppercase">{c.course_group}</td>
                        <td className="p-2.5 text-purple-300">{c.level}L / Sem {c.semester}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!importResult && (
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>

            {step === 1 ? (
              <button
                onClick={handleParse}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
              >
                Preview & Validate <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                disabled={isSubmitting}
                onClick={handleExecuteImport}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Upserting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Import {parsedCourses.length} Courses
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
