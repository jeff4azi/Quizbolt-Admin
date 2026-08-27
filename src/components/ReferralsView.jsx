import React, { useState, useEffect } from "react";
import {
  Share2, Users, CheckCircle, Clock, Crown, TrendingUp,
  RefreshCw, Award, UserCheck, BarChart3
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function ReferralsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/admin/referrals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Error fetching referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const kpis = data?.kpis || {};
  const leaderboard = data?.leaderboard || [];
  const referrals = data?.referrals || [];

  const medals = ["🥇", "🥈", "🥉"];

  const rateColor = (rate) => {
    if (rate >= 80) return "text-emerald-400";
    if (rate >= 50) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            Referrals &amp; Growth
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Track referral signups, top referrers, validation rates, and programme growth.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Users className="w-5 h-5 text-indigo-400" />}
          label="Total Referral Signups"
          value={kpis.totalReferrals}
          sub={`${kpis.last30d || 0} in the last 30 days`}
          loading={loading}
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

      {/* Conversion Overview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Programme Overview</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <div className={`text-3xl font-black ${rateColor(kpis.overallConversionRate || 0)}`}>
              {loading ? "—" : `${kpis.overallConversionRate || 0}%`}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-semibold">Overall Conversion Rate</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Validated ÷ Total Signups</div>
          </div>
          <div className="text-center p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <div className="text-3xl font-black text-cyan-400">{loading ? "—" : kpis.last7d || 0}</div>
            <div className="text-xs text-slate-400 mt-1 font-semibold">New Referrals (7 days)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Recent programme activity</div>
          </div>
          <div className="text-center p-4 bg-slate-800/60 rounded-xl border border-slate-700/50">
            <div className="text-3xl font-black text-blue-400">{loading ? "—" : kpis.last30d || 0}</div>
            <div className="text-xs text-slate-400 mt-1 font-semibold">New Referrals (30 days)</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Monthly growth indicator</div>
          </div>
        </div>
      </div>

      {/* Top Referrers Leaderboard */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-800 flex items-center gap-2 flex-wrap">
          <Award className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-white">Top Referrers Leaderboard</span>
          <span className="ml-auto text-[10px] text-slate-500 font-semibold">Top 20 by validated referrals</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading leaderboard…
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">No referrers yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800 bg-slate-800/30">
                  <th className="px-4 sm:px-5 py-3">#</th>
                  <th className="px-4 sm:px-5 py-3">Referrer</th>
                  <th className="px-4 sm:px-5 py-3 hidden sm:table-cell">University</th>
                  <th className="px-4 sm:px-5 py-3">Total</th>
                  <th className="px-4 sm:px-5 py-3">Validated</th>
                  <th className="px-4 sm:px-5 py-3 hidden sm:table-cell">Pending</th>
                  <th className="px-4 sm:px-5 py-3">Rate</th>
                  <th className="px-4 sm:px-5 py-3 hidden md:table-cell">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr key={entry.referrer_id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
                    <td className="px-4 sm:px-5 py-3.5 font-bold text-slate-300">
                      {idx < 3 ? (
                        <span className="text-base">{medals[idx]}</span>
                      ) : (
                        <span className="text-slate-500">{idx + 1}</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="font-bold text-white">
                        {entry.profile?.full_name || entry.profile?.user_name || "Unknown"}
                      </div>
                      {entry.profile?.referral_code && (
                        <div className="font-mono text-[10px] text-amber-400 mt-0.5">{entry.profile.referral_code}</div>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-indigo-300 hidden sm:table-cell">
                      {entry.profile?.university || "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 font-bold text-slate-200">{entry.total_referrals}</td>
                    <td className="px-4 sm:px-5 py-3.5 font-bold text-emerald-400">{entry.validated_referrals}</td>
                    <td className="px-4 sm:px-5 py-3.5 text-amber-400 hidden sm:table-cell">{entry.pending_referrals}</td>
                    <td className={`px-4 sm:px-5 py-3.5 font-black ${rateColor(entry.conversion_rate)}`}>
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

      {/* Full Referral Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
        <div className="px-4 sm:px-5 py-4 border-b border-slate-800 flex items-center gap-2 flex-wrap">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-white">Referral Feed</span>
          <span className="ml-auto text-[10px] text-slate-500 font-semibold">{referrals.length} records</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs">Loading referral records…</div>
          ) : referrals.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs">No referral conversions recorded yet.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-500 uppercase border-b border-slate-800 bg-slate-800/30">
                  <th className="px-4 sm:px-5 py-3">Referred User</th>
                  <th className="px-4 sm:px-5 py-3 hidden sm:table-cell">University</th>
                  <th className="px-4 sm:px-5 py-3">Referred By</th>
                  <th className="px-4 sm:px-5 py-3 hidden sm:table-cell">Date Joined</th>
                  <th className="px-4 sm:px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="font-bold text-white">
                        {r.referred?.full_name || r.referred?.user_name || "Unknown User"}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 sm:hidden">
                        {r.referred?.university || "—"} · {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-indigo-300 hidden sm:table-cell">
                      {r.referred?.university || "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="font-semibold text-slate-200">
                        {r.referrer?.full_name || r.referrer?.user_name || "Unknown"}
                      </div>
                      {r.referrer?.referral_code && (
                        <div className="font-mono text-[10px] text-amber-400 mt-0.5">{r.referrer.referral_code}</div>
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

function KpiCard({ icon, label, value, sub, loading, color = "indigo" }) {
  const colorMap = {
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    purple: "text-purple-400",
  };
  return (
    <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-1.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl sm:text-3xl font-black ${colorMap[color]}`}>
        {loading ? "—" : (value ?? 0).toLocaleString()}
      </div>
      <p className="text-[10px] text-slate-500">{sub}</p>
    </div>
  );
}
