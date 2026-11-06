import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Users,
  Wifi,
  Crown,
  GraduationCap,
  RefreshCw,
  Clock,
  X,
  Copy,
  Activity,
  BookOpen,
  Mail,
  Flame,
  Award,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { API_BASE_URL } from "../config/apiConfig";

// ─── Helpers ────────────────────────────────────────────────────────────────

const LEVEL_LABELS = {
  1: "100 Level",
  2: "200 Level",
  3: "300 Level",
  4: "400 Level",
};
const formatLevel = (year) =>
  LEVEL_LABELS[Number(year)] || (year ? `Year ${year}` : "—");

const formatDuration = (secs) => {
  if (!secs || isNaN(secs)) return "0m";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const getSecondsAgo = (isoString) =>
  Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));

const formatSecondsAgo = (secs) => {
  if (secs < 60) return `${secs}s ago`;
  const m = Math.floor(secs / 60);
  return `${m}m ${secs % 60}s ago`;
};

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

const UserCard = ({ presence, onClick }) => {
  const profile = presence.profiles || {};
  const secsAgo = getSecondsAgo(presence.last_seen);
  const colourClass = avatarColour(
    profile.user_name || profile.full_name || presence.user_id,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full text-left bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-sm
        hover:border-slate-600 hover:bg-slate-900/80 active:scale-[0.99] transition-all duration-150 cursor-pointer
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
                <Crown className="w-2.5 h-2.5" /> PRO
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

      {profile.university && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">{profile.university}</span>
        </div>
      )}

      {(profile.department || profile.year) && (
        <div className="text-[11px] text-slate-500 truncate">
          {[
            profile.college,
            profile.department,
            profile.year ? `Year ${profile.year}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-auto">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
        <Clock className="w-3 h-3 shrink-0" />
        <span>Last seen {formatSecondsAgo(secsAgo)}</span>
      </div>
    </button>
  );
};

// ─── User Drawer ─────────────────────────────────────────────────────────────

const UserDrawer = ({ user, onClose }) => {
  const [drawerTab, setDrawerTab] = useState("overview");
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setDetails(null);
    const load = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const res = await fetch(
          `${API_BASE_URL}/api/admin/users/${user.id}/details`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (res.ok) setDetails(await res.json());
      } catch (err) {
        console.error("Failed to load user details:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (!user) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || user.user_name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/40 shrink-0"
                />
              ) : (
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center text-indigo-300 font-bold text-lg shrink-0 ${avatarColour(user.full_name || user.user_name || "")}`}
                >
                  {getInitials(user.full_name || user.user_name)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">
                    {user.full_name || "Unnamed Scholar"}
                  </h2>
                  {user.is_premium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Crown className="w-3 h-3 text-amber-400" /> PRO
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      Free
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
                  <span>@{user.user_name || "user"}</span>
                  <span>·</span>
                  <span className="text-indigo-400 font-bold uppercase">
                    {user.university || "No Campus"}
                  </span>
                  <span>·</span>
                  <span>{formatLevel(user.year)}</span>
                </div>
                {/* Online indicator */}
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    Online now
                  </span>
                </div>
                {/* Copyable UUID */}
                <div className="mt-2">
                  <button
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 hover:border-slate-700 text-[10px] font-mono text-slate-400 hover:text-slate-200 transition"
                  >
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>{user.id}</span>
                    {copiedId && (
                      <span className="text-emerald-400 text-[9px] font-bold ml-1">
                        COPIED!
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs overflow-x-auto">
            {[
              {
                id: "overview",
                icon: <Users className="w-3.5 h-3.5" />,
                label: "Overview",
              },
              {
                id: "attempts",
                icon: <Activity className="w-3.5 h-3.5" />,
                label: "Exams",
                badge:
                  details?.stats?.total_attempts > 0
                    ? details.stats.total_attempts
                    : null,
              },
            ].map(({ id, icon, label, badge }) => (
              <button
                key={id}
                onClick={() => setDrawerTab(id)}
                className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  drawerTab === id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {icon}
                <span>{label}</span>
                {badge && (
                  <span className="px-1.5 rounded-full text-[10px] font-mono font-black bg-indigo-500/30 text-indigo-200">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-24 text-center text-slate-400 space-y-3">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Loading student profile...</p>
            </div>
          ) : (
            <>
              {drawerTab === "overview" && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Metric cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: "Total Exams",
                        value: details?.stats?.total_attempts || 0,
                        color: "text-white",
                      },
                      {
                        label: "Best Score",
                        value: details?.stats?.best_score_percent
                          ? `${details.stats.best_score_percent}%`
                          : "0%",
                        color: "text-emerald-400",
                      },
                      {
                        label: "Avg Score",
                        value: details?.stats?.average_percent
                          ? `${details.stats.average_percent}%`
                          : "0%",
                        color: "text-amber-400",
                      },
                      {
                        label: "Study Time",
                        value: formatDuration(
                          details?.stats?.total_duration_seconds,
                        ),
                        color: "text-cyan-400",
                      },
                    ].map(({ label, value, color }) => (
                      <div
                        key={label}
                        className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl"
                      >
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          {label}
                        </span>
                        <div
                          className={`text-xl font-black font-mono mt-1 ${color}`}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Academic Profile */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-400" />{" "}
                      Academic Profile
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {[
                        [
                          "Campus",
                          details?.profile?.university ||
                            user.university ||
                            "—",
                        ],
                        [
                          "College",
                          details?.profile?.college || user.college || "—",
                        ],
                        [
                          "Department",
                          details?.profile?.department ||
                            user.department ||
                            "—",
                        ],
                        [
                          "Level",
                          formatLevel(details?.profile?.year || user.year),
                        ],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <span className="text-slate-500 text-[11px]">
                            {k}:
                          </span>
                          <div className="font-bold text-slate-200 mt-0.5">
                            {v}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Account & Activity */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-indigo-400" /> Account &
                      Activity
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 text-[11px]">
                          Email:
                        </span>
                        <div className="font-mono text-slate-200 mt-0.5 flex items-center gap-1">
                          {details?.profile?.email || "No email"}
                          {details?.profile?.email_confirmed_at && (
                            <span className="text-emerald-400 text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px]">
                          Streak:
                        </span>
                        <div className="font-mono font-bold text-amber-400 mt-0.5 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5" />
                          {details?.profile?.current_streak || 0} days
                          <span className="text-slate-500 text-[10px]">
                            (Best: {details?.profile?.best_streak || 0}d)
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px]">
                          Registered:
                        </span>
                        <div className="text-slate-300 mt-0.5">
                          {details?.profile?.created_at
                            ? new Date(
                                details.profile.created_at,
                              ).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "N/A"}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[11px]">
                          Last Study:
                        </span>
                        <div className="text-slate-300 mt-0.5">
                          {details?.profile?.last_study_date
                            ? new Date(
                                details.profile.last_study_date,
                              ).toLocaleDateString()
                            : "No activity"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Favourite Courses */}
                  <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-400" /> Favourite
                      Courses
                    </h4>
                    {Array.isArray(details?.profile?.favourite_courses) &&
                    details.profile.favourite_courses.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {details.profile.favourite_courses.map((code) => (
                          <span
                            key={code}
                            className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 font-mono font-bold text-xs"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        No favourite courses bookmarked yet.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === "attempts" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {details?.rank_history?.length > 0 && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-amber-400" /> Leaderboard
                        Rankings
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {details.rank_history.map((rh, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono flex items-center gap-2"
                          >
                            <span className="font-bold text-amber-400">
                              #{rh.rank}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              {new Date(rh.week_start).toLocaleDateString()}
                            </span>
                            {rh.best_percent && (
                              <span className="text-slate-300 font-bold">
                                {Math.round(rh.best_percent)}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Exam Attempts ({details?.attempts?.length || 0})
                  </h4>

                  {!details?.attempts?.length ? (
                    <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/40 border border-slate-800 rounded-2xl">
                      No exam attempts recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {details.attempts.map((att) => {
                        const pct =
                          att.total_questions > 0
                            ? Math.round(
                                (att.score / att.total_questions) * 100,
                              )
                            : 0;
                        const pace =
                          att.total_questions > 0
                            ? Math.round(
                                (att.time_taken / att.total_questions) * 10,
                              ) / 10
                            : null;
                        return (
                          <div
                            key={att.id}
                            className="p-3 bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between gap-3 text-xs transition"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white font-mono">
                                  {att.course_id || "EXAM"}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300">
                                  {att.type || "OBJ"}
                                </span>
                                {att.is_retake && (
                                  <span className="px-1.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400">
                                    Retake
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                                {att.date_taken && (
                                  <span>
                                    {new Date(att.date_taken).toLocaleString(
                                      undefined,
                                      {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      },
                                    )}
                                  </span>
                                )}
                                {pace !== null && (
                                  <>
                                    <span>·</span>
                                    <span className="font-mono text-cyan-400">
                                      {pace}s/q
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span
                                  className={`font-black font-mono text-sm ${pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400"}`}
                                >
                                  {pct}%
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ({att.score}/{att.total_questions})
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {formatDuration(att.time_taken)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnlineView() {
  const [presences, setPresences] = useState([]);
  // initialLoad = true only on the very first fetch, never on refreshes
  const [initialLoad, setInitialLoad] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchOnline = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    // Never blank out the page — just silently update in the background
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/admin/online`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok && isMounted.current) {
        const json = await res.json();
        setPresences(json.scholars || []);
        setFetchError(false);
      } else if (isMounted.current) {
        setFetchError(true);
      }
    } catch (err) {
      console.error("Error fetching online scholars:", err);
      if (isMounted.current) setFetchError(true);
    } finally {
      if (isMounted.current) {
        setInitialLoad(false);
        setRefreshing(false);
        setLastRefreshed(new Date());
      }
    }
  }, []);

  useEffect(() => {
    fetchOnline();
    const interval = setInterval(() => fetchOnline(), 15_000);
    return () => clearInterval(interval);
  }, [fetchOnline]);

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

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <Wifi className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              Live Online Scholars
              {!initialLoad && (
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

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {initialLoad ? "—" : stats.total}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Total Online
            </p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {initialLoad ? "—" : stats.premium}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              PRO Subscribers
            </p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="text-lg font-black text-indigo-300 font-mono truncate">
              {initialLoad ? "—" : stats.topUni}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Top University
            </p>
          </div>
        </div>
      </div>

      {/* Last refreshed + background refresh indicator */}
      <div className="flex items-center gap-3 -mt-3">
        {lastRefreshed && (
          <p className="text-[11px] text-slate-600">
            Last refreshed at {lastRefreshed.toLocaleTimeString()}
          </p>
        )}
        {refreshing && (
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin" /> Updating...
          </span>
        )}
        {fetchError && !refreshing && (
          <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            Last refresh failed — retrying automatically
          </span>
        )}
      </div>

      {/* Grid */}
      {initialLoad ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : presences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-500">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-full">
            <Wifi className="w-10 h-10 text-slate-700" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-bold text-slate-400 text-base">
              No scholars online right now
            </p>
            <p className="text-xs text-slate-600">
              Scholars active in the last 90 seconds will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presences.map((p) => (
            <UserCard
              key={p.user_id}
              presence={p}
              onClick={() =>
                setDrawerUser(
                  p.profiles
                    ? { id: p.user_id, ...p.profiles }
                    : { id: p.user_id },
                )
              }
            />
          ))}
        </div>
      )}

      {/* User Drawer */}
      {drawerUser && (
        <UserDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />
      )}
    </div>
  );
}
