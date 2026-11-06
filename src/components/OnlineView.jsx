import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Wifi,
  Crown,
  GraduationCap,
  RefreshCw,
  Clock,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// ─── Helpers ────────────────────────────────────────────────────────────────

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getSecondsAgo = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  return Math.max(0, Math.floor(diff / 1000));
};

const formatSecondsAgo = (secs) => {
  if (secs < 60) return `${secs}s ago`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s ago`;
};

// Deterministic avatar colour from username / name
const AVATAR_COLOURS = [
  "bg-indigo-900 text-indigo-300 border-indigo-700",
  "bg-violet-900 text-violet-300 border-violet-700",
  "bg-cyan-900 text-cyan-300 border-cyan-700",
  "bg-emerald-900 text-emerald-300 border-emerald-700",
  "bg-amber-900 text-amber-300 border-amber-700",
  "bg-rose-900 text-rose-300 border-rose-700",
  "bg-sky-900 text-sky-300 border-sky-700",
];

const avatarColour = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
};

// ─── Skeleton Card ───────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-slate-800 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-slate-800 rounded w-3/4" />
        <div className="h-2.5 bg-slate-800 rounded w-1/2" />
      </div>
    </div>
    <div className="h-2.5 bg-slate-800 rounded w-full" />
    <div className="h-2.5 bg-slate-800 rounded w-2/3" />
  </div>
);

// ─── User Card ───────────────────────────────────────────────────────────────

const UserCard = ({ presence }) => {
  const profile = presence.profiles || {};
  const secsAgo = getSecondsAgo(presence.last_seen);
  const colourClass = avatarColour(
    profile.user_name || profile.full_name || presence.user_id,
  );

  return (
    <div
      className="relative bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-sm
      hover:border-slate-700 transition-colors duration-200
      before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:rounded-full
      before:bg-emerald-400 before:shadow-[0_0_8px_rgba(52,211,153,0.5)]"
    >
      {/* Avatar + Name row */}
      <div className="flex items-start gap-3">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || "avatar"}
            className="w-11 h-11 rounded-full object-cover border border-slate-700 shrink-0"
          />
        ) : (
          <div
            className={`w-11 h-11 rounded-full border flex items-center justify-center font-black text-sm shrink-0 ${colourClass}`}
          >
            {getInitials(profile.full_name)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-white text-sm truncate max-w-[160px]">
              {profile.full_name || "Unknown Scholar"}
            </span>
            {profile.is_premium && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <Crown className="w-2.5 h-2.5" />
                PRO
              </span>
            )}
          </div>
          {profile.user_name && (
            <p className="text-[11px] text-slate-400 font-mono">
              @{profile.user_name}
            </p>
          )}
        </div>
      </div>

      {/* University */}
      {profile.university && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">{profile.university}</span>
        </div>
      )}

      {/* Dept + Year */}
      {(profile.department || profile.year) && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="truncate">
            {[
              profile.college,
              profile.department,
              profile.year ? `Year ${profile.year}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      )}

      {/* Last seen */}
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-auto">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
        <Clock className="w-3 h-3 shrink-0" />
        <span>Last seen {formatSecondsAgo(secsAgo)}</span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnlineView() {
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOnline = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else if (presences.length === 0) setLoading(true);

    try {
      const threshold = new Date(Date.now() - 90_000).toISOString();
      const { data, error } = await supabase
        .from("user_presence")
        .select(
          "user_id, last_seen, profiles(full_name, user_name, university, college, department, year, avatar_url, is_premium)",
        )
        .gte("last_seen", threshold)
        .order("last_seen", { ascending: false });

      if (!error && data) {
        setPresences(data);
      }
    } catch (err) {
      console.error("Error fetching online scholars:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastRefreshed(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount + 15-second interval
  useEffect(() => {
    fetchOnline();
    const interval = setInterval(() => fetchOnline(), 15_000);
    return () => clearInterval(interval);
  }, [fetchOnline]);

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = presences.length;
    const premium = presences.filter((p) => p.profiles?.is_premium).length;

    const uniCounts = {};
    for (const p of presences) {
      const uni = p.profiles?.university;
      if (uni) uniCounts[uni] = (uniCounts[uni] || 0) + 1;
    }
    const topUni =
      Object.entries(uniCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return { total, premium, topUni };
  }, [presences]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <Wifi className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              {/* Pulse dot */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              Live Online Scholars
              {/* Count badge */}
              {!loading && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {stats.total} online
                </span>
              )}
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Updates every 15 seconds · Active within the last 90 seconds
            </p>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={() => fetchOnline(true)}
          disabled={refreshing}
          className="self-start sm:self-center flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing…" : "Refresh Now"}
        </button>
      </div>

      {/* ─── Stats Bar ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Online */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {loading ? "—" : stats.total}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Total Online
            </p>
          </div>
        </div>

        {/* Premium Online */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {loading ? "—" : stats.premium}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              PRO Subscribers
            </p>
          </div>
        </div>

        {/* Top University */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-black text-indigo-300 font-mono truncate">
              {loading ? "—" : stats.topUni}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Top University
            </p>
          </div>
        </div>
      </div>

      {/* ─── Last refreshed hint ──────────────────────────────────────────── */}
      {lastRefreshed && !loading && (
        <p className="text-[11px] text-slate-600 -mt-3">
          Last refreshed at {lastRefreshed.toLocaleTimeString()}
        </p>
      )}

      {/* ─── Grid / Skeletons / Empty ─────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : presences.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-full">
            <Wifi className="w-10 h-10 text-slate-700" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-slate-400 text-base">
              No scholars online right now
            </p>
            <p className="text-xs text-slate-600">
              Scholars who were active in the last 90 seconds will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presences.map((p) => (
            <UserCard key={p.user_id} presence={p} />
          ))}
        </div>
      )}
    </div>
  );
}
