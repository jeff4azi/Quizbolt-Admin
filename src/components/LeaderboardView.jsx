import React, { useState, useEffect } from "react";
import { Award, RefreshCw, Check } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function LeaderboardView() {
  const [snapshot, setSnapshot] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchSnapshot = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data || []);
      }
    } catch (err) {
      console.error("Error fetching leaderboard snapshot:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();
  }, []);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/leaderboard/recompute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to recompute leaderboard");

      setNotification({ type: "success", text: "Leaderboard rank snapshot recomputed successfully!" });
      setTimeout(() => setNotification(null), 4000);
      fetchSnapshot();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            Leaderboard Snapshots & Disputes (2.11)
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            View weekly rank snapshots, verify top student scores, and trigger manual rank recomputations.
          </p>
        </div>

        <button
          onClick={handleRecompute}
          disabled={recomputing}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${recomputing ? "animate-spin" : ""}`} />
          Recompute Leaderboard Now
        </button>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notification.text}</span>
        </div>
      )}

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading leaderboard snapshot...</div>
        ) : snapshot.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No leaderboard snapshot data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">University</th>
                  <th className="py-3 px-4">Best Score %</th>
                  <th className="py-3 px-4">Week Start</th>
                  <th className="py-3 px-4">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {snapshot.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-black text-amber-400">#{row.rank}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{row.user_id}</td>
                    <td className="py-3.5 px-4 font-bold text-indigo-300">{row.university}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">{row.best_percent}%</td>
                    <td className="py-3.5 px-4 text-slate-400">{new Date(row.week_start).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-slate-400">{new Date(row.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
