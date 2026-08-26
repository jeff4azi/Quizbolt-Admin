import React, { useState, useEffect } from "react";
import { GraduationCap, AlertTriangle, Check, RefreshCw, Layers, Plus, Trash2 } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function UniversitiesView() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Semester Rollover Confirmation Modal
  const [pendingUniversity, setPendingUniversity] = useState(null);
  const [targetSemester, setTargetSemester] = useState(1);
  const [isConfirmingRollover, setIsConfirmingRollover] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("universities").select("*").order("name");
      if (error) throw error;
      setUniversities(data || []);
    } catch (err) {
      console.error("Error fetching universities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
  }, []);

  const triggerSemesterRollover = (uni, newSem) => {
    setPendingUniversity(uni);
    setTargetSemester(newSem);
    setIsConfirmingRollover(true);
  };

  const handleConfirmRollover = async () => {
    if (!pendingUniversity) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/universities/${pendingUniversity.id}/semester`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_semester: targetSemester }),
      });

      if (!res.ok) throw new Error("Failed to update current semester");

      setIsConfirmingRollover(false);
      setPendingUniversity(null);
      setNotification({ type: "success", text: `Updated ${pendingUniversity.name} to Semester ${targetSemester}!` });
      setTimeout(() => setNotification(null), 4000);
      fetchUniversities();
    } catch (err) {
      alert(`Error updating semester: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-purple-400" />
          Universities & Academic Structure
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Manage institution settings and trigger active academic semester rollovers app-wide.
        </p>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <span>{notification.text}</span>
        </div>
      )}

      {/* Warning Box */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span className="font-bold block text-sm">Critical Administrative Control</span>
          Changing a university's <code className="bg-amber-500/20 px-1 rounded text-amber-200">current_semester</code> immediately updates which courses every student from that institution sees on QuizBolt. Make changes deliberately!
        </div>
      </div>

      {/* Universities Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 p-12 text-center text-slate-400 animate-pulse">Loading university records...</div>
        ) : (
          universities.map((uni) => (
            <div key={uni.id} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-bold text-xs rounded-lg">
                  {uni.id}
                </span>
                <span className="text-xs font-semibold text-slate-400">ID: {uni.id}</span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{uni.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Active Academic Institution</p>
              </div>

              <div className="p-4 bg-slate-800/60 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Active Semester</div>
                <div className="text-2xl font-black text-purple-400">Semester {uni.current_semester || 1}</div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 font-semibold block">Change Semester:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={uni.current_semester === 1}
                    onClick={() => triggerSemesterRollover(uni, 1)}
                    className={`py-2 rounded-xl font-bold text-xs border transition ${
                      uni.current_semester === 1
                        ? "bg-purple-600/30 text-purple-200 border-purple-500/50 cursor-default"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                    }`}
                  >
                    Semester 1
                  </button>
                  <button
                    disabled={uni.current_semester === 2}
                    onClick={() => triggerSemesterRollover(uni, 2)}
                    className={`py-2 rounded-xl font-bold text-xs border transition ${
                      uni.current_semester === 2
                        ? "bg-purple-600/30 text-purple-200 border-purple-500/50 cursor-default"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                    }`}
                  >
                    Semester 2
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      {isConfirmingRollover && pendingUniversity && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h2 className="text-base font-bold text-white">Confirm Semester Rollover</h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to switch <strong className="text-white">{pendingUniversity.name}</strong> from{" "}
              <strong className="text-amber-300">Semester {pendingUniversity.current_semester}</strong> to{" "}
              <strong className="text-purple-300">Semester {targetSemester}</strong>?
            </p>

            <p className="text-xs text-slate-400 bg-slate-800/60 p-3 rounded-xl border border-slate-800">
              This will immediately change course visibility for all students enrolled under {pendingUniversity.id} app-wide.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsConfirmingRollover(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRollover}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/30"
              >
                Yes, Execute Rollover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
