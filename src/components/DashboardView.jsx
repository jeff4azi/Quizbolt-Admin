import React, { useEffect, useState } from "react";
import {
  Users, Crown, BookOpen, AlertTriangle, TrendingUp, GraduationCap,
  CheckCircle, Sparkles, RefreshCw, HelpCircle, Share2, Bell,
  ArrowRight, Shield, Activity, Zap, UserCheck, Package, Clock,
  FileText, BarChart3
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function DashboardView({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStats(); }, []);

  const kpis = stats?.kpis || {};
  const needsAttention = stats?.needsAttention || {};
  const recentSignups = stats?.recentSignups || [];
  const recentAuditLogs = stats?.recentAuditLogs || [];

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-900/50 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)] pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-1">{greeting} 👋</p>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              QuizBolt Admin Command Centre
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Platform overview · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadStats}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition disabled:opacity-50 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => onNavigate("questions")}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Question Bank
            </button>
            <button
              onClick={() => onNavigate("analytics")}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition"
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </button>
          </div>
        </div>

        {/* Inline pulse indicators */}
        {!loading && kpis.newSignups24h > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {kpis.newSignups24h} new student{kpis.newSignups24h !== 1 ? "s" : ""} in last 24h
            </div>
            {kpis.pendingReviews > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {kpis.pendingReviews} review{kpis.pendingReviews !== 1 ? "s" : ""} awaiting moderation
              </div>
            )}
            {kpis.availableCodes < 5 && kpis.availableCodes >= 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                Low code stock: {kpis.availableCodes} unused codes remaining
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Primary KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={<Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />}
          label="Total Students"
          value={kpis.totalUsers}
          sub={`+${kpis.newSignups7d || 0} this week`}
          subColor="text-emerald-400"
          loading={loading}
          onClick={() => onNavigate("users")}
        />
        <KpiCard
          icon={<Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />}
          label="Premium Users"
          value={kpis.premiumUsers}
          sub={`${kpis.premiumConversionRate || 0}% conversion rate`}
          subColor="text-amber-400"
          valueColor="text-amber-400"
          loading={loading}
          onClick={() => onNavigate("premium")}
        />
        <KpiCard
          icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />}
          label="Total Attempts"
          value={kpis.totalActivityAttempts}
          sub={`${(kpis.totalExamAttempts || 0).toLocaleString()} exams · ${(kpis.totalTestAttempts || 0).toLocaleString()} practice`}
          loading={loading}
          onClick={() => onNavigate("analytics")}
        />
        <KpiCard
          icon={<HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />}
          label="Questions in Bank"
          value={kpis.totalQuestions}
          sub="Across all universities"
          loading={loading}
          onClick={() => onNavigate("questions")}
          valueColor="text-purple-400"
        />
      </div>

      {/* ── Secondary KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          icon={<Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />}
          label="Referral Signups"
          value={kpis.totalReferrals}
          sub={`${kpis.referralConversionRate || 0}% validated`}
          subColor="text-cyan-400"
          valueColor="text-cyan-400"
          loading={loading}
          onClick={() => onNavigate("referrals")}
        />
        <KpiCard
          icon={<Package className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
          label="Available Codes"
          value={kpis.availableCodes}
          sub={`${kpis.redeemedCodes || 0} redeemed · ${kpis.codeRedemptionRate || 0}% redemption`}
          loading={loading}
          onClick={() => onNavigate("premium")}
          valueColor={kpis.availableCodes < 5 ? "text-rose-400" : "text-emerald-400"}
        />
        <KpiCard
          icon={<Bell className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />}
          label="Push Subscribers"
          value={kpis.totalPushSubs}
          sub={`${kpis.onboardingReminders || 0} onboarding reminders sent`}
          loading={loading}
          onClick={() => onNavigate("notifications")}
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />}
          label="Pending Moderation"
          value={kpis.pendingReviews}
          sub="Reviews awaiting approval"
          loading={loading}
          onClick={() => onNavigate("reviews")}
          valueColor={kpis.pendingReviews > 0 ? "text-orange-400" : "text-emerald-400"}
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Signups Feed */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              Recent Student Signups
            </h2>
            <button
              onClick={() => onNavigate("users")}
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
            <div className="divide-y divide-slate-800/60">
              {recentSignups.map((s) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-800/30 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-indigo-400">
                        {(s.full_name || s.user_name || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{s.full_name || s.user_name || "Unknown"}</div>
                      <div className="text-[10px] text-indigo-300 truncate">{s.university || "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {s.is_premium && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded text-[9px] font-bold">
                        <Crown className="w-2.5 h-2.5" /> PRO
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">
                      {timeAgo(s.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform Health Sidebar */}
        <div className="space-y-4">
          {/* Onboarding Health */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Onboarding Health
            </h2>
            <HealthRow label="30-Day Signups" value={`+${kpis.newSignups30d || 0}`} color="text-emerald-400" loading={loading} />
            <HealthRow label="7-Day Signups" value={`+${kpis.newSignups7d || 0}`} color="text-emerald-400" loading={loading} />
            <HealthRow label="24h Signups" value={`+${kpis.newSignups24h || 0}`} color="text-cyan-400" loading={loading} />
            <HealthRow label="Incomplete Onboarding" value={kpis.incompleteOnboarding || 0} color={kpis.incompleteOnboarding > 0 ? "text-amber-400" : "text-slate-500"} loading={loading} />
            <HealthRow label="Reminders Sent" value={kpis.onboardingReminders || 0} color="text-purple-400" loading={loading} />
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => onNavigate("notifications")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                View Onboarding Details <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Match Activity */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Activity Breakdown
            </h2>
            <HealthRow label="Exam Attempts" value={(kpis.totalExamAttempts || 0).toLocaleString()} color="text-blue-400" loading={loading} />
            <HealthRow label="Practice Attempts" value={(kpis.totalTestAttempts || 0).toLocaleString()} color="text-indigo-400" loading={loading} />
            <HealthRow label="Match Attempts" value={(kpis.totalMatchAttempts || 0).toLocaleString()} color="text-purple-400" loading={loading} />
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => onNavigate("analytics")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                Full Analytics <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid: Moderation + Universities + Audit + Quick Actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Needs Attention Queue */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg">
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
              onClick={() => onNavigate("reviews")}
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
                <div key={rev.id} className="px-5 py-3 flex items-start justify-between gap-3 hover:bg-slate-800/30 transition">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200">{rev.user_name || "Anonymous"}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 italic mt-0.5">"{rev.review_text}"</div>
                    <div className="text-[10px] text-indigo-400 mt-0.5">{rev.university}</div>
                  </div>
                  <button
                    onClick={() => onNavigate("reviews")}
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

        {/* University Semesters */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-400" />
              Active Semesters
            </h2>
            <button
              onClick={() => onNavigate("universities")}
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
                <div key={uni.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-800/30 transition">
                  <div>
                    <div className="text-xs font-bold text-white">{uni.name || uni.id}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Controls course visibility app-wide</div>
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
      </div>

      {/* ── Recent Admin Activity + Quick Actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Recent Audit Log */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Recent Admin Actions
            </h2>
            <button
              onClick={() => onNavigate("audit")}
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
                <div key={log.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded uppercase">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">{log.admin_email}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{log.target_type}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">{timeAgo(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Add Questions",      icon: HelpCircle,   tab: "questions",      color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20" },
              { label: "Grant Premium",      icon: Crown,        tab: "premium",        color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" },
              { label: "Moderate Reviews",   icon: FileText,     tab: "reviews",        color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20" },
              { label: "Push Notification",  icon: Bell,         tab: "notifications",  color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20" },
              { label: "View Referrals",     icon: Share2,       tab: "referrals",      color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20" },
              { label: "Manage Users",       icon: Users,        tab: "users",          color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
              { label: "Leaderboard",        icon: BarChart3,    tab: "leaderboard",    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20" },
              { label: "Audit Trail",        icon: Shield,       tab: "audit",          color: "text-slate-400",   bg: "bg-slate-700/50 border-slate-700 hover:bg-slate-700" },
            ].map(({ label, icon: Icon, tab, color, bg }) => (
              <button
                key={tab}
                onClick={() => onNavigate(tab)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition ${bg} ${color}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function KpiCard({ icon, label, value, sub, subColor = "text-slate-400", valueColor = "text-white", loading, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-900/80 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-lg hover:border-slate-700 hover:bg-slate-900 transition group space-y-2"
    >
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        <div className="group-hover:scale-110 transition">{icon}</div>
      </div>
      <div className={`text-xl sm:text-2xl font-black ${valueColor}`}>
        {loading ? <span className="text-slate-600">—</span> : (value ?? 0).toLocaleString()}
      </div>
      <div className={`text-[10px] sm:text-[11px] font-semibold ${subColor} leading-tight`}>{sub}</div>
    </button>
  );
}

function HealthRow({ label, value, color, loading }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-xs">{label}</span>
      <span className={`text-sm font-bold ${color}`}>
        {loading ? "—" : value}
      </span>
    </div>
  );
}

function LoadingRows({ count = 3 }) {
  return (
    <div className="divide-y divide-slate-800/60">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
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
