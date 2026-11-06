import React, { useState, useEffect, useMemo } from "react";
import {
  Share2,
  Users,
  CheckCircle,
  Clock,
  Crown,
  TrendingUp,
  RefreshCw,
  Award,
  UserCheck,
  BarChart3,
  Calendar,
  TrendingDown,
  Filter,
  ArrowRight,
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

// ── Date preset helpers ─────────────────────────────────────────────────────
const DATE_PRESETS = [
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "all", label: "All Time" },
  { key: "custom", label: "Custom" },
];

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
  return { from_date: null, to_date: null };
}

// ── Custom tooltip for recharts ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs shadow-xl">
      <div className="font-bold text-slate-300 mb-1">
        {new Date(label).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: p.color }}
          />
          <span className="text-slate-400 capitalize">{p.name}:</span>
          <span className="font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReferralsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Date filter state ────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState("30d");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const activeDates = useMemo(() => {
    if (datePreset === "custom")
      return { from_date: customFrom || null, to_date: customTo || null };
    return presetToDates(datePreset);
  }, [datePreset, customFrom, customTo]);

  const applyCustomDates = () => {
    setCustomFrom(draftFrom);
    setCustomTo(draftTo);
  };

  const clearCustomDates = () => {
    setDraftFrom("");
    setDraftTo("");
    setCustomFrom("");
    setCustomTo("");
  };

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

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams();
      if (activeDates.from_date)
        params.append("from_date", activeDates.from_date);
      if (activeDates.to_date) params.append("to_date", activeDates.to_date);

      const res = await fetch(`${API_BASE_URL}/api/admin/referrals?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Error fetching referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeDates]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const kpis = data?.kpis || {};
  const leaderboard = data?.leaderboard || [];
  const referrals = data?.referrals || [];
  const trend = data?.trend || [];

  const medals = ["🥇", "🥈", "🥉"];

  const rateColor = (rate) => {
    if (rate >= 80) return "text-emerald-400";
    if (rate >= 50) return "text-amber-400";
    return "text-rose-400";
  };

  // Funnel percentages (guard div/0)
  const total = kpis.totalReferrals || 0;
  const validated = kpis.validatedReferrals || 0;
  const pending = kpis.pendingReferrals || 0;
  const funnelValidatedPct =
    total > 0 ? Math.round((validated / total) * 100) : 0;
  const funnelPendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <Share2 className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Referrals &amp; Growth
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Track referral signups, top referrers, validation rates, and
              programme growth.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-full text-[10px] font-bold">
            {activeDateLabel}
          </span>
          {!loading && (
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-full text-[10px] font-bold">
              {total.toLocaleString()} total referrals
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
        </div>
      </div>

      {/* ── Time Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5 shrink-0">
            <Calendar className="w-4 h-4 text-indigo-400" /> Period:
          </span>
          <div className="flex rounded-xl overflow-hidden border border-slate-700">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setDatePreset(p.key)}
                className={`px-3 py-2 font-bold transition text-xs ${
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

        {datePreset === "custom" && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
            <span className="text-slate-400 font-semibold">From:</span>
            <input
              type="date"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(e) => setDraftFrom(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(e) => setDraftTo(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={applyCustomDates}
              disabled={!draftFrom && !draftTo}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold transition"
            >
              Apply
            </button>
            {(draftFrom || draftTo || customFrom || customTo) && (
              <button
                onClick={clearCustomDates}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold transition"
              >
                Clear
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="font-semibold text-slate-400">Viewing:</span>
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

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="w-5 h-5 text-indigo-400" />}
          label="Total Referral Signups"
          value={kpis.totalReferrals}
          sub={`${kpis.last30d || 0} in the last 30 days`}
          loading={loading}
          color="indigo"
        />
        <KpiCard
          icon={<CheckCircle className="w-5 h-5 text-emerald-400" />}
          label="Validated & Rewarded"
          value={kpis.validatedReferrals}
          sub="Referrer earned premium reward"
          loading={loading}
          color="emerald"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          label="Pending Validation"
          value={kpis.pendingReferrals}
          sub="Awaiting first full exam (30 Qs)"
          loading={loading}
          color="amber"
        />
        <KpiCard
          icon={<UserCheck className="w-5 h-5 text-purple-400" />}
          label="Active Referrers"
          value={kpis.uniqueReferrers}
          sub={`Avg ${kpis.avgReferralsPerReferrer || 0} referrals each`}
          loading={loading}
          color="purple"
        />
      </div>

      {/* ── Trend Chart + Conversion Funnel (side by side on lg) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend Area Chart — takes 2/3 */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300">
                Referral Volume Over Time
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />{" "}
                Total
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{" "}
                Validated
              </span>
            </div>
          </div>

          {loading ? (
            <div className="h-44 flex items-center justify-center">
              <div className="space-y-2 w-full px-2 animate-pulse">
                {[70, 55, 80, 45, 90, 60, 75].map((w, i) => (
                  <div
                    key={i}
                    className="h-4 bg-slate-800 rounded"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            </div>
          ) : trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={176}>
              <AreaChart
                data={trend}
                margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="gradValidated"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  }
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradTotal)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#6366f1" }}
                />
                <Area
                  type="monotone"
                  dataKey="validated"
                  name="Validated"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gradValidated)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#10b981" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
              <TrendingDown className="w-8 h-8 text-slate-700" />
              <span>No trend data returned by API for this period.</span>
              <span className="text-[10px] text-slate-600">
                The backend can add a{" "}
                <code className="text-slate-500">trend</code> array to the
                response.
              </span>
            </div>
          )}
        </div>

        {/* Conversion Funnel — takes 1/3 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-300">
              Conversion Funnel
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center gap-3">
            {/* Signups */}
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/25 p-3.5">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">
                Signups via Referral
              </div>
              <div className="text-2xl font-black text-white">
                {loading ? "—" : total.toLocaleString()}
              </div>
              <div className="mt-1.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full w-full" />
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />
            </div>

            {/* Pending */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">
                Pending Validation
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black text-white">
                  {loading ? "—" : pending.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-amber-400">
                  {funnelPendingPct}%
                </div>
              </div>
              <div className="mt-1.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${funnelPendingPct}%` }}
                />
              </div>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />
            </div>

            {/* Validated */}
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3.5">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">
                Validated &amp; Rewarded
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-black text-white">
                  {loading ? "—" : validated.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-emerald-400">
                  {funnelValidatedPct}%
                </div>
              </div>
              <div className="mt-1.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${funnelValidatedPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Programme Overview stats ─────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Programme Overview
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <div
              className={`text-3xl font-black ${rateColor(kpis.overallConversionRate || 0)}`}
            >
              {loading ? "—" : `${kpis.overallConversionRate || 0}%`}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-semibold">
              Overall Conversion Rate
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Validated ÷ Total Signups
            </div>
          </div>
          <div className="text-center p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <div className="text-3xl font-black text-cyan-400">
              {loading ? "—" : kpis.last7d || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-semibold">
              New Referrals (7 days)
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Recent programme activity
            </div>
          </div>
          <div className="text-center p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <div className="text-3xl font-black text-blue-400">
              {loading ? "—" : kpis.last30d || 0}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-semibold">
              New Referrals (30 days)
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Monthly growth indicator
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Referrers Leaderboard ─────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-800 flex items-center gap-2 flex-wrap">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-white">
            Top Referrers Leaderboard
          </span>
          <span className="ml-auto text-[10px] text-slate-500 font-semibold">
            Top 20 by validated referrals
          </span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading leaderboard…
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">
              No referrers yet.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800 bg-slate-800/30">
                  <th className="px-4 sm:px-5 py-3">#</th>
                  <th className="px-4 sm:px-5 py-3">Referrer</th>
                  <th className="px-4 sm:px-5 py-3 hidden sm:table-cell">
                    University
                  </th>
                  <th className="px-4 sm:px-5 py-3">Total</th>
                  <th className="px-4 sm:px-5 py-3">Validated</th>
                  <th className="px-4 sm:px-5 py-3 hidden sm:table-cell">
                    Pending
                  </th>
                  <th className="px-4 sm:px-5 py-3">Rate</th>
                  <th className="px-4 sm:px-5 py-3 hidden md:table-cell">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr
                    key={entry.referrer_id}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30 transition"
                  >
                    <td className="px-4 sm:px-5 py-3.5 font-bold text-slate-300">
                      {idx < 3 ? (
                        <span className="text-base">{medals[idx]}</span>
                      ) : (
                        <span className="text-slate-500">{idx + 1}</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="font-bold text-white">
                        {entry.profile?.full_name ||
                          entry.profile?.user_name ||
                          "Unknown"}
                      </div>
                      {entry.profile?.referral_code && (
                        <div className="font-mono text-[10px] text-amber-400 mt-0.5">
                          {entry.profile.referral_code}
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-indigo-300 hidden sm:table-cell">
                      {entry.profile?.university || "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 font-bold text-slate-200">
                      {entry.total_referrals}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 font-bold text-emerald-400">
                      {entry.validated_referrals}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-amber-400 hidden sm:table-cell">
                      {entry.pending_referrals}
                    </td>
                    <td
                      className={`px-4 sm:px-5 py-3.5 font-black ${rateColor(entry.conversion_rate)}`}
                    >
                      {entry.conversion_rate}%
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 hidden md:table-cell">
                      {entry.profile?.is_premium ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-bold">
                          <Crown className="w-3 h-3" /> Premium
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">Free</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Full Referral Feed ───────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-800 flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-white">Referral Feed</span>
          <span className="ml-auto text-[10px] text-slate-500 font-semibold">
            {referrals.length} records
          </span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              Loading referral records…
            </div>
          ) : referrals.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">
              No referral conversions recorded yet.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800 bg-slate-800/30">
                  <th className="px-4 sm:px-5 py-3">Referred User</th>
                  <th className="px-4 sm:px-5 py-3 hidden sm:table-cell">
                    University
                  </th>
                  <th className="px-4 sm:px-5 py-3">Referred By</th>
                  <th className="px-4 sm:px-5 py-3 hidden sm:table-cell">
                    Date Joined
                  </th>
                  <th className="px-4 sm:px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30 transition"
                  >
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="font-bold text-white">
                        {r.referred?.full_name ||
                          r.referred?.user_name ||
                          "Unknown User"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 sm:hidden">
                        {r.referred?.university || "—"} ·{" "}
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-indigo-300 hidden sm:table-cell">
                      {r.referred?.university || "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="font-semibold text-slate-200">
                        {r.referrer?.full_name ||
                          r.referrer?.user_name ||
                          "Unknown"}
                      </div>
                      {r.referrer?.referral_code && (
                        <div className="font-mono text-[10px] text-amber-400 mt-0.5">
                          {r.referrer.referral_code}
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-slate-400 hidden sm:table-cell">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5">
                      {r.is_validated ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-bold">
                            <CheckCircle className="w-3 h-3" /> Validated
                          </span>
                          {r.validated_at && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {new Date(r.validated_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-bold">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── KpiCard ─────────────────────────────────────────────────────────────────
const colorBorderMap = {
  indigo: "border-indigo-500/30  bg-indigo-500/5",
  emerald: "border-emerald-500/30 bg-emerald-500/5",
  amber: "border-amber-500/30   bg-amber-500/5",
  purple: "border-purple-500/30  bg-purple-500/5",
};

const colorTextMap = {
  indigo: "text-indigo-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  purple: "text-purple-400",
};

function KpiCard({ icon, label, value, sub, loading, color = "indigo" }) {
  return (
    <div
      className={`border p-5 rounded-2xl shadow-xl space-y-1.5 ${colorBorderMap[color]}`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className={`text-2xl sm:text-3xl font-black ${colorTextMap[color]}`}>
        {loading ? "—" : (value ?? 0).toLocaleString()}
      </div>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}
