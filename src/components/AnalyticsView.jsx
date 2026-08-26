import React, { useState, useEffect } from "react";
import { BarChart3, Download, RefreshCw, FileText } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/analytics`, {
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
  }, []);

  const exportCsv = () => {
    if (!data?.courseStats) return;
    let csv = "Course ID,Attempts,Total Score,Retakes,Avg Score\n";
    Object.entries(data.courseStats).forEach(([courseId, stats]) => {
      const avg = stats.attempts ? (stats.totalScore / stats.attempts).toFixed(2) : 0;
      csv += `"${courseId}",${stats.attempts},${stats.totalScore},${stats.retakes},${avg}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quizbolt-course-analytics-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Analytics & Content Performance Reports (2.12)
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Aggregated exam & practice test attempt telemetry, course retake rates, and average score distributions.
          </p>
        </div>

        <button
          onClick={exportCsv}
          disabled={!data}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-slate-400" /> Export CSV Report
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          Computing attempt telemetry...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Exam Attempts</div>
              <div className="text-2xl font-black text-white mt-1">{(data?.totalExamAttempts || 0).toLocaleString()}</div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Practice Attempts</div>
              <div className="text-2xl font-black text-purple-400 mt-1">{(data?.totalTestAttempts || 0).toLocaleString()}</div>
            </div>

            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Unique Courses Tracked</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{Object.keys(data?.courseStats || {}).length}</div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Course Attempt Breakdown</h2>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Course ID</th>
                  <th className="py-3 px-4">Total Attempts</th>
                  <th className="py-3 px-4">Retake Count</th>
                  <th className="py-3 px-4">Average Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {Object.entries(data?.courseStats || {}).map(([courseId, stats]) => {
                  const avg = stats.attempts ? (stats.totalScore / stats.attempts).toFixed(1) : 0;
                  return (
                    <tr key={courseId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-indigo-400">{courseId}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{stats.attempts}</td>
                      <td className="py-3.5 px-4 text-purple-300 font-medium">{stats.retakes}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">{avg}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
