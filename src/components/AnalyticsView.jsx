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
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import { useUniversities } from "../hooks/useUniversitiesAndColleges";

const TREND_RANGES = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

// ---- Lightweight, dependency-free SVG charts -------------------------------

function MiniBarChart({ data, valueKey, color = "#818cf8", height = 140 }) {
  const values = data.map((d) => d[valueKey]);
  const max = Math.max(1, ...values);
  const width = 100; // percentage-based viewBox, scales via container width
  const barGap = 0.4;
  const barWidth = data.length > 0 ? width / data.length - barGap : 0;

  // Show at most ~6 x-axis labels regardless of range length
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        {data.map((d, i) => {
          const barHeight = (d[valueKey] / max) * (height - 20);
          const x = i * (barWidth + barGap);
          const y = height - 20 - barHeight;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(barWidth, 0.2)}
              height={Math.max(barHeight, 0)}
              fill={color}
              rx="0.6"
              opacity={0.9}
            >
              <title>{`${d.date}: ${d[valueKey]}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-[9px] text-slate-500 mt-1 px-0.5">
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <span key={i} style={{ flex: 1, textAlign: "center" }}>
              {new Date(d.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

function MiniDualLineChart({
  data,
  seriesA,
  seriesB,
  colorA = "#818cf8",
  colorB = "#c084fc",
  height = 140,
}) {
  const width = 100;
  const allValues = data.flatMap((d) => [d[seriesA], d[seriesB]]);
  const max = Math.max(1, ...allValues);
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  const toPoints = (key) =>
    data
      .map((d, i) => {
        const x = i * stepX;
        const y = height - 20 - (d[key] / max) * (height - 20);
        return `${x},${y}`;
      })
      .join(" ");

  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
      >
        <polyline
          points={toPoints(seriesA)}
          fill="none"
          stroke={colorA}
          strokeWidth="0.7"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={toPoints(seriesB)}
          fill="none"
          stroke={colorB}
          strokeWidth="0.7"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="2,1.2"
        />
      </svg>
      <div className="flex justify-between text-[9px] text-slate-500 mt-1 px-0.5">
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <span key={i} style={{ flex: 1, textAlign: "center" }}>
              {new Date(d.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

// ---- Small presentational pieces -------------------------------------------

function KpiCard({ icon: Icon, label, value, sub, accent = "text-white" }) {
  return (
    <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          {label}
        </div>
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-600" />}
      </div>
      <div className={`text-2xl font-black mt-1 ${accent}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [universityFilter, setUniversityFilter] = useState("");
  const [trendDays, setTrendDays] = useState(30);
  const { universities } = useUniversities();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const headers = { Authorization: `Bearer ${token}` };

      const reportParams = new URLSearchParams();
      if (universityFilter) reportParams.append("university", universityFilter);

      const overviewParams = new URLSearchParams();
      if (universityFilter)
        overviewParams.append("university", universityFilter);
      overviewParams.append("days", String(trendDays));

      const [reportRes, overviewRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/analytics?${reportParams}`, {
          headers,
        }),
        fetch(
          `${API_BASE_URL}/api/admin/analytics/overview?${overviewParams}`,
          { headers },
        ),
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
  }, [universityFilter, trendDays]);

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
    a.download = `quizbolt-university-analytics-${Date.now()}.csv`;
    a.click();
  };

  const maxLevelCount = useMemo(() => {
    const counts = (overview?.levelDistribution || []).map((l) => l.count);
    return Math.max(1, ...counts);
  }, [overview]);

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            Analytics & Telemetry
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Aggregated server-side across every row in the database — nothing
            here is capped by API row limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-400 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={!data || !data.courseStatsList}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-400" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-indigo-400" /> University:
          </span>
          <select
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
            className="px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-400" /> Trend window:
          </span>
          <div className="flex rounded-xl overflow-hidden border border-slate-700">
            {TREND_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setTrendDays(r.value)}
                className={`px-3 py-2 font-bold transition ${
                  trendDays === r.value
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          Aggregating all database records...
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              icon={Users}
              label="Total Users"
              value={(overview?.totalUsers || 0).toLocaleString()}
            />
            <KpiCard
              icon={Crown}
              label="Premium Users"
              value={`${(overview?.premiumUsers || 0).toLocaleString()}`}
              sub={`${overview?.premiumRate ?? 0}% of users`}
              accent="text-amber-400"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Onboarding Complete"
              value={`${overview?.onboardingRate ?? 0}%`}
              sub={`${(overview?.onboardedUsers || 0).toLocaleString()} users`}
              accent="text-emerald-400"
            />
            <KpiCard
              icon={Target}
              label="Overall Avg Score"
              value={`${overview?.overallAvgScore ?? 0}%`}
              accent="text-indigo-400"
            />
            <KpiCard
              icon={BarChart3}
              label="Exam Attempts"
              value={(data?.totalExamAttempts || 0).toLocaleString()}
            />
            <KpiCard
              icon={TrendingUp}
              label="Practice Attempts"
              value={(data?.totalTestAttempts || 0).toLocaleString()}
              accent="text-purple-400"
            />
            <KpiCard
              icon={Flame}
              label="7+ Day Streaks"
              value={(overview?.activeStreakUsers || 0).toLocaleString()}
              sub={`avg streak: ${overview?.avgCurrentStreak ?? 0} days`}
              accent="text-orange-400"
            />
            <KpiCard
              icon={Share2}
              label="Referrals"
              value={(overview?.totalReferrals || 0).toLocaleString()}
              sub={`${(overview?.validatedReferrals || 0).toLocaleString()} validated`}
              accent="text-sky-400"
            />
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 sm:p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" /> New Signups (
                {trendDays}D)
              </div>
              {overview?.signupsTrend?.length ? (
                <MiniBarChart
                  data={overview.signupsTrend}
                  valueKey="count"
                  color="#818cf8"
                />
              ) : (
                <div className="text-center text-slate-500 text-xs py-8">
                  No signup data for this range.
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />{" "}
                  Attempts Over Time ({trendDays}D)
                </span>
                <span className="flex items-center gap-3 text-[10px] font-semibold normal-case">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <span className="w-2 h-0.5 bg-indigo-400 inline-block" />{" "}
                    Exam
                  </span>
                  <span className="flex items-center gap-1 text-purple-300">
                    <span
                      className="w-2 h-0.5 bg-purple-400 inline-block"
                      style={{ borderTop: "1px dashed" }}
                    />{" "}
                    Practice
                  </span>
                </span>
              </div>
              {overview?.attemptsTrend?.length ? (
                <MiniDualLineChart
                  data={overview.attemptsTrend}
                  seriesA="exam_count"
                  seriesB="test_count"
                />
              ) : (
                <div className="text-center text-slate-500 text-xs py-8">
                  No attempt data for this range.
                </div>
              )}
            </div>
          </div>

          {/* Level Distribution + University Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 sm:p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Level
                Distribution
              </div>
              {overview?.levelDistribution?.length ? (
                <div className="space-y-2.5">
                  {overview.levelDistribution.map((l) => (
                    <div
                      key={l.year}
                      className="flex items-center gap-3 text-xs"
                    >
                      <span className="w-16 shrink-0 font-semibold text-slate-400">
                        {l.label}
                      </span>
                      <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                          style={{
                            width: `${(l.count / maxLevelCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right font-bold text-white">
                        {l.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs py-8">
                  No level data available.
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <div className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" /> University
                Breakdown
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
                      <tr className="text-slate-500 uppercase font-semibold">
                        <th className="py-1.5 px-1">University</th>
                        <th className="py-1.5 px-1">Users</th>
                        <th className="py-1.5 px-1">Premium</th>
                        <th className="py-1.5 px-1">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {overview.universityBreakdown.map((u, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-1 font-bold text-indigo-300">
                            {u.university}
                          </td>
                          <td className="py-2 px-1 font-semibold text-slate-200">
                            {u.users.toLocaleString()}
                          </td>
                          <td className="py-2 px-1 text-amber-400 font-medium">
                            {u.premium_rate}%
                          </td>
                          <td className="py-2 px-1 font-bold text-emerald-400">
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

          {/* Course Attempt Telemetry */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl p-4 sm:p-6 space-y-4">
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
                    <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <th className="py-3 px-4">University</th>
                      <th className="py-3 px-4">Course Code</th>
                      <th className="py-3 px-4">Total Attempts</th>
                      <th className="py-3 px-4">Retake Count</th>
                      <th className="py-3 px-4">Average Score %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.courseStatsList.map((item, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-800/40 transition"
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
