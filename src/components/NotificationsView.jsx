import React, { useState, useEffect } from "react";
import { Bell, Send, Check, X } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function NotificationsView() {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);

  // Broadcast modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", target: "all" });
  const [notification, setNotification] = useState(null);

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/notifications/subscriptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (err) {
      console.error("Error fetching notifications telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/notifications/broadcast`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Broadcast failed");

      setIsModalOpen(false);
      setNotification({ type: "success", text: `Broadcast '${form.title}' queued for dispatch!` });
      setTimeout(() => setNotification(null), 4000);
      fetchTelemetry();
    } catch (err) {
      alert(`Error sending broadcast: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-400" />
            Push Notifications & Reminders (2.13)
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Dispatch announcements, exam season push notifications, and review delivery logs.
          </p>
        </div>

        <button
          onClick={() => { setForm({ title: "", body: "", target: "all" }); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
        >
          <Send className="w-4 h-4" /> Send Push Broadcast
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase">Active Push Subscriptions</div>
          <div className="text-3xl font-black text-indigo-400">{(telemetry?.activeSubscriptions || 0).toLocaleString()}</div>
          <p className="text-xs text-slate-400">Students registered to receive push notifications.</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase">Onboarding Reminders Sent Log</div>
          <div className="text-3xl font-black text-purple-400">{(telemetry?.remindersLog?.length || 0).toLocaleString()}</div>
          <p className="text-xs text-slate-400">Delivered automated onboarding reminder pushes.</p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-400" /> Compose Push Broadcast
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Exam Season Preparation!"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Notification Message Body</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Practice past questions on QuizBolt now to boost your score."
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Target Audience</label>
                <select
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Enrolled Students</option>
                  <option value="premium">Premium Users Only</option>
                  <option value="free">Free Tier Users Only</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Send Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
