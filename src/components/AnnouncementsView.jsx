import React, { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Send,
  RefreshCw,
  X,
  Check,
  Users,
  User as UserIcon,
  UsersRound,
  Search,
  Pencil,
  Trash2,
  BadgeCheck,
  AlertCircle,
  Loader2,
  TrendingUp,
  Mail,
  Eye,
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import ConfirmDialog from "./ConfirmDialog";

const MAX_BODY_LENGTH = 2000;
const LIMIT = 20;

const AUDIENCE_LABELS = {
  all: "All users",
  single: "Single user",
  selected: "Selected users",
};

/** Fetch helper — attaches the admin's Supabase access token. */
async function adminFetch(path, options = {}) {
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.error || result.message || "Request failed");
  return result;
}

export default function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Compose / edit modal
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState("create"); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ body: "", audience: "all", selectedUsers: [] });
  const [submitting, setSubmitting] = useState(false);

  // User picker
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState(null);

  const notify = useCallback((type, text) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4500);
  }, []);

  /* ── History ──────────────────────────────────────────────────────────── */

  const fetchAnnouncements = useCallback(async (targetPage = 1) => {
    setLoading(true);
    try {
      const data = await adminFetch(
        `/api/admin/announcements?page=${targetPage}&limit=${LIMIT}`,
      );
      setAnnouncements(data.announcements || []);
      setTotal(data.total || 0);
      setPage(data.page || targetPage);
    } catch (err) {
      console.error("Error fetching announcements:", err);
      notify("error", `Could not load announcements: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchAnnouncements(1);
  }, [fetchAnnouncements]);

  /* ── User picker search (debounced) ───────────────────────────────────── */

  useEffect(() => {
    if (!isComposeOpen || form.audience === "all") return;

    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await adminFetch(
          `/api/admin/announcements/recipients?q=${encodeURIComponent(userQuery)}`,
        );
        setUserResults(data || []);
      } catch (err) {
        console.error("Recipient search failed:", err);
        setUserResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [userQuery, form.audience, isComposeOpen]);

  /* ── Compose helpers ──────────────────────────────────────────────────── */

  const openCompose = () => {
    setComposeMode("create");
    setEditingId(null);
    setForm({ body: "", audience: "all", selectedUsers: [] });
    setUserQuery("");
    setUserResults([]);
    setIsComposeOpen(true);
  };

  const openEdit = (a) => {
    setComposeMode("edit");
    setEditingId(a.id);
    setForm({
      body: a.body,
      audience: a.audience_type,
      selectedUsers: [],
    });
    setIsComposeOpen(true);
  };

  const closeCompose = () => {
    setIsComposeOpen(false);
    setSubmitting(false);
  };

  const toggleUser = (user) => {
    setForm((prev) => {
      const exists = prev.selectedUsers.some((u) => u.id === user.id);
      if (prev.audience === "single") {
        return { ...prev, selectedUsers: exists ? [] : [user] };
      }
      return {
        ...prev,
        selectedUsers: exists
          ? prev.selectedUsers.filter((u) => u.id !== user.id)
          : [...prev.selectedUsers, user],
      };
    });
  };

  const setAudience = (audience) => {
    setForm((prev) => ({
      ...prev,
      audience,
      selectedUsers: audience === "all" ? [] : prev.selectedUsers.slice(0, audience === "single" ? 1 : undefined),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = form.body.trim();
    if (!body) return notify("error", "Write something before sending.");
    if (body.length > MAX_BODY_LENGTH)
      return notify("error", `Announcement must be ${MAX_BODY_LENGTH} characters or fewer.`);
    if (composeMode === "edit") return submitEdit(body);
    if (form.audience !== "all" && form.selectedUsers.length === 0)
      return notify("error", "Pick at least one recipient.");

    setSubmitting(true);
    try {
      const result = await adminFetch("/api/admin/announcements/send", {
        method: "POST",
        body: JSON.stringify({
          body,
          audience: form.audience,
          userIds: form.selectedUsers.map((u) => u.id),
        }),
      });

      closeCompose();
      notify("success", `Announcement delivered to ${result.recipientCount} user(s).`);
      fetchAnnouncements(1);
    } catch (err) {
      setSubmitting(false);
      notify("error", `Send failed: ${err.message}`);
    }
  };

  const submitEdit = async (body) => {
    setSubmitting(true);
    try {
      await adminFetch(`/api/admin/announcements/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({ body }),
      });
      closeCompose();
      notify("success", "Announcement updated for every recipient.");
      fetchAnnouncements(page);
    } catch (err) {
      setSubmitting(false);
      notify("error", `Update failed: ${err.message}`);
    }
  };

  /* ── Delete (hard recall) ─────────────────────────────────────────────── */

  const requestDelete = (a) => {
    setConfirmState({
      title: "Recall this announcement?",
      message: "It will be removed from every recipient's chat immediately.",
      detail:
        a.audience_type === "all"
          ? `This announcement reached ${a.recipient_count} users.`
          : `This announcement reached ${a.recipient_count} user(s).`,
      variant: "danger",
      confirmLabel: "Recall",
      loading: false,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, loading: true }));
        try {
          await adminFetch(`/api/admin/announcements/${a.id}`, { method: "DELETE" });
          setConfirmState(null);
          notify("success", "Announcement recalled from all chats.");
          fetchAnnouncements(page);
        } catch (err) {
          setConfirmState((s) => (s ? { ...s, loading: false } : s));
          notify("error", `Recall failed: ${err.message}`);
        }
      },
    });
  };

  /* ── Derived stats ────────────────────────────────────────────────────── */

  const totalReach = announcements.reduce((sum, a) => sum + (a.recipient_count || 0), 0);
  const totalReads = announcements.reduce((sum, a) => sum + (a.read_count || 0), 0);
  const readRate = totalReach > 0 ? Math.round((totalReads / totalReach) * 100) : 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-400" />
            Announcements
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Send official messages from the QuizBolt account straight into user chats. Edit or recall any broadcast at any time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAnnouncements(page)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={openCompose}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
          >
            <Send className="w-4 h-4" /> New Announcement
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            toast.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400" />
            )}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Megaphone className="w-5 h-5 text-indigo-400" />} label="Announcements" value={total} sub="Total broadcasts sent" loading={loading} />
        <KpiCard icon={<Users className="w-5 h-5 text-purple-400" />} label="Reach (this page)" value={totalReach} sub="Messages delivered" loading={loading} color="purple" />
        <KpiCard icon={<Eye className="w-5 h-5 text-cyan-400" />} label="Reads (this page)" value={totalReads} sub="Opened by recipients" loading={loading} color="cyan" />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          label="Read Rate"
          value={loading ? null : `${readRate}%`}
          sub="Average across this page"
          loading={loading}
          color="emerald"
          raw
        />
      </div>

      {/* ── History table ── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-bold text-white">Broadcast History</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold">
            {total.toLocaleString()} total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800">
                <th className="px-6 py-3">Message</th>
                <th className="px-4 py-3">Audience</th>
                <th className="px-4 py-3 text-right">Recipients</th>
                <th className="px-4 py-3 text-right">Read</th>
                <th className="px-4 py-3">Sent by</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading announcements…
                  </td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    No announcements yet. Send your first one to get started.
                  </td>
                </tr>
              ) : (
                announcements.map((a) => {
                  const recalled = Boolean(a.deleted_at);
                  const pct =
                    a.recipient_count > 0
                      ? Math.round(((a.read_count || 0) / a.recipient_count) * 100)
                      : 0;
                  return (
                    <tr
                      key={a.id}
                      className={`border-b border-slate-800/60 transition ${
                        recalled ? "opacity-50" : "hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="px-6 py-3 max-w-[320px]">
                        <div className="text-slate-200 line-clamp-2">{a.body}</div>
                        {recalled && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-[10px] font-bold">
                            Recalled
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <AudienceBadge type={a.audience_type} />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-300">
                        {(a.recipient_count || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${pct >= 50 ? "text-emerald-400" : pct > 0 ? "text-amber-400" : "text-slate-600"}`}>
                          {a.read_count || 0}
                        </span>
                        <span className="text-slate-600"> / {pct}%</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 truncate max-w-[150px]">
                        {a.created_by_email || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!recalled && (
                            <>
                              <button
                                onClick={() => openEdit(a)}
                                title="Edit announcement"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => requestDelete(a)}
                                title="Recall announcement"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAnnouncements(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold disabled:opacity-40 transition"
              >
                Previous
              </button>
              <button
                onClick={() => fetchAnnouncements(page + 1)}
                disabled={page >= totalPages || loading}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Compose / Edit modal ── */}
      {isComposeOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 flex items-center justify-between border-b border-slate-800 px-6 py-4 z-10">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-400" />
                {composeMode === "edit" ? "Edit Announcement" : "New Announcement"}
              </h2>
              <button onClick={closeCompose} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              {/* Left: composer */}
              <div className="space-y-4">
                {composeMode === "create" && (
                  <div>
                    <label className="block text-slate-400 mb-2 font-semibold">Audience</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "all", label: "All users", icon: UsersRound },
                        { id: "single", label: "Single user", icon: UserIcon },
                        { id: "selected", label: "Selected users", icon: Users },
                      ].map((opt) => {
                        const Icon = opt.icon;
                        const active = form.audience === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setAudience(opt.id)}
                            className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border font-bold transition ${
                              active
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {composeMode === "create" && form.audience !== "all" && (
                  <div className="space-y-2">
                    <label className="block text-slate-400 font-semibold">
                      {form.audience === "single" ? "Choose a recipient" : "Choose recipients"}
                    </label>

                    {form.selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.selectedUsers.map((u) => (
                          <span
                            key={u.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-lg font-semibold"
                          >
                            {u.full_name || u.user_name || u.id.slice(0, 8)}
                            <button type="button" onClick={() => toggleUser(u)}>
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                        placeholder="Search by name or username…"
                        className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/60">
                      {searching ? (
                        <div className="p-4 text-center text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        </div>
                      ) : userResults.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">No users found.</div>
                      ) : (
                        userResults.map((u) => {
                          const selected = form.selectedUsers.some((s) => s.id === u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => toggleUser(u)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${
                                selected ? "bg-indigo-600/20" : "hover:bg-slate-800/60"
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-200 truncate">
                                  {u.full_name || "Unnamed"}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {u.user_name ? `@${u.user_name}` : u.id.slice(0, 8)}
                                  {u.university ? ` · ${u.university}` : ""}
                                </div>
                              </div>
                              {selected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-400 font-semibold">Message</label>
                    <span
                      className={`text-[10px] font-bold ${
                        form.body.length > MAX_BODY_LENGTH ? "text-rose-400" : "text-slate-500"
                      }`}
                    >
                      {form.body.length}/{MAX_BODY_LENGTH}
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder="Write the announcement users will see in their chat…"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>

                {composeMode === "edit" && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Editing updates the message in every recipient's chat instantly. No new notification is sent.
                    </span>
                  </div>
                )}
              </div>

              {/* Right: live preview */}
              <div className="space-y-3">
                <label className="block text-slate-400 font-semibold">Chat preview</label>
                <div className="rounded-2xl border border-slate-800 bg-[#0B141A] p-4 min-h-[280px]">
                  <div className="flex items-end gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-slate-700">
                      <img src="/QuizBolt.jpg" alt="QuizBolt" className="w-full h-full object-cover" />
                    </div>
                    <div className="max-w-[85%]">
                      <div className="flex items-center gap-1 px-1 mb-1">
                        <span className="text-[11px] font-bold text-indigo-300">QuizBolt</span>
                        <BadgeCheck className="w-3.5 h-3.5 text-sky-400" />
                      </div>
                      <div className="bg-[#1F2C34] text-slate-100 text-xs rounded-2xl rounded-bl-sm px-3 py-2 whitespace-pre-wrap break-words">
                        {form.body.trim() || (
                          <span className="text-slate-500 italic">Your message will appear here…</span>
                        )}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[9px] text-slate-500">
                            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <Check className="w-3 h-3 text-sky-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  Rendered as a one-way message. Users cannot reply to the QuizBolt channel.
                </p>
              </div>

              {/* Footer */}
              <div className="lg:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeCompose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : composeMode === "edit" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {composeMode === "edit" ? "Save Changes" : "Send Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm dialog ── */}
      <ConfirmDialog
        isOpen={Boolean(confirmState)}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title}
        message={confirmState?.message}
        detail={confirmState?.detail}
        variant={confirmState?.variant}
        confirmLabel={confirmState?.confirmLabel}
        loading={confirmState?.loading}
      />
    </div>
  );
}

/* ── Sub-components ── */

function KpiCard({ icon, label, value, sub, loading, color = "indigo", raw = false }) {
  const colorMap = {
    indigo: "text-indigo-400",
    purple: "text-purple-400",
    cyan: "text-cyan-400",
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
        {loading ? "—" : raw ? value : (value ?? 0).toLocaleString()}
      </div>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}

function AudienceBadge({ type }) {
  const styles = {
    all: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300",
    single: "bg-purple-500/10 border-purple-500/30 text-purple-300",
    selected: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
  };
  return (
    <span className={`inline-block px-2 py-0.5 border rounded-full text-[10px] font-bold ${styles[type] || styles.all}`}>
      {AUDIENCE_LABELS[type] || type}
    </span>
  );
}
