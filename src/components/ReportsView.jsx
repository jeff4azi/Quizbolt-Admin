import React, { useState, useEffect, useCallback } from "react";
import {
  Flag,
  ShieldAlert,
  CheckCircle,
  XCircle,
  UserX,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  Users,
  Clock,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  Filter,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import ConfirmDialog from "./ConfirmDialog";

const REASON_LABELS = {
  spam: "Spam / Automation",
  harassment: "Harassment / Abuse",
  impersonation: "Impersonation",
  inappropriate_content: "Inappropriate Content",
  cheating: "Cheating / Exam Misconduct",
  other: "Other Policy Violation",
};

export default function ReportsView() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    total_connections: 0,
    messages_today: 0,
    pending_reports: 0,
    reports_this_week: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending"); // "all", "pending", "reviewed", "actioned", "dismissed"
  const [notification, setNotification] = useState(null);
  const [activeAdmin, setActiveAdmin] = useState(null);

  // Confirmation dialogs
  const [banConfirmReport, setBanConfirmReport] = useState(null);
  const [dismissConfirmReport, setDismissConfirmReport] = useState(null);
  const [warnConfirmReport, setWarnConfirmReport] = useState(null);

  // Fetch current admin user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setActiveAdmin(user);
    });
  }, []);

  // Fetch messaging stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_messaging_stats");
      if (!error && data) {
        setStats(data);
      } else {
        // Fallback direct count queries
        const [
          { count: connCount },
          { count: msgCount },
          { count: pendingCount },
          { count: weekReportsCount },
        ] = await Promise.all([
          supabase.from("connections").select("*", { count: "exact", head: true }).eq("state", "accepted"),
          supabase.from("messages").select("*", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0,0,0,0)).toISOString()),
          supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("reports").select("*", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        ]);

        setStats({
          total_connections: connCount || 0,
          messages_today: msgCount || 0,
          pending_reports: pendingCount || 0,
          reports_this_week: weekReportsCount || 0,
        });
      }
    } catch (err) {
      console.warn("Stats fetch notice:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch reports with hydrated reporter & reported profiles
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: rawReports, error } = await query;
      if (error) throw error;

      if (!rawReports || rawReports.length === 0) {
        setReports([]);
        return;
      }

      // Collect user IDs for both reporters and reported
      const userIds = Array.from(
        new Set([
          ...rawReports.map((r) => r.reporter_id),
          ...rawReports.map((r) => r.reported_id),
        ])
      );

      // Hydrate profiles
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, user_name, avatar_url, university, is_banned, is_premium")
        .in("id", userIds);

      if (profErr) console.warn("Error hydrating report profiles:", profErr);

      const profMap = new Map((profiles || []).map((p) => [p.id, p]));

      const hydrated = rawReports.map((r) => ({
        ...r,
        reporter: profMap.get(r.reporter_id) || { id: r.reporter_id, full_name: "Reporter" },
        reported: profMap.get(r.reported_id) || { id: r.reported_id, full_name: "Reported User" },
      }));

      setReports(hydrated);
    } catch (err) {
      console.error("Error fetching reports:", err);
      showNotice("error", "Failed to load reports: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
    fetchStats();
  }, [fetchReports, fetchStats]);

  const showNotice = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  // Action: Dismiss report
  const handleDismiss = async (report) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status: "dismissed",
          resolved_at: new Date().toISOString(),
          resolved_by: activeAdmin?.id || null,
        })
        .eq("id", report.id);

      if (error) throw error;

      // Audit log if possible
      try {
        await supabase.from("audit_logs").insert({
          admin_id: activeAdmin?.id,
          admin_email: activeAdmin?.email || "admin",
          action: "DISMISS_REPORT",
          target_type: "report",
          target_id: report.id,
          details: { reported_user: report.reported?.user_name || report.reported_id },
        });
      } catch (e) {}

      showNotice("success", "Report dismissed.");
      setDismissConfirmReport(null);
      fetchReports();
      fetchStats();
    } catch (err) {
      showNotice("error", "Failed to dismiss: " + err.message);
    }
  };

  // Action: Warn user
  const handleWarn = async (report) => {
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          status: "reviewed",
          resolved_at: new Date().toISOString(),
          resolved_by: activeAdmin?.id || null,
        })
        .eq("id", report.id);

      if (error) throw error;

      try {
        await supabase.from("audit_logs").insert({
          admin_id: activeAdmin?.id,
          admin_email: activeAdmin?.email || "admin",
          action: "WARN_USER",
          target_type: "user",
          target_id: report.reported_id,
          details: { report_id: report.id, reason: report.reason },
        });
      } catch (e) {}

      showNotice("success", `Warning logged for @${report.reported?.user_name || "user"}. Status marked reviewed.`);
      setWarnConfirmReport(null);
      fetchReports();
      fetchStats();
    } catch (err) {
      showNotice("error", "Failed to action warning: " + err.message);
    }
  };

  // Action: Ban reported user
  const handleBan = async (report) => {
    try {
      // 1. Mark user as banned in profiles
      const { error: banErr } = await supabase
        .from("profiles")
        .update({ is_banned: true })
        .eq("id", report.reported_id);

      if (banErr) throw banErr;

      // 2. Mark report as actioned
      const { error: repErr } = await supabase
        .from("reports")
        .update({
          status: "actioned",
          resolved_at: new Date().toISOString(),
          resolved_by: activeAdmin?.id || null,
        })
        .eq("id", report.id);

      if (repErr) throw repErr;

      // 3. Update connections involving reported user to blocked
      await supabase
        .from("connections")
        .update({ state: "blocked" })
        .or(`requester_id.eq.${report.reported_id},receiver_id.eq.${report.reported_id}`);

      try {
        await supabase.from("audit_logs").insert({
          admin_id: activeAdmin?.id,
          admin_email: activeAdmin?.email || "admin",
          action: "BAN_USER",
          target_type: "user",
          target_id: report.reported_id,
          details: {
            report_id: report.id,
            reason: report.reason,
            username: report.reported?.user_name,
          },
        });
      } catch (e) {}

      showNotice("success", `@${report.reported?.user_name || "user"} has been banned and report marked actioned.`);
      setBanConfirmReport(null);
      fetchReports();
      fetchStats();
    } catch (err) {
      showNotice("error", "Failed to ban user: " + err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100 font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold animate-in slide-in-from-top-4 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-950 border-emerald-800 text-emerald-200"
              : "bg-rose-950 border-rose-800 text-rose-200"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Flag className="w-6 h-6 text-rose-400" />
            <span>Reports & Content Moderation</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Review user reports, take action against harmful behavior, and inspect messaging safety.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              fetchReports();
              fetchStats();
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── MESSAGING OVERVIEW METRICS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Active Connections</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {statsLoading ? "..." : (stats.total_connections || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Accepted friendships</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Messages Today</span>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {statsLoading ? "..." : (stats.messages_today || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Since midnight UTC</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Pending Reports</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {statsLoading ? "..." : (stats.pending_reports || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Requires staff review</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Reports (7d)</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400">
            {statsLoading ? "..." : (stats.reports_this_week || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Filed this past week</p>
        </div>
      </div>

      {/* ── REPORTS LIST & FILTER BAR ────────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Status Filter Tabs */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap bg-[#0B0F17]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            {[
              { id: "pending", label: "Pending Review" },
              { id: "actioned", label: "Actioned / Banned" },
              { id: "dismissed", label: "Dismissed" },
              { id: "reviewed", label: "Warned" },
              { id: "all", label: "All Records" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-semibold text-slate-400">
            Showing {reports.length} report{reports.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Content Table / Card feed */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin" />
            <span className="text-xs font-semibold text-slate-400">Loading reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-500/60 mx-auto" />
            <p className="text-sm font-bold text-white">No reports found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {statusFilter === "pending"
                ? "All clear! There are no pending reports requiring action right now."
                : `No reports matching "${statusFilter}".`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {reports.map((report) => {
              const reporterName = report.reporter?.full_name || report.reporter?.user_name || "Scholar";
              const reportedName = report.reported?.full_name || report.reported?.user_name || "Scholar";
              const reporterHandle = report.reporter?.user_name || "unknown";
              const reportedHandle = report.reported?.user_name || "unknown";
              const isBanned = Boolean(report.reported?.is_banned);

              return (
                <div
                  key={report.id}
                  className="p-5 hover:bg-slate-850/50 transition space-y-3.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Reporter & Reported Info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="font-bold text-slate-200">🚩</span>
                        <span className="font-bold text-white">@{reporterHandle}</span>
                        <span className="text-xs text-slate-400">({reporterName})</span>
                        <span className="text-xs text-slate-500 font-semibold">reported</span>
                        <span className="font-bold text-rose-400">@{reportedHandle}</span>
                        <span className="text-xs text-slate-400">({reportedName})</span>

                        {isBanned && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase">
                            Banned
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-slate-400 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700">
                          {REASON_LABELS[report.reason] || report.reason}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                        <span>•</span>
                        <span
                          className={`font-bold capitalize ${
                            report.status === "pending"
                              ? "text-amber-400"
                              : report.status === "actioned"
                              ? "text-rose-400"
                              : "text-slate-400"
                          }`}
                        >
                          Status: {report.status}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const url = `https://quizbolt.net/u/${reportedHandle}`;
                          window.open(url, "_blank");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Profile</span>
                      </button>

                      {report.status === "pending" && (
                        <>
                          <button
                            type="button"
                            onClick={() => setDismissConfirmReport(report)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => setWarnConfirmReport(report)}
                            className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-semibold border border-amber-600/30 transition"
                          >
                            Warn User
                          </button>
                          <button
                            type="button"
                            onClick={() => setBanConfirmReport(report)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-sm"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Ban User</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description / Additional context */}
                  {report.description && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 font-medium">
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                        Report Details:
                      </p>
                      <p className="whitespace-pre-wrap">{report.description}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialogs */}
      {banConfirmReport && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setBanConfirmReport(null)}
          onConfirm={() => handleBan(banConfirmReport)}
          title={`Ban @${banConfirmReport.reported?.user_name || "user"}?`}
          message={`This will set this student's profile to banned, block their messaging connections, and mark this report as actioned. This action will be logged in the audit trail.`}
          confirmText="Yes, Ban User"
          confirmButtonClass="bg-rose-600 hover:bg-rose-700"
        />
      )}

      {dismissConfirmReport && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDismissConfirmReport(null)}
          onConfirm={() => handleDismiss(dismissConfirmReport)}
          title="Dismiss Report?"
          message="Are you sure you want to dismiss this report without taking punitive action?"
          confirmText="Dismiss Report"
          confirmButtonClass="bg-slate-700 hover:bg-slate-600"
        />
      )}

      {warnConfirmReport && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setWarnConfirmReport(null)}
          onConfirm={() => handleWarn(warnConfirmReport)}
          title={`Log warning for @${warnConfirmReport.reported?.user_name || "user"}?`}
          message="This will record an administrative warning in the audit trail and mark this report as reviewed."
          confirmText="Issue Warning"
          confirmButtonClass="bg-amber-600 hover:bg-amber-700"
        />
      )}
    </div>
  );
}
