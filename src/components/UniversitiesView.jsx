import React, { useState, useEffect } from "react";
import { GraduationCap, AlertTriangle, Plus, Edit2, Trash2, X, Check, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function UniversitiesView() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUni, setEditingUni] = useState(null);

  // Add / Edit Form State
  const [form, setForm] = useState({
    id: "",
    name: "",
    current_semester: 1,
  });

  // Semester Rollover Confirmation Modal State
  const [pendingUniversity, setPendingUniversity] = useState(null);
  const [targetSemester, setTargetSemester] = useState(1);
  const [isConfirmingRollover, setIsConfirmingRollover] = useState(false);

  // Notifications / Error messages
  const [notification, setNotification] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchUniversities = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/universities`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUniversities(data || []);
      }
    } catch (err) {
      console.error("Error fetching universities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
  }, []);

  const openAddModal = () => {
    setEditingUni(null);
    setForm({ id: "", name: "", current_semester: 1 });
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (uni) => {
    setEditingUni(uni);
    setForm({ id: uni.id, name: uni.name || "", current_semester: uni.current_semester || 1 });
    setErrorMsg(null);
    setIsAddModalOpen(true);
  };

  const handleSaveUniversity = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      let res;
      if (editingUni) {
        // Edit existing
        res = await fetch(`${API_BASE_URL}/api/admin/universities/${editingUni.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: form.name,
            current_semester: parseInt(form.current_semester, 10),
          }),
        });
      } else {
        // Create new
        res = await fetch(`${API_BASE_URL}/api/admin/universities`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: form.id.trim().toUpperCase(),
            name: form.name.trim(),
            current_semester: parseInt(form.current_semester, 10),
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save university");

      setIsAddModalOpen(false);
      setNotification({
        type: "success",
        text: `University '${data.name || data.id}' ${editingUni ? "updated" : "created"} successfully!`,
      });
      setTimeout(() => setNotification(null), 4000);
      fetchUniversities();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteUniversity = async (uni) => {
    if (!window.confirm(`Are you sure you want to delete university '${uni.name} (${uni.id})'?`)) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/universities/${uni.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete university");

      setNotification({ type: "success", text: `University '${uni.id}' deleted successfully.` });
      setTimeout(() => setNotification(null), 4000);
      fetchUniversities();
    } catch (err) {
      alert(`Deletion Denied:\n${err.message}`);
    }
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-purple-400" />
            Universities & Academic Structure
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Add new higher institutions, edit details, manage active semesters, and delete unused entries.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
        >
          <Plus className="w-4 h-4" /> Add New University
        </button>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Notice Banner */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl text-xs flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block text-sm text-white">University Lifecycle Rules</span>
          <p className="text-slate-400">
            • You can add new institutions (e.g. UNILAG, OAU, FUTA).
            <br />
            • Changing <code className="bg-slate-800 px-1 rounded text-purple-300">current_semester</code> toggles active course visibility for students enrolled at that institution.
            <br />
            • Universities with linked user profiles, courses, or questions <strong>cannot be deleted</strong> to protect data integrity.
          </p>
        </div>
      </div>

      {/* Universities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
            Loading universities...
          </div>
        ) : universities.length === 0 ? (
          <div className="col-span-3 p-12 text-center text-slate-500 text-xs">
            No universities registered yet. Click "Add New University" above.
          </div>
        ) : (
          universities.map((uni) => (
            <div key={uni.id} className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4 relative flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono font-bold text-xs rounded-lg">
                    {uni.id}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(uni)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                      title="Edit University"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUniversity(uni)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                      title="Delete University (If empty)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white leading-snug">{uni.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Shortcode: {uni.id}</p>
                </div>

                <div className="p-3.5 bg-slate-800/60 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Academic Semester</div>
                  <div className="text-xl font-black text-purple-400">Semester {uni.current_semester || 1}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 space-y-2 mt-4">
                <span className="text-[11px] text-slate-400 font-semibold block">Quick Semester Toggle:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={uni.current_semester === 1}
                    onClick={() => triggerSemesterRollover(uni, 1)}
                    className={`py-1.5 rounded-xl font-bold text-xs border transition ${
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
                    className={`py-1.5 rounded-xl font-bold text-xs border transition ${
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

      {/* Add / Edit University Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-400" />
                {editingUni ? `Edit University (${editingUni.id})` : "Add New University"}
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveUniversity} className="space-y-4 text-xs">
              {!editingUni && (
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">University Code / ID (e.g. UNILAG, OAU, FUTA)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UNILAG"
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white uppercase focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Full Institution Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. University of Lagos"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Initial Active Semester</label>
                <select
                  value={form.current_semester}
                  onChange={(e) => setForm({ ...form, current_semester: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg transition"
                >
                  {editingUni ? "Save Changes" : "Create University"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Semester Confirmation Modal */}
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
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition shadow-lg"
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
