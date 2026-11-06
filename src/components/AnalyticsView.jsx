import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Download,
  RefreshCw,
  Filter,
  GraduationCap,
  Users,
  Crown,
  Flame,
  Share2,
  Target,
  CheckCircle2,
  TrendingUp,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import { useUniversities } from "../hooks/useUniversitiesAndColleges";

// Single set of date presets used by the whole page
const DATE_PRESETS = [
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom" },
];

/** Convert a preset key to { from_date, to_date } ISO strings (or null). */
function presetToDates(preset) {
  const today = new Date();
  const iso = (d) => d.toISOString().split("T")[0];
  if (preset === "7d")
    return {
      from_date: iso(new Date(today - 7 * 86400000)),
      to_date: iso(today),
    };
  if (preset === "30d")
    return {
      from_date: iso(new Date(today - 30 * 86400000)),
      to_date: iso(today),
    };
  if (preset === "90d")
    return {
      from_date: iso(new Date(today - 90 * 86400000)),
      to_date: iso(today),
    };
  return { from_date: null, to_date: null }; // "all" or "custom"
}

// Shared tooltip style
const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 8,
    fontSize: 11,
    color: "#e2e8f0",
  },
  cursor: { stroke: "#1e293b" },
};

// X-axis date formatter
const xDateFormatter = (v) =>
  new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  valueColor = "text-white",
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <div className={`text-2xl sm:text-3xl font-black mt-1 ${valueColor}`}>
            {value}
          </div>
          {sub && (
            <p className="text-[11px] text-slate-500 mt-1 leading-tight">
              {sub}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className={`p-2.5 rounded-xl shrink-0 ${iconBg || "bg-slate-800"}`}
          >
            <Icon className={`w-5 h-5 ${iconColor || "text-slate-400"}`} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const { universities } = useUniversities();

  // ── Unified filter state ─────────────────────────────────────────────────
  const [universityFilter, setUniversityFilter] = useState("");
  const [datePreset, setDatePreset] = useState("30d");

  // Draft inputs for custom — changing these does NOT trigger a fetch
  const [draftFrom, setDraftFrom] = useState(
    () => localStorage.getItem("analytics_custom_from") || "",
  );
  const [draftTo, setDraftTo] = useState(
    () => localStorage.getItem("analytics_custom_to") || "",
  );

  // Committed custom dates — updated only on "Apply", triggers fetch
  const [customFrom, setCustomFrom] = useState(
    () => localStorage.getItem("analytics_custom_from") || "",
  );
  const [customTo, setCustomTo] = useState(
    () => localStorage.getItem("analytics_custom_to") || "",
  );

  /** The resolved date window sent to both API endpoints */
  const activeDates = useMemo(() => {
    if (datePreset === "custom") {
      return { from_date: customFrom || null, to_date: customTo || null };
    }
    return presetToDates(datePreset);
  }, [datePreset, customFrom, customTo]);

  const applyCustomDates = () => {
    if (draftFrom) localStorage.setItem("analytics_custom_from", draftFrom);
    else localStorage.removeItem("analytics_custom_from");
    if (draftTo) localStorage.setItem("analytics_custom_to", draftTo);
    else localStorage.removeItem("analytics_custom_to");
    setCustomFrom(draftFrom);
    setCustomTo(draftTo);
  };

  const clearCustomDates = () => {
    localStorage.removeItem("analytics_custom_from");
    localStorage.removeItem("analytics_custom_to");
    setDraftFrom("");
    setDraftTo("");
    setCustomFrom("");
    setCustomTo("");
  };

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const headers = { Authorization: `Bearer ${token}` };

      const sharedParams = new URLSearchParams();
      if (universityFilter) sharedParams.append("university", universityFilter);
      if (activeDates.from_date)
        sharedParams.append("from_date", activeDates.from_date);
      if (activeDates.to_date)
        sharedParams.append("to_date", activeDates.to_date);

      const [reportRes, overviewRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/analytics?${sharedParams}`, {
          headers,
        }),
        fetch(`${API_BASE_URL}/api/admin/analytics/overview?${sharedParams}`, {
          headers,
        }),
      ]);

      if (reportRes.ok) setData(await reportRes.json());
      if (overviewRes.ok) setOverview(await overviewRes.json());
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [universityFilter, activeDates]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const exportCsv = () => {
    if (!data?.courseStatsList) return;
    let csv = "University,Course Code,Attempts,Retakes,Avg Score %\n";
    data.courseStatsList.forEach((item) => {
      csv += `"${item.university}","${item.course_code}",${item.attempts},${item.retakes},${item.avg_score}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quizbolt-analytics-${Date.now()}.csv`;
    a.click();
  };

  const maxLevelCount = useMemo(() => {
    const counts = (overview?.levelDistribution || []).map((l) => l.count);
    return Math.max(1, ...counts);
  }, [overview]);

  const totalLevelCount = useMemo(() => {
    return (
      (overview?.levelDistribution || []).reduce(
        (acc, l) => acc + l.count,
        0,
      ) || 1
    );
  }, [overview]);

  /** Human-readable label for the active date window */
  const activeDateLabel = useMemo(() => {
    if (datePreset === "all") return "All Time";
    if (datePreset === "7d") return "Last 7 Days";
    if (datePreset === "30d") return "Last 30 Days";
    if (datePreset === "90d") return "Last 90 Days";
    if (datePreset === "custom") {
      if (customFrom || customTo)
        return `${customFrom || "start"} → ${customTo || "today"}`;
      return "Custom (not applied)";
    }
    return "";
  }, [datePreset, customFrom, customTo]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-1 self-stretch rounded-full bg-indigo-500 shrink-0" />
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Analytics &amp; Telemetry
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Aggregated server-side across every row in the database — nothing
              here is capped by API row limits.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-400 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={!data?.courseStatsList}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Unified Filter Bar ── */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* University picker */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">University:</span>
            </span>
            <select
              value={universityFilter}
              onChange={(e) => setUniversityFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            >
              <option value="">All Universities</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.id}
                </option>
              ))}
            </select>
          </div>

          {/* Date preset buttons */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Period:</span>
            </span>
            <div className="flex rounded-xl overflow-hidden border border-slate-700">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setDatePreset(p.key)}
                  className={`px-2.5 py-1.5 font-bold transition text-xs ${
                    datePreset === p.key
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom date pickers */}
        {datePreset === "custom" && (
          <div className="flex flex-wrap items-center gap-2.5 p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
            <span className="text-slate-400 font-semibold">From:</span>
            <input
              type="date"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
            <span className="text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(e) => setDraftTo(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
            <button
              onClick={applyCustomDates}
              disabled={!draftFrom && !draftTo}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold transition text-xs"
            >
              Apply
            </button>
            {(draftFrom || draftTo || customFrom || customTo) && (
              <button
                onClick={clearCustomDates}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold transition text-xs"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Active filter summary */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="font-semibold text-slate-400">Viewing:</span>
          <span className="px-2 py-0.5 bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 rounded-full font-bold">
            {universityFilter
              ? universities.find((u) => u.id === universityFilter)?.name ||
                universityFilter
              : "All Universities"}
          </span>
          <span className="text-slate-600">·</span>
          <span className="px-2 py-0.5 bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 rounded-full font-bold">
            {activeDateLabel}
          </span>
          {datePreset === "custom" && !customFrom && !customTo && (
            <span className="text-amber-500 font-semibold">
              — set a range and click Apply
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          Aggregating all database records...
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── KPI Overview Grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <KpiCard
              icon={Users}
              iconBg="bg-slate-800"
              iconColor="text-slate-400"
              label="Total Users"
              value={(overview?.totalUsers || 0).toLocaleString()}
            />
            <KpiCard
              icon={Crown}
              iconBg="bg-amber-500/15"
              iconColor="text-amber-400"
              label="Premium Users"
              value={(overview?.premiumUsers || 0).toLocaleString()}
              sub={`${overview?.premiumRate ?? 0}% of users`}
              valueColor="text-amber-400"
            />
            <KpiCard
              icon={CheckCircle2}
              iconBg="bg-emerald-500/15"
              iconColor="text-emerald-400"
              label="Onboarding Complete"
              value={`${overview?.onboardingRate ?? 0}%`}
              sub={`${(overview?.onboardedUsers || 0).toLocaleString()} users`}
              valueColor="text-emerald-400"
            />
            <KpiCard
              icon={Target}
              iconBg="bg-indigo-500/15"
              iconColor="text-indigo-400"
              label="Overall Avg Score"
              value={`${overview?.overallAvgScore ?? 0}%`}
              valueColor="text-indigo-400"
            />
            <KpiCard
              icon={BarChart3}
              iconBg="bg-blue-500/15"
              iconColor="text-blue-400"
              label="Exam Attempts"
              value={(data?.totalExamAttempts || 0).toLocaleString()}
            />
            <KpiCard
              icon={TrendingUp}
              iconBg="bg-purple-500/15"
              iconColor="text-purple-400"
              label="Practice Attempts"
              value={(data?.totalTestAttempts || 0).toLocaleString()}
              valueColor="text-purple-400"
            />
            <KpiCard
              icon={Flame}
              iconBg="bg-orange-500/15"
              iconColor="text-orange-400"
              label="7+ Day Streaks"
              value={(overview?.activeStreakUsers || 0).toLocaleString()}
              sub={`avg streak: ${overview?.avgCurrentStreak ?? 0} days`}
              valueColor="text-orange-400"
            />
            <KpiCard
              icon={Share2}
              iconBg="bg-sky-500/15"
              iconColor="text-sky-400"
              label="Referrals"
              value={(overview?.totalReferrals || 0).toLocaleString()}
              sub={`${(overview?.validatedReferrals || 0).toLocaleString()} validated`}
              valueColor="text-sky-400"
            />
          </div>

          {/* ── Trend Charts ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Signups Trend — BarChart */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-xs font-bold text-slate-300 mb-4 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                New Signups ({activeDateLabel})
              </div>
              {overview?.signupsTrend?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={overview.signupsTrend}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
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
                      tickFormatter={xDateFormatter}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      labelFormatter={xDateFormatter}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No signup data for this range.
                </div>
              )}
            </div>

            {/* Attempts Trend — LineChart */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-xs font-bold text-slate-300 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  Attempts Over Time ({activeDateLabel})
                </span>
                <span className="flex items-center gap-3 text-[10px] font-semibold normal-case">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <span className="w-2 h-0.5 bg-indigo-400 inline-block rounded" />
                    Exam
                  </span>
                  <span className="flex items-center gap-1 text-purple-300">
                    <span
                      className="w-2 h-0.5 bg-purple-400 inline-block rounded"
                      style={{ borderTop: "1px dashed" }}
                    />
                    Practice
                  </span>
                </span>
              </div>
              {overview?.attemptsTrend?.length ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={overview.attemptsTrend}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
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
                      tickFormatter={xDateFormatter}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...TOOLTIP_STYLE}
                      labelFormatter={xDateFormatter}
                    />
                    <Line
                      type="monotone"
                      dataKey="exam_count"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      name="Exam"
                    />
                    <Line
                      type="monotone"
                      dataKey="test_count"
                      stroke="#c084fc"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={false}
                      activeDot={{ r: 4 }}
                      name="Practice"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  No attempt data for this range.
                </div>
              )}
            </div>
          </div>

          {/* ── Level Distribution + University Breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Level Distribution */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-xs font-bold text-slate-300 mb-4 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                Level Distribution
              </div>
              {overview?.levelDistribution?.length ? (
                <div className="space-y-3">
                  {overview.levelDistribution.map((l) => {
                    const pct = Math.round((l.count / totalLevelCount) * 100);
                    return (
                      <div
                        key={l.year}
                        className="flex items-center gap-3 text-xs"
                      >
                        <span className="w-16 shrink-0 font-semibold text-slate-400">
                          {l.label}
                        </span>
                        <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${(l.count / maxLevelCount) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-20 text-right font-bold text-white">
                          {l.count.toLocaleString()}{" "}
                          <span className="text-slate-500 font-normal">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs py-8">
                  No level data available.
                </div>
              )}
            </div>

            {/* University Breakdown */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-xs font-bold text-slate-300 mb-4 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                University Breakdown
              </div>
              {universityFilter ? (
                <div className="text-center text-slate-500 text-xs py-8">
                  Clear the university filter above to compare across all
                  institutions.
                </div>
              ) : overview?.universityBreakdown?.length ? (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-500 uppercase font-semibold text-[10px]">
                        <th className="py-2 px-2">University</th>
                        <th className="py-2 px-2">Users</th>
                        <th className="py-2 px-2">Premium</th>
                        <th className="py-2 px-2">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.universityBreakdown.map((u, idx) => (
                        <tr
                          key={idx}
                          className={`${idx % 2 === 0 ? "" : "bg-slate-800/20"} hover:bg-slate-800/40 transition`}
                        >
                          <td className="py-2.5 px-2 font-bold text-indigo-300">
                            {u.university}
                          </td>
                          <td className="py-2.5 px-2 font-semibold text-slate-200">
                            {u.users.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-amber-400 font-medium">
                            {u.premium_rate}%
                          </td>
                          <td className="py-2.5 px-2 font-bold text-emerald-400">
                            {u.avg_score}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs py-8">
                  No university data available.
                </div>
              )}
            </div>
          </div>

          {/* ── Course Attempt Telemetry ── */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              Course Attempt Telemetry (Grouped by Institution)
            </h2>
            {!data?.courseStatsList || data.courseStatsList.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No attempt telemetry recorded for this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
                      <th className="py-3 px-4">University</th>
                      <th className="py-3 px-4">Course Code</th>
                      <th className="py-3 px-4">Total Attempts</th>
                      <th className="py-3 px-4">Retake Count</th>
                      <th className="py-3 px-4">Average Score %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.courseStatsList.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`${idx % 2 === 0 ? "" : "bg-slate-800/20"} hover:bg-slate-800/40 transition`}
                      >
                        <td className="py-3.5 px-4 font-bold text-indigo-300">
                          {item.university}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {item.course_code}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {item.attempts.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-purple-300 font-medium">
                          {item.retakes.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">
                          {item.avg_score}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
