import React, { useState, useEffect } from "react";
import { Bell, Send, Check, X, Users, UserCheck, UserX, Clock, TrendingUp, BarChart3, Mail, RefreshCw } from "lucide-react";
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

  const overview = telemetry?.onboardingOverview;
  const buckets = overview?.buckets;
  const convertedBuckets = overview?.convertedBuckets;

  const bucketRate = (sent, converted) =>
    sent > 0 ? `${Math.round((converted / sent) * 100)}%` : "—";

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-400" />
            Push Notifications & Reminders
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Dispatch announcements, monitor onboarding reminder effectiveness, and review delivery logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTelemetry}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => { setForm({ title: "", body: "", target: "all" }); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
          >
            <Send className="w-4 h-4" /> Send Push Broadcast
          </button>
        </div>
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

      {/* ── Top-Level KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Bell className="w-5 h-5 text-indigo-400" />}
          label="Push Subscriptions"
          value={telemetry?.activeSubscriptions}
          sub="Active devices registered"
          loading={loading}
        />
        <KpiCard
          icon={<Mail className="w-5 h-5 text-purple-400" />}
          label="Reminders Sent"
          value={overview?.totalRemindersSent}
          sub="Total onboarding emails sent"
          loading={loading}
          color="purple"
        />
        <KpiCard
          icon={<UserCheck className="w-5 h-5 text-emerald-400" />}
          label="Came Back & Completed"
          value={overview?.totalConverted}
          sub={overview ? `${overview.conversionRate}% conversion rate` : "—"}
          loading={loading}
          color="emerald"
        />
        <KpiCard
          icon={<UserX className="w-5 h-5 text-amber-400" />}
          label="Still Pending"
          value={overview?.totalNotConverted}
          sub="Reminded but haven't returned"
          loading={loading}
          color="amber"
        />
      </div>

      {/* ── Onboarding Reminder Effectiveness Overview ── */}
      {overview && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Conversion Rate Hero + Avg Time */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center text-center space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Conversion Rate</div>
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-slate-800"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeDasharray={`${overview.conversionRate}, 100`}
                  strokeLinecap="round"
                  className="text-emerald-400"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-black text-emerald-400">{overview.conversionRate}%</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              {overview.totalConverted} of {overview.totalRemindersSent} reminded users completed onboarding
            </p>
            {overview.avgConversionHours !== null && (
              <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-slate-800/80 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-xs text-slate-300">
                  Avg. time to convert: <span className="font-bold text-white">
                    {overview.avgConversionHours < 24
                      ? `${overview.avgConversionHours}h`
                      : `${Math.round(overview.avgConversionHours / 24 * 10) / 10} days`
                    }
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Time-Bucketed Conversion Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversion by Time Period</span>
            </div>
            <div className="space-y-0">
              <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800 pb-2 mb-1">
                <span>Period</span>
                <span className="text-right">Sent</span>
                <span className="text-right">Converted</span>
                <span className="text-right">Rate</span>
              </div>
              {buckets && convertedBuckets && (
                <>
                  <BucketRow label="Last 24h" sent={buckets.last24h} converted={convertedBuckets.last24h} />
                  <BucketRow label="Last 7 days" sent={buckets.last7d} converted={convertedBuckets.last7d} />
                  <BucketRow label="Last 30 days" sent={buckets.last30d} converted={convertedBuckets.last30d} />
                  <BucketRow label="Older" sent={buckets.older} converted={convertedBuckets.older} />
                </>
              )}
              <div className="grid grid-cols-4 gap-2 text-xs font-bold text-white pt-2 border-t border-slate-700 mt-1">
                <span>Total</span>
                <span className="text-right">{overview.totalRemindersSent}</span>
                <span className="text-right text-emerald-400">{overview.totalConverted}</span>
                <span className="text-right text-emerald-400">{overview.conversionRate}%</span>
              </div>
            </div>
          </div>

          {/* Platform Health Overview */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Platform Health</span>
            </div>
            <div className="space-y-3">
              <HealthRow
                label="Total Registered Users"
                value={overview.totalRegisteredUsers}
                color="text-indigo-400"
              />
              <HealthRow
                label="Onboarding Incomplete"
                value={overview.incompleteOnboarding}
                color="text-amber-400"
                warn={overview.incompleteOnboarding > 0}
              />
              <HealthRow
                label="Push-Enabled Users"
                value={telemetry.activeSubscriptions}
                color="text-indigo-400"
              />
              <HealthRow
                label="Push Opt-in Rate"
                value={
                  overview.totalRegisteredUsers > 0
                    ? `${Math.round((telemetry.activeSubscriptions / overview.totalRegisteredUsers) * 100)}%`
                    : "—"
                }
                color="text-cyan-400"
              />
              <HealthRow
                label="Reminder Emails Sent"
                value={overview.totalRemindersSent}
                color="text-purple-400"
              />
              <HealthRow
                label="Still Haven't Returned"
                value={overview.totalNotConverted}
                color="text-rose-400"
                warn={overview.totalNotConverted > 10}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Onboarding Reminders Delivery Log ── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-white">Onboarding Reminder Delivery Log</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">
            Showing latest {telemetry?.remindersLog?.length || 0} entries
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800">
                <th className="px-6 py-3">User ID</th>
                <th className="px-6 py-3">Sent At</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading delivery log…
                  </td>
                </tr>
              ) : !telemetry?.remindersLog?.length ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    No onboarding reminders have been sent yet.
                  </td>
                </tr>
              ) : (
                telemetry.remindersLog.map((entry, idx) => (
                  <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-800/40 transition">
                    <td className="px-6 py-3 font-mono text-[11px] text-slate-300 truncate max-w-[200px]">
                      {entry.user_id}
                    </td>
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(entry.sent_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      {entry.converted ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-bold">
                          <UserCheck className="w-3 h-3" /> Completed Onboarding
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-bold">
                          <Clock className="w-3 h-3" /> Still Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Broadcast Modal ── */}
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5"
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

/* ── Sub-Components ── */

function KpiCard({ icon, label, value, sub, loading, color = "indigo" }) {
  const colorMap = {
    indigo: "text-indigo-400",
    purple: "text-purple-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-3xl font-black ${colorMap[color] || "text-indigo-400"}`}>
        {loading ? "—" : (value ?? 0).toLocaleString()}
      </div>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}

function BucketRow({ label, sent, converted }) {
  const rate = sent > 0 ? `${Math.round((converted / sent) * 100)}%` : "—";
  return (
    <div className="grid grid-cols-4 gap-2 text-xs py-2 border-b border-slate-800/50 text-slate-300">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-semibold">{sent}</span>
      <span className="text-right font-semibold text-emerald-400">{converted}</span>
      <span className={`text-right font-bold ${sent > 0 && converted / sent >= 0.5 ? "text-emerald-400" : sent > 0 ? "text-amber-400" : "text-slate-600"}`}>
        {rate}
      </span>
    </div>
  );
}

function HealthRow({ label, value, color, warn }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className={`text-sm font-bold ${color} ${warn ? "animate-pulse" : ""}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
    </div>
  );
}
