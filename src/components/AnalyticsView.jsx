import React, { useState, useEffect } from "react";
import { BarChart3, Download, RefreshCw, Filter, GraduationCap } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [universityFilter, setUniversityFilter] = useState("");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams();
      if (universityFilter) params.append("university", universityFilter);

      const res = await fetch(`${API_BASE_URL}/api/admin/analytics?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [universityFilter]);

  const exportCsv = () => {
    if (!data?.courseStatsList) return;
    let csv = "University,Course Code,Attempts,Retakes,Avg Score %\n";
    data.courseStatsList.forEach((item) => {
      csv += `"${item.university}","${item.course_code}",${item.attempts},${item.retakes},${item.avg_score}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quizbolt-university-analytics-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            University-Scoped Analytics & Telemetry (2.12)
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Attempt telemetry aggregated across all database rows via PostgreSQL RPC functions (bypassing API row limits).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            disabled={!data || !data.courseStatsList}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-400" /> Export CSV Report
          </button>
        </div>
      </div>

      {/* University Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center gap-3 text-xs">
        <span className="text-slate-400 font-semibold flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-indigo-400" /> Filter by University:
        </span>
        <select
          value={universityFilter}
          onChange={(e) => setUniversityFilter(e.target.value)}
          className="px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Universities</option>
          <option value="TASUED">TASUED</option>
          <option value="BOUESTI">BOUESTI</option>
          <option value="LASU">LASU</option>
        </select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          Aggregating all database attempt records...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Exam Attempts ({universityFilter || "All"})</div>
              <div className="text-2xl font-black text-white mt-1">{(data?.totalExamAttempts || 0).toLocaleString()}</div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Practice Attempts ({universityFilter || "All"})</div>
              <div className="text-2xl font-black text-purple-400 mt-1">{(data?.totalTestAttempts || 0).toLocaleString()}</div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase">University-Course Pairs</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{(data?.courseStatsList?.length || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-4 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              Course Attempt Telemetry (Grouped by Institution)
            </h2>
            {!data?.courseStatsList || data.courseStatsList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No attempt telemetry recorded for this filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <th className="py-3 px-4">University</th>
                      <th className="py-3 px-4">Course Code</th>
                      <th className="py-3 px-4">Total Attempts</th>
                      <th className="py-3 px-4">Retake Count</th>
                      <th className="py-3 px-4">Average Score %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.courseStatsList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-bold text-indigo-300">{item.university}</td>
                        <td className="py-3.5 px-4 font-bold text-white">{item.course_code}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">{item.attempts.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-purple-300 font-medium">{item.retakes.toLocaleString()}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">{item.avg_score}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
