import React, { useEffect, useState } from "react";
import {
  Users,
  Crown,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  GraduationCap,
  CheckCircle,
  Sparkles,
  RefreshCw,
  HelpCircle,
  Share2,
  Bell,
  ArrowRight,
  Shield,
  Activity,
  Zap,
  UserCheck,
  Package,
  Clock,
  FileText,
  BarChart3,
  Flag,
  MessageSquare,
  Wifi,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

/* ── Avatar helpers ── */
const AVATAR_COLORS = [
  "bg-indigo-900 text-indigo-300",
  "bg-violet-900 text-violet-300",
  "bg-cyan-900 text-cyan-300",
  "bg-emerald-900 text-emerald-300",
  "bg-amber-900 text-amber-300",
  "bg-rose-900 text-rose-300",
];
const avatarColor = (str = "") => {
  let h = 0;
  for (let c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

/* ── Level label helper ── */
const LEVEL_LABELS = { 1: "100L", 2: "200L", 3: "300L", 4: "400L" };
const levelLabel = (year) => LEVEL_LABELS[Number(year)] || null;

/* ── timeAgo helper ── */
function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

export default function DashboardView({ onNavigate }) {
  const navigate = useNavigate();
  const go = (tab) => navigate(`/${tab}`);

  const [stats, setStats] = useState(null);
  const [messagingStats, setMessagingStats] = useState({
    total_connections: 0,
    messages_today: 0,
    pending_reports: 0,
    reports_this_week: 0,
  });
  const [loading, setLoading] = useState(true);
  // onlineCount is fetched via the backend API (service role bypasses RLS)
  const [onlineCount, setOnlineCount] = useState(null);

  useEffect(() => {
    // Poll online count every 30s via the backend
    const fetchOnlineCount = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const res = await fetch(`${API_BASE_URL}/api/admin/online`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setOnlineCount(json.count ?? 0);
        }
      } catch (err) {
        console.warn("Could not fetch online count:", err);
      }
    };
    fetchOnlineCount();
    const interval = setInterval(fetchOnlineCount, 30_000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      // Sunday 00:00 local — same week boundary the client/leaderboard uses.
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const params = new URLSearchParams({
        today_start: todayStart.toISOString(),
        week_start: weekStart.toISOString(),
      });
      const res = await fetch(
        `${API_BASE_URL}/api/admin/dashboard?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) setStats(await res.json());

      try {
        const { data: rpcStats } = await supabase.rpc("get_messaging_stats");
        if (rpcStats) {
          setMessagingStats(rpcStats);
        } else {
          // Fallback direct count queries (excluding the QuizBolt official channel)
          const { data: systemProfiles } = await supabase
            .from("profiles")
            .select("id")
            .eq("is_system", true);
          const systemIds = (systemProfiles || []).map((p) => p.id);

          let connQuery = supabase
            .from("connections")
            .select("*", { count: "exact", head: true })
            .eq("state", "accepted");
          if (systemIds.length) {
            const systemList = `(${systemIds.join(",")})`;
            connQuery = connQuery
              .not("requester_id", "in", systemList)
              .not("receiver_id", "in", systemList);
          }

          const [
            { count: connCount },
            { count: msgCount },
            { count: repCount },
          ] = await Promise.all([
            connQuery,
            supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .gte(
                "created_at",
                new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
              ),
            supabase
              .from("reports")
              .select("*", { count: "exact", head: true })
              .eq("status", "pending"),
          ]);
          setMessagingStats({
            total_connections: connCount || 0,
            messages_today: msgCount || 0,
            pending_reports: repCount || 0,
          });
        }
      } catch (err) {
        console.warn("Notice loading messaging stats:", err);
      }
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const kpis = stats?.kpis || {};
  const needsAttention = stats?.needsAttention || {};
  const recentSignups = stats?.recentSignups || [];
  const recentAuditLogs = stats?.recentAuditLogs || [];
  // signupsTrend and onlineCount now come directly from the dashboard endpoint
  const signupsTrend = stats?.signupsTrend || [];

  const now = new Date();
  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  const dateLabel = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  /* Activity breakdown max for bar scaling */
  const examAtt = kpis.examAttemptsThisWeek || 0;
  const practiceAtt = kpis.totalTestAttempts || 0;
  const matchAtt = kpis.totalMatchAttempts || 0;
  const activityMax = Math.max(examAtt, practiceAtt, matchAtt, 1);

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100">
      {/* ── 1. Header Row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {greeting} · {dateLabel}
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* ── 2. Live Online Banner ── */}
      <button
        onClick={() => go("online")}
        className="w-full bg-slate-900 border border-emerald-800/40 rounded-2xl px-5 py-3.5 hover:border-emerald-500/60 transition-all group text-left"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-sm font-bold text-slate-100">
              {onlineCount === null ? (
                <span className="text-slate-500">Loading…</span>
              ) : (
                <>
                  <span className="text-emerald-400 font-black">
                    {onlineCount}
                  </span>{" "}
                  Scholar{onlineCount !== 1 ? "s" : ""} Online Now
                </>
              )}
            </span>
          </div>
          <span className="shrink-0 flex items-center gap-1 text-emerald-400 text-xs font-bold group-hover:translate-x-0.5 transition-transform">
            View Live <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </button>

      {/* ── 3. Alert Pills Row ── */}
      {(kpis.pendingReviews > 0 ||
        kpis.availableCodes < 5 ||
        kpis.newSignupsToday > 0) && (
        <div className="flex flex-wrap gap-2">
          {kpis.pendingReviews > 0 && (
            <button
              onClick={() => go("reviews")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-bold hover:bg-amber-500/20 transition"
            >
              <AlertTriangle className="w-3 h-3" />
              {kpis.pendingReviews} pending review
              {kpis.pendingReviews !== 1 ? "s" : ""}
            </button>
          )}
          {kpis.availableCodes < 5 && (
            <button
              onClick={() => go("premium")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-bold hover:bg-rose-500/20 transition"
            >
              <Package className="w-3 h-3" />
              Only {kpis.availableCodes ?? 0} codes left
            </button>
          )}
          {kpis.newSignupsToday > 0 && (
            <button
              onClick={() => go("users")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold hover:bg-emerald-500/20 transition"
            >
              <UserCheck className="w-3 h-3" />+{kpis.newSignupsToday} new today
            </button>
          )}
        </div>
      )}

      {/* ── 4. Primary KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={Users}
          iconBg="bg-indigo-500/15"
          iconColor="text-indigo-400"
          label="Total Students"
          value={kpis.totalUsers}
          sub={`+${kpis.newSignups7d || 0} this week`}
          loading={loading}
          onClick={() => go("users")}
        />
        <KpiCard
          icon={Crown}
          iconBg="bg-amber-500/15"
          iconColor="text-amber-400"
          label="Premium Users"
          value={kpis.premiumUsers}
          sub={`${kpis.premiumConversionRate || 0}% conversion`}
          valueColor="text-amber-400"
          loading={loading}
          onClick={() => go("premium")}
        />
        <KpiCard
          icon={Activity}
          iconBg="bg-blue-500/15"
          iconColor="text-blue-400"
          label="Total Attempts"
          value={kpis.totalActivityAttempts}
          sub={`${(kpis.totalExamAttempts || 0).toLocaleString()} exams`}
          loading={loading}
          onClick={() => go("analytics")}
        />
        <KpiCard
          icon={HelpCircle}
          iconBg="bg-purple-500/15"
          iconColor="text-purple-400"
          label="Questions in Bank"
          value={kpis.totalQuestions}
          sub="Across all universities"
          valueColor="text-purple-400"
          loading={loading}
          onClick={() => go("questions")}
        />
      </div>

      {/* ── 5. Secondary KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={Package}
          iconBg={
            kpis.availableCodes < 5 ? "bg-rose-500/15" : "bg-emerald-500/15"
          }
          iconColor={
            kpis.availableCodes < 5 ? "text-rose-400" : "text-emerald-400"
          }
          label="Available Codes"
          value={kpis.availableCodes}
          sub={`${kpis.redeemedCodes || 0} redeemed`}
          valueColor={
            kpis.availableCodes < 5 ? "text-rose-400" : "text-emerald-400"
          }
          loading={loading}
          onClick={() => go("premium")}
        />
        <KpiCard
          icon={Bell}
          iconBg="bg-indigo-500/15"
          iconColor="text-indigo-400"
          label="Push Subscribers"
          value={kpis.totalPushSubs}
          sub={`${kpis.onboardingReminders || 0} reminders sent`}
          loading={loading}
          onClick={() => go("notifications")}
        />
        <KpiCard
          icon={Share2}
          iconBg="bg-cyan-500/15"
          iconColor="text-cyan-400"
          label="Referral Signups"
          value={kpis.totalReferrals}
          sub={`${kpis.referralConversionRate || 0}% validated`}
          valueColor="text-cyan-400"
          loading={loading}
          onClick={() => go("referrals")}
        />
        <KpiCard
          icon={AlertTriangle}
          iconBg="bg-orange-500/15"
          iconColor="text-orange-400"
          label="Pending Moderation"
          value={kpis.pendingReviews}
          sub="Reviews awaiting approval"
          valueColor={
            kpis.pendingReviews > 0 ? "text-orange-400" : "text-emerald-400"
          }
          loading={loading}
          onClick={() => go("reviews")}
        />
      </div>

      {/* ── 6. Messaging Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <KpiCard
          icon={Flag}
          iconBg="bg-rose-500/15"
          iconColor="text-rose-400"
          label="Reports Pending"
          value={messagingStats.pending_reports}
          sub="Safety reports awaiting action"
          valueColor={
            messagingStats.pending_reports > 0
              ? "text-rose-400"
              : "text-emerald-400"
          }
          loading={loading}
          onClick={() => go("reports")}
        />
        <KpiCard
          icon={Wifi}
          iconBg="bg-indigo-500/15"
          iconColor="text-indigo-400"
          label="Active Connections"
          value={messagingStats.total_connections}
          sub="Scholars chatting & connecting"
          valueColor="text-indigo-400"
          loading={loading}
          onClick={() => go("reports")}
        />
        <KpiCard
          icon={MessageSquare}
          iconBg="bg-emerald-500/15"
          iconColor="text-emerald-400"
          label="Messages Today"
          value={messagingStats.messages_today}
          sub="Direct peer discussions"
          valueColor="text-emerald-400"
          loading={loading}
          onClick={() => go("reports")}
        />
      </div>

      {/* ── 7. Main 2-column grid: Recent Signups (left) + Signup Trend chart (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT (2/3): Recent Signups table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Recent Signups
            </h2>
            <button
              onClick={() => go("users")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              All Users <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <LoadingRows count={5} />
          ) : recentSignups.length === 0 ? (
            <EmptyState text="No signups yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase font-semibold text-[10px]">
                    <th className="py-3 px-5">Student</th>
                    <th className="py-3 px-3 hidden sm:table-cell">
                      University
                    </th>
                    <th className="py-3 px-3">Level</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentSignups.map((s) => {
                    const displayName = s.full_name || s.user_name || "Unknown";
                    const initials = displayName
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    const colorClass = avatarColor(displayName);
                    const lvl = levelLabel(s.year);
                    return (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-800/30 transition"
                      >
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            {s.avatar_url ? (
                              <img
                                src={s.avatar_url}
                                alt={displayName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black ${colorClass}`}
                              >
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate max-w-[120px]">
                                {displayName}
                              </div>
                              {s.user_name && s.full_name && (
                                <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                                  @{s.user_name}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 hidden sm:table-cell">
                          {s.university ? (
                            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-md text-[10px] font-semibold truncate max-w-[100px] inline-block">
                              {s.university}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {lvl ? (
                            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-bold">
                              {lvl}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {s.is_premium ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded text-[9px] font-bold">
                              <Crown className="w-2.5 h-2.5" /> PRO
                            </span>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-500 rounded text-[9px] font-bold">
                              FREE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {timeAgo(s.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT (1/3): Signup Trend AreaChart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Signup Trend
          </p>
          {loading ? (
            <div className="flex-1 min-h-[220px] bg-slate-800/40 rounded-xl animate-pulse" />
          ) : signupsTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={signupsTrend}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "#e2e8f0",
                  }}
                  itemStyle={{ color: "#818cf8" }}
                  cursor={{ stroke: "#334155", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="url(#signupGrad)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "#818cf8",
                    stroke: "#1e293b",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 min-h-[220px] flex items-center justify-center text-[11px] text-slate-600 border border-dashed border-slate-800 rounded-xl">
              Signup trend data unavailable
            </div>
          )}
        </div>
      </div>

      {/* ── 8. Bottom grid: Moderation Queue (left) + Activity Breakdown (right) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Moderation Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Moderation Queue
              {kpis.pendingReviews > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-black rounded-full">
                  {kpis.pendingReviews}
                </span>
              )}
            </h2>
            <button
              onClick={() => go("reviews")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              Open Queue <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <LoadingRows count={3} />
          ) : needsAttention.pendingReviews?.length > 0 ? (
            <div className="divide-y divide-slate-800/60">
              {needsAttention.pendingReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="px-5 py-3 flex items-start justify-between gap-3 hover:bg-slate-800/30 transition"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200">
                      {rev.user_name || "Anonymous"}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 italic mt-0.5">
                      "{rev.review_text}"
                    </div>
                    <div className="text-[10px] text-indigo-400 mt-0.5">
                      {rev.university}
                    </div>
                  </div>
                  <button
                    onClick={() => go("reviews")}
                    className="shrink-0 px-2.5 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition"
                  >
                    Review
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
              All reviews moderated — queue is clear!
            </div>
          )}
        </div>

        {/* Activity Breakdown — horizontal progress bars */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-blue-400" />
            Activity Breakdown
          </h2>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5 animate-pulse">
                  <div className="h-2.5 bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-800 rounded-full w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {[
                {
                  label: "Exam Attempts",
                  value: examAtt,
                  color: "bg-blue-500",
                },
                {
                  label: "Practice Attempts",
                  value: practiceAtt,
                  color: "bg-indigo-500",
                },
                {
                  label: "Match Attempts",
                  value: matchAtt,
                  color: "bg-purple-500",
                },
              ].map(({ label, value, color }) => {
                const pct = Math.round((value / activityMax) * 100);
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">{label}</span>
                      <span className="text-xs font-bold text-slate-200">
                        {value.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="pt-4 mt-2 border-t border-slate-800">
            <button
              onClick={() => go("analytics")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              Full Analytics <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 9. Bottom grid: Active Semesters (left) + Recent Audit Log (right) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Semesters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-400" />
              Active Semesters
            </h2>
            <button
              onClick={() => go("universities")}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <LoadingRows count={3} />
          ) : needsAttention.universities?.length > 0 ? (
            <div className="divide-y divide-slate-800/60">
              {needsAttention.universities.map((uni) => (
                <div
                  key={uni.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-slate-800/30 transition"
                >
                  <div>
                    <div className="text-xs font-bold text-white">
                      {uni.name || uni.id}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Controls course visibility app-wide
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-500/15 text-purple-300 border border-purple-500/25 font-bold rounded-lg text-[11px]">
                    Sem {uni.current_semester || 1}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text="No universities found." />
          )}
        </div>

        {/* Recent Audit Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Recent Admin Actions
            </h2>
            <button
              onClick={() => go("audit")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              Full Audit Log <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <LoadingRows count={4} />
          ) : recentAuditLogs.length === 0 ? (
            <EmptyState text="No admin actions recorded yet." />
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded uppercase">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {log.admin_email}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {log.target_type}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {timeAgo(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 10. Quick Actions ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {
              label: "Add Questions",
              icon: HelpCircle,
              tab: "questions",
              color: "text-purple-400",
              bg: "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20",
            },
            {
              label: "Grant Premium",
              icon: Crown,
              tab: "premium",
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20",
            },
            {
              label: "Moderate Reviews",
              icon: FileText,
              tab: "reviews",
              color: "text-indigo-400",
              bg: "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20",
            },
            {
              label: "Push Notification",
              icon: Bell,
              tab: "notifications",
              color: "text-cyan-400",
              bg: "bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20",
            },
            {
              label: "View Referrals",
              icon: Share2,
              tab: "referrals",
              color: "text-rose-400",
              bg: "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20",
            },
            {
              label: "Manage Users",
              icon: Users,
              tab: "users",
              color: "text-emerald-400",
              bg: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20",
            },
            {
              label: "Leaderboard",
              icon: BarChart3,
              tab: "leaderboard",
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20",
            },
            {
              label: "Audit Trail",
              icon: Shield,
              tab: "audit",
              color: "text-slate-400",
              bg: "bg-slate-700/50 border-slate-700 hover:bg-slate-700",
            },
          ].map(({ label, icon: Icon, tab, color, bg }) => (
            <button
              key={tab}
              onClick={() => go(tab)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition ${bg} ${color}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function KpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  valueColor = "text-white",
  loading,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl hover:bg-slate-800/60 transition group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
            {label}
          </p>
          <div
            className={`text-2xl sm:text-3xl font-black mt-1.5 ${valueColor}`}
          >
            {loading ? (
              <span className="text-slate-700">—</span>
            ) : typeof value === "number" ? (
              value.toLocaleString()
            ) : (
              (value ?? 0)
            )}
          </div>
          {sub && (
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              {sub}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${iconBg}`}>
          {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
        </div>
      </div>
    </button>
  );
}

function LoadingRows({ count = 3 }) {
  return (
    <div className="divide-y divide-slate-800/60">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="px-5 py-3.5 flex items-center gap-3 animate-pulse"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-800" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 bg-slate-800 rounded w-1/2" />
            <div className="h-2 bg-slate-800 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="px-5 py-8 text-center text-xs text-slate-500">{text}</div>
  );
}
