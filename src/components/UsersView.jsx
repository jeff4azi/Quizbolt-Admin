import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Users,
  Shield,
  Crown,
  Trash2,
  Edit2,
  X,
  Check,
  Filter,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  HeartOff,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Undo2,
  GraduationCap,
  BookOpen,
  Gift,
  RotateCcw,
  Plus,
  Eye,
  Clock,
  Flame,
  Copy,
  Calendar,
  Award,
  Mail,
  Compass,
  FileText,
  CheckCircle2,
  Activity,
  Sparkles,
  Zap,
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import {
  useUniversities,
  useColleges,
} from "../hooks/useUniversitiesAndColleges";
import ConfirmDialog from "./ConfirmDialog";

// profiles.year is a NOT NULL smallint storing 1-4 (NOT literally 100/200/300/400)
const LEVEL_OPTIONS = [
  { value: "1", label: "100 Level" },
  { value: "2", label: "200 Level" },
  { value: "3", label: "300 Level" },
  { value: "4", label: "400 Level" },
];
const LEVEL_LABELS = {
  1: "100 Level",
  2: "200 Level",
  3: "300 Level",
  4: "400 Level",
};
const formatLevel = (year) => LEVEL_LABELS[Number(year)] || `Year ${year}`;

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  // Universities/colleges from Supabase
  const { universities } = useUniversities();

  // Filters
  const [search, setSearch] = useState("");
  const [university, setUniversity] = useState("");
  const [premiumFilter, setPremiumFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const { colleges: filterColleges } = useColleges(university);

  // Top metric aggregates (calculated from current cohort)
  const cohortMetrics = useMemo(() => {
    const premiumCount = users.filter((u) => u.is_premium).length;
    const streakCount = users.filter((u) => (u.streak || u.current_streak || 0) > 0).length;
    const distinctUnis = new Set(users.map((u) => u.university).filter(Boolean)).size;
    return {
      premiumCount,
      streakCount,
      distinctUnis,
    };
  }, [users]);

  // Bulk Action Modals State
  const [isClearFavsModalOpen, setIsClearFavsModalOpen] = useState(false);
  const [isClearingFavs, setIsClearingFavs] = useState(false);
  const [isIncrementLevelModalOpen, setIsIncrementLevelModalOpen] = useState(false);
  const [isIncrementingLevel, setIsIncrementingLevel] = useState(false);
  const [undoStatus, setUndoStatus] = useState(null);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [isUndoingLevel, setIsUndoingLevel] = useState(false);

  // Notifications
  const [notification, setNotification] = useState(null);

  // ─── Slide-Over Drawer State ───────────────────────────────────────────────
  const [drawerUser, setDrawerUser] = useState(null);
  const [drawerTab, setDrawerTab] = useState("overview"); // 'overview' | 'attempts' | 'edit' | 'rerun' | 'grant'
  const [drawerDetails, setDrawerDetails] = useState(null);
  const [loadingDrawerDetails, setLoadingDrawerDetails] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Edit Form (inside Drawer)
  const [editForm, setEditForm] = useState({
    full_name: "",
    user_name: "",
    university: "",
    college: "",
    department: "",
    year: "1",
    is_premium: false,
  });
  const { colleges: editColleges, loadingColleges: editCollegesLoading } =
    useColleges(editForm.university);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Rerun Courses Overrides
  const [overrides, setOverrides] = useState([]);
  const [candidateCourses, setCandidateCourses] = useState([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [overrideSearch, setOverrideSearch] = useState("");
  const [overrideActionLoading, setOverrideActionLoading] = useState(false);

  // Grant Temporary Premium (inside Drawer)
  const [grantPreset, setGrantPreset] = useState("contribution");
  const [grantReasonText, setGrantReasonText] = useState("");
  const [grantDays, setGrantDays] = useState(7);
  const [grantLoading, setGrantLoading] = useState(false);

  // Delete User Dialog
  const [deleteUserDialog, setDeleteUserDialog] = useState(null);

  // Fetch Users List
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams({
        page,
        limit,
        search,
        university,
        premium: premiumFilter,
      });
      if (collegeFilter) params.append("college", collegeFilter);
      if (yearFilter) params.append("year", yearFilter);

      const res = await fetch(`${API_BASE_URL}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, university, premiumFilter, collegeFilter, yearFilter]);

  // Fetch Undo Status
  const fetchUndoStatus = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/increment-levels/undo-status`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setUndoStatus(data.canUndo ? data : null);
      }
    } catch (err) {
      console.error("Error checking undo status:", err);
    }
  };

  useEffect(() => {
    fetchUndoStatus();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // ─── Open Slide-Over Drawer ────────────────────────────────────────────────
  const handleOpenDrawer = async (user, initialTab = "overview") => {
    setDrawerUser(user);
    setDrawerTab(initialTab);
    setLoadingDrawerDetails(true);
    setDrawerDetails(null);
    setOverrideSearch("");

    // Populate edit form
    setEditForm({
      full_name: user.full_name || "",
      user_name: user.user_name || "",
      university: user.university ? user.university.trim().toLowerCase() : "",
      college: user.college || "",
      department: user.department || "",
      year: user.year ? String(user.year) : "1",
      is_premium: Boolean(user.is_premium),
    });

    // Fetch candidate courses for overrides in parallel
    fetchCandidateCourses(user);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${user.id}/details`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const details = await res.json();
        setDrawerDetails(details);
        setOverrides(details.overrides || []);
      }
    } catch (err) {
      console.error("Failed to load user full details:", err);
    } finally {
      setLoadingDrawerDetails(false);
    }
  };

  const closeDrawer = () => {
    setDrawerUser(null);
    setDrawerDetails(null);
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const fetchCandidateCourses = async (user) => {
    const uni = user.university ? user.university.trim().toLowerCase() : "";
    if (!uni) {
      setCandidateCourses([]);
      return;
    }
    setCandidateLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const params = new URLSearchParams({ university: uni, limit: "500" });
      const res = await fetch(`${API_BASE_URL}/api/admin/courses?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCandidateCourses(data.courses || []);
      }
    } catch (err) {
      console.error("Failed to fetch candidate courses:", err);
    } finally {
      setCandidateLoading(false);
    }
  };

  // Add / Remove Rerun Course Overrides
  const handleAddOverride = async (courseCode) => {
    if (!drawerUser) return;
    setOverrideActionLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${drawerUser.id}/overrides`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ course_code: courseCode }),
        }
      );
      if (!res.ok) throw new Error("Failed to add rerun override");
      const data = await res.json();
      setOverrides((prev) => [...prev, data]);
      setNotification({
        type: "success",
        text: `Course ${courseCode} added to rerun overrides.`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({ type: "error", text: err.message });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setOverrideActionLoading(false);
    }
  };

  const handleRemoveOverride = async (overrideId, courseCode) => {
    if (!drawerUser) return;
    setOverrideActionLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${drawerUser.id}/overrides/${overrideId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to remove override");
      setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
      setNotification({
        type: "success",
        text: `Removed course override ${courseCode || ""}.`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({ type: "error", text: err.message });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setOverrideActionLoading(false);
    }
  };

  // Save User Profile Changes
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!drawerUser) return;
    setIsSavingUser(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${drawerUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editForm),
        }
      );

      if (!res.ok) throw new Error("Failed to update user profile");

      const updated = await res.json();

      // Update local state in drawer and list
      setDrawerUser((prev) => ({ ...prev, ...updated }));
      if (drawerDetails) {
        setDrawerDetails((prev) => ({
          ...prev,
          profile: { ...prev.profile, ...updated },
        }));
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === drawerUser.id ? { ...u, ...updated } : u))
      );

      setNotification({
        type: "success",
        text: "Student profile updated successfully!",
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({
        type: "error",
        text: `Error updating profile: ${err.message}`,
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsSavingUser(false);
    }
  };

  // Grant Temporary Premium
  const handleGrantPremium = async (e) => {
    e.preventDefault();
    if (!drawerUser) return;
    setGrantLoading(true);

    const isPreset = grantPreset === "contribution";
    const reasonText = isPreset
      ? "Content Contribution / Verified Volunteer"
      : grantReasonText.trim();
    const days = parseInt(grantDays, 10);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/premium/grant-free-days`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: drawerUser.id,
            days,
            reason: reasonText,
          }),
        }
      );

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to grant premium");

      // Update states
      setDrawerUser((prev) => ({ ...prev, is_premium: true }));
      if (drawerDetails) {
        setDrawerDetails((prev) => ({
          ...prev,
          profile: { ...prev.profile, is_premium: true },
        }));
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === drawerUser.id ? { ...u, is_premium: true } : u))
      );

      setNotification({
        type: "success",
        text: `Successfully granted ${days} premium days to ${drawerUser.full_name || drawerUser.user_name}!`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setNotification({
        type: "error",
        text: `Error granting premium: ${err.message}`,
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setGrantLoading(false);
    }
  };

  // Clear Single User's Favourites
  const handleClearSingleUserFavourites = async () => {
    if (!drawerUser) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${drawerUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ favourite_courses: [] }),
        }
      );

      if (!res.ok) throw new Error("Failed to clear favourites");

      if (drawerDetails) {
        setDrawerDetails((prev) => ({
          ...prev,
          profile: { ...prev.profile, favourite_courses: [] },
          stats: { ...prev.stats, favourite_courses_count: 0 },
        }));
      }

      setNotification({
        type: "success",
        text: "User's favourite courses reset to empty.",
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setNotification({ type: "error", text: err.message });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Delete User Account
  const handleDeleteUser = (id, name) => {
    setDeleteUserDialog({ id, name });
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserDialog) return;
    const { id, name } = deleteUserDialog;
    setDeleteUserDialog(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete user");

      if (drawerUser?.id === id) closeDrawer();

      setNotification({
        type: "success",
        text: `User ${name || id} deleted successfully.`,
      });
      setTimeout(() => setNotification(null), 4000);
      fetchUsers();
    } catch (err) {
      setNotification({
        type: "error",
        text: `Error deleting user: ${err.message}`,
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Bulk Actions
  const handleConfirmClearAllFavourites = async () => {
    setIsClearingFavs(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/clear-all-favourites`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to clear favourite courses");

      setIsClearFavsModalOpen(false);
      setNotification({
        type: "success",
        text: "Successfully cleared favourite courses for ALL users on the platform!",
      });
      setTimeout(() => setNotification(null), 5000);
      fetchUsers();
    } catch (err) {
      setNotification({
        type: "error",
        text: `Error clearing favourites: ${err.message}`,
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsClearingFavs(false);
    }
  };

  const handleConfirmIncrementLevel = async () => {
    setIsIncrementingLevel(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/increment-levels`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to promote user levels");

      setIsIncrementLevelModalOpen(false);
      setNotification({
        type: "success",
        text:
          data.message ||
          `Successfully promoted ${data.updatedCount} users to their next level!`,
      });
      setTimeout(() => setNotification(null), 5000);
      fetchUsers();
      fetchUndoStatus();
    } catch (err) {
      setNotification({
        type: "error",
        text: `Error promoting levels: ${err.message}`,
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsIncrementingLevel(false);
    }
  };

  const handleConfirmUndoIncrementLevel = async () => {
    setIsUndoingLevel(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/increment-levels/undo`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to undo level promotion");

      setIsUndoModalOpen(false);
      setUndoStatus(null);
      setNotification({
        type: "success",
        text:
          data.message ||
          `Successfully reverted ${data.revertedCount} users to their previous level!`,
      });
      setTimeout(() => setNotification(null), 5000);
      fetchUsers();
    } catch (err) {
      setNotification({
        type: "error",
        text: `Error undoing promotion: ${err.message}`,
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsUndoingLevel(false);
    }
  };

  // Format Duration seconds
  const formatDuration = (secs) => {
    if (!secs || isNaN(secs)) return "0m";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* ─── Top Header & Platform Actions ──────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Student Directory & Intelligence
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {total.toLocaleString()} Scholars
              </span>
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Comprehensive student profiles, academic progress, exam telemetry, course overrides, and subscription controls.
            </p>
          </div>
        </div>

        {/* Global Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {undoStatus?.canUndo && (
            <button
              onClick={() => setIsUndoModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition shadow-sm"
              title="Revert the most recent level increment"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo Promotion</span>
            </button>
          )}

          <button
            onClick={() => setIsIncrementLevelModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Promote All Levels (+1)</span>
          </button>

          <button
            onClick={() => setIsClearFavsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition"
            title="Reset favourite courses for all students"
          >
            <HeartOff className="w-3.5 h-3.5" />
            <span>Clear All Favourites</span>
          </button>
        </div>
      </div>

      {/* ─── Notification Banner ────────────────────────────────────────── */}
      {notification && (
        <div
          className={`p-3.5 border rounded-2xl text-xs flex items-center justify-between gap-2 animate-in fade-in duration-200 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── Top Executive KPI Cards (4 Cards) ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Accounts</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-white font-mono">
              {total.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Platform registered scholars</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Premium</span>
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-amber-400 font-mono">
              {cohortMetrics.premiumCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Pro subscribers in view</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Streakers</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-orange-400 font-mono">
              {cohortMetrics.streakCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Scholars with streak &gt; 0</p>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Campuses</span>
            <GraduationCap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-cyan-400 font-mono">
              {universities.length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Institutions supported</p>
          </div>
        </div>
      </div>

      {/* ─── Search & Filter Toolbar ────────────────────────────────────── */}
      <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student name, username, email, or UUID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
                fetchUsers();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* University */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={university}
              onChange={(e) => {
                setUniversity(e.target.value);
                setCollegeFilter("");
                setPage(1);
              }}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="" className="bg-slate-900 text-white">All Campuses</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                  {u.name || u.id}
                </option>
              ))}
            </select>
          </div>

          {/* College (Cascading) */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={collegeFilter}
              onChange={(e) => {
                setCollegeFilter(e.target.value);
                setPage(1);
              }}
              disabled={!university}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer max-w-[130px] truncate disabled:opacity-50"
            >
              <option value="" className="bg-slate-900 text-white">
                {university ? "All Colleges" : "Select Campus First"}
              </option>
              {filterColleges.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Level */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <select
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-white">All Levels</option>
              {LEVEL_OPTIONS.map((l) => (
                <option key={l.value} value={l.value} className="bg-slate-900 text-white">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Premium Status */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <Crown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={premiumFilter}
              onChange={(e) => {
                setPremiumFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-white">All Tiers</option>
              <option value="true" className="bg-slate-900 text-white">👑 Premium Only</option>
              <option value="false" className="bg-slate-900 text-white">Free Tier Only</option>
            </select>
          </div>

          {/* Clear Filters Reset */}
          {(university || collegeFilter || yearFilter || premiumFilter || search) && (
            <button
              onClick={() => {
                setUniversity("");
                setCollegeFilter("");
                setYearFilter("");
                setPremiumFilter("");
                setSearch("");
                setPage(1);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Students Table ────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-slate-400 space-y-3">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs">Loading student profiles and academic records...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs space-y-2">
            <p>No student accounts found matching query criteria.</p>
            <p className="text-[11px] text-slate-600">
              Try adjusting your campus, college, level, or search keyword.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="py-3.5 px-4">Student Profile</th>
                  <th className="py-3.5 px-4">Campus</th>
                  <th className="py-3.5 px-4">College & Dept</th>
                  <th className="py-3.5 px-4">Level</th>
                  <th className="py-3.5 px-4">Tier</th>
                  <th className="py-3.5 px-4">Streak</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => {
                  const hasStreak = (u.streak || u.current_streak || 0) > 0;

                  return (
                    <tr
                      key={u.id}
                      onClick={() => handleOpenDrawer(u, "overview")}
                      className="hover:bg-slate-800/50 transition cursor-pointer group"
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.full_name || u.user_name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-800/80 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0 group-hover:border-indigo-500 transition">
                              {u.full_name?.charAt(0)?.toUpperCase() ||
                                u.user_name?.charAt(0)?.toUpperCase() ||
                                "S"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs truncate max-w-[160px] sm:max-w-[200px] group-hover:text-indigo-300 transition">
                                {u.full_name || "Unnamed Scholar"}
                              </span>
                              {u.is_premium && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  PRO
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <span>@{u.user_name || "user"}</span>
                              {u.email && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[140px] text-slate-500">
                                    {u.email}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Campus */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold text-xs uppercase tracking-wide">
                          {u.university || "—"}
                        </span>
                      </td>

                      {/* College & Department */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="font-semibold text-slate-200 truncate max-w-[170px]">
                          {u.department || "General"}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                          {u.college || "Unassigned College"}
                        </div>
                      </td>

                      {/* Level */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono font-semibold text-[11px]">
                          {formatLevel(u.year)}
                        </span>
                      </td>

                      {/* Tier */}
                      <td className="py-3.5 px-4">
                        {u.is_premium ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                            <Crown className="w-3 h-3 text-amber-400" /> Premium
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/80">
                            Free Tier
                          </span>
                        )}
                      </td>

                      {/* Streak */}
                      <td className="py-3.5 px-4">
                        {hasStreak ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                            <Flame className="w-3.5 h-3.5 text-amber-400" />
                            {u.streak || u.current_streak}d
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono text-xs">0d</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleOpenDrawer(u, "overview")}
                            className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition"
                            title="Inspect Student Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDrawer(u, "edit")}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                            title="Quick Edit Profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDrawer(u, "grant")}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                            title="Grant Free Premium Days"
                          >
                            <Gift className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteUser(u.id, u.full_name || u.user_name)
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                            title="Delete Student Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing{" "}
            <span className="font-bold text-white">
              {users.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-bold text-white">
              {Math.min(page * limit, total)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-white">
              {total.toLocaleString()}
            </span>{" "}
            student accounts
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="font-semibold text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── SLIDE-OVER STUDENT AUDIT & MANAGEMENT DRAWER ─────────────────── */}
      {drawerUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  {drawerUser.avatar_url ? (
                    <img
                      src={drawerUser.avatar_url}
                      alt={drawerUser.full_name || drawerUser.user_name}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-300 font-bold text-lg shrink-0">
                      {drawerUser.full_name?.charAt(0)?.toUpperCase() ||
                        drawerUser.user_name?.charAt(0)?.toUpperCase() ||
                        "S"}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">
                        {drawerUser.full_name || "Unnamed Scholar"}
                      </h2>
                      {drawerUser.is_premium ? (
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
                      <span>@{drawerUser.user_name || "user"}</span>
                      <span>•</span>
                      <span className="text-indigo-400 font-bold uppercase">
                        {drawerUser.university || "No Campus"}
                      </span>
                      <span>•</span>
                      <span>{formatLevel(drawerUser.year)}</span>
                    </div>

                    {/* Copyable UUID */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyId(drawerUser.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 hover:border-slate-700 text-[10px] font-mono text-slate-400 hover:text-slate-200 transition"
                      >
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>{drawerUser.id}</span>
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
                  onClick={closeDrawer}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 mt-5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs overflow-x-auto">
                <button
                  onClick={() => setDrawerTab("overview")}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    drawerTab === "overview"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => setDrawerTab("attempts")}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    drawerTab === "attempts"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Exams</span>
                  {drawerDetails?.stats?.total_attempts > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-indigo-500/30 text-indigo-200">
                      {drawerDetails.stats.total_attempts}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setDrawerTab("edit")}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    drawerTab === "edit"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>

                <button
                  onClick={() => setDrawerTab("rerun")}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    drawerTab === "rerun"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rerun</span>
                  {overrides.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-cyan-500/30 text-cyan-200">
                      {overrides.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setDrawerTab("grant")}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    drawerTab === "grant"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                  <span>Grant Pro</span>
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loadingDrawerDetails ? (
                <div className="py-24 text-center text-slate-400 space-y-3">
                  <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs">Loading comprehensive academic history...</p>
                </div>
              ) : (
                <>
                  {/* ─── TAB 1: OVERVIEW ─────────────────────────────────── */}
                  {drawerTab === "overview" && (
                    <div className="space-y-5 animate-in fade-in duration-150">
                      {/* 4 Performance Metric Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            Total Exams
                          </span>
                          <div className="text-xl font-black text-white font-mono mt-1">
                            {drawerDetails?.stats?.total_attempts || 0}
                          </div>
                          <span className="text-[10px] text-slate-500">Attempted</span>
                        </div>

                        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            Best Score
                          </span>
                          <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                            {drawerDetails?.stats?.best_score_percent ? `${drawerDetails.stats.best_score_percent}%` : "0%"}
                          </div>
                          <span className="text-[10px] text-slate-500">Peak test score</span>
                        </div>

                        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            Avg Score
                          </span>
                          <div className="text-xl font-black text-amber-400 font-mono mt-1">
                            {drawerDetails?.stats?.average_percent ? `${drawerDetails.stats.average_percent}%` : "0%"}
                          </div>
                          <span className="text-[10px] text-slate-500">Cohort average</span>
                        </div>

                        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            Study Time
                          </span>
                          <div className="text-xl font-black text-cyan-400 font-mono mt-1">
                            {formatDuration(drawerDetails?.stats?.total_duration_seconds)}
                          </div>
                          <span className="text-[10px] text-slate-500">Time spent</span>
                        </div>
                      </div>

                      {/* Academic & Campus Details */}
                      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-indigo-400" />
                          Academic Profile
                        </h4>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 text-[11px]">Campus:</span>
                            <div className="font-bold text-slate-200 mt-0.5">
                              {drawerDetails?.profile?.university || drawerUser.university || "—"}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px]">College:</span>
                            <div className="font-bold text-slate-200 mt-0.5">
                              {drawerDetails?.profile?.college || drawerUser.college || "—"}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px]">Department:</span>
                            <div className="font-bold text-slate-200 mt-0.5">
                              {drawerDetails?.profile?.department || drawerUser.department || "—"}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[11px]">Academic Level:</span>
                            <div className="font-bold text-indigo-400 mt-0.5">
                              {formatLevel(drawerDetails?.profile?.year || drawerUser.year)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Account & Contact Details */}
                      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-indigo-400" />
                          Account & Activity Information
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 text-[11px]">Registered Email:</span>
                            <div className="font-mono text-slate-200 mt-0.5 flex items-center gap-1">
                              <span>{drawerDetails?.profile?.email || "No email on record"}</span>
                              {drawerDetails?.profile?.email_confirmed_at && (
                                <span className="text-emerald-400 text-[10px]" title="Email Verified">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-500 text-[11px]">Current Streak:</span>
                            <div className="font-mono font-bold text-amber-400 mt-0.5 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5" />
                              <span>{drawerDetails?.profile?.current_streak || 0} days</span>
                              <span className="text-slate-500 text-[10px]">
                                (Best: {drawerDetails?.profile?.best_streak || 0}d)
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-500 text-[11px]">Registered On:</span>
                            <div className="text-slate-300 mt-0.5">
                              {drawerDetails?.profile?.created_at
                                ? new Date(drawerDetails.profile.created_at).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "N/A"}
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-500 text-[11px]">Last Study Activity:</span>
                            <div className="text-slate-300 mt-0.5">
                              {drawerDetails?.profile?.last_study_date
                                ? new Date(drawerDetails.profile.last_study_date).toLocaleDateString()
                                : "No activity"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Favourite Courses */}
                      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-indigo-400" />
                            Saved Favourite Courses
                          </h4>
                          {Array.isArray(drawerDetails?.profile?.favourite_courses) &&
                            drawerDetails.profile.favourite_courses.length > 0 && (
                              <button
                                onClick={handleClearSingleUserFavourites}
                                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition flex items-center gap-1"
                              >
                                <HeartOff className="w-3 h-3" /> Clear Favourites
                              </button>
                            )}
                        </div>

                        {Array.isArray(drawerDetails?.profile?.favourite_courses) &&
                        drawerDetails.profile.favourite_courses.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {drawerDetails.profile.favourite_courses.map((code) => (
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
                            Student has not bookmarked any favourite courses yet.
                          </p>
                        )}
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          onClick={() => setDrawerTab("edit")}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Profile Info</span>
                        </button>

                        <button
                          onClick={() => setDrawerTab("grant")}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>Grant Free Premium</span>
                        </button>

                        <button
                          onClick={() =>
                            handleDeleteUser(drawerUser.id, drawerUser.full_name || drawerUser.user_name)
                          }
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition ml-auto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Account</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ─── TAB 2: EXAMS & ACTIVITY ─────────────────────────── */}
                  {drawerTab === "attempts" && (
                    <div className="space-y-4 animate-in fade-in duration-150">
                      {/* Leaderboard Placements */}
                      {drawerDetails?.rank_history && drawerDetails.rank_history.length > 0 && (
                        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-amber-400" />
                            Official Leaderboard Snapshot Rankings
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {drawerDetails.rank_history.map((rh, idx) => (
                              <div
                                key={idx}
                                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono flex items-center gap-2"
                              >
                                <span className="font-bold text-amber-400">#{rh.rank}</span>
                                <span className="text-slate-400 text-[10px]">
                                  {new Date(rh.week_start).toLocaleDateString()}
                                </span>
                                <span className="text-slate-300 font-bold">
                                  {rh.best_percent ? `${Math.round(rh.best_percent)}%` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Attempts List */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                          Chronological Exam Attempts ({drawerDetails?.attempts?.length || 0})
                        </h4>

                        {!drawerDetails?.attempts || drawerDetails.attempts.length === 0 ? (
                          <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/40 border border-slate-800 rounded-2xl">
                            No exam attempts recorded for this student yet.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {drawerDetails.attempts.map((att) => {
                              const pct =
                                att.total_questions > 0
                                  ? Math.round((att.score / att.total_questions) * 100)
                                  : 0;
                              const pace =
                                att.total_questions > 0
                                  ? Math.round((att.time_taken / att.total_questions) * 10) / 10
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
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400">
                                          Retake
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                                      <span>
                                        {att.date_taken
                                          ? new Date(att.date_taken).toLocaleString(undefined, {
                                              dateStyle: "short",
                                              timeStyle: "short",
                                            })
                                          : ""}
                                      </span>
                                      {pace !== null && (
                                        <>
                                          <span>•</span>
                                          <span className="font-mono text-cyan-400">{pace}s/q</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <span
                                        className={`font-black font-mono text-sm ${
                                          pct >= 70
                                            ? "text-emerald-400"
                                            : pct >= 50
                                            ? "text-amber-400"
                                            : "text-rose-400"
                                        }`}
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
                    </div>
                  )}

                  {/* ─── TAB 3: EDIT PROFILE ─────────────────────────────── */}
                  {drawerTab === "edit" && (
                    <form onSubmit={handleSaveUser} className="space-y-4 text-xs animate-in fade-in duration-150">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={editForm.full_name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, full_name: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">
                            Username
                          </label>
                          <input
                            type="text"
                            value={editForm.user_name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, user_name: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">
                            University
                          </label>
                          <select
                            value={editForm.university}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                university: e.target.value,
                                college: "",
                              })
                            }
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="">Select University</option>
                            {universities.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name || u.id}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">
                            Academic Level
                          </label>
                          <select
                            value={editForm.year}
                            onChange={(e) =>
                              setEditForm({ ...editForm, year: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            {LEVEL_OPTIONS.map((l) => (
                              <option key={l.value} value={l.value}>
                                {l.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">
                            College
                          </label>
                          <select
                            value={editForm.college}
                            onChange={(e) =>
                              setEditForm({ ...editForm, college: e.target.value })
                            }
                            disabled={!editForm.university || editCollegesLoading}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <option value="">
                              {!editForm.university
                                ? "Select University First"
                                : editCollegesLoading
                                ? "Loading colleges..."
                                : "Select College"}
                            </option>
                            {editColleges.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">
                            Department
                          </label>
                          <input
                            type="text"
                            value={editForm.department}
                            onChange={(e) =>
                              setEditForm({ ...editForm, department: e.target.value })
                            }
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Premium Toggle */}
                      <label className="flex items-center gap-3 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-2xl cursor-pointer hover:bg-amber-500/10 transition">
                        <input
                          type="checkbox"
                          checked={editForm.is_premium}
                          onChange={(e) =>
                            setEditForm({ ...editForm, is_premium: e.target.checked })
                          }
                          className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                        />
                        <div>
                          <div className="text-amber-400 font-bold flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5" /> Full Premium Status
                          </div>
                          <div className="text-slate-500 text-[10px] mt-0.5">
                            Manually grant or revoke permanent pro subscription privileges
                          </div>
                        </div>
                      </label>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setDrawerTab("overview")}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingUser}
                          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSavingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ─── TAB 4: RERUN COURSES (OVERRIDES) ───────────────── */}
                  {drawerTab === "rerun" && (
                    <div className="space-y-4 text-xs animate-in fade-in duration-150">
                      <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl text-cyan-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Rerun Course Overrides
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Grants this student permission to practice courses from previous academic levels without restriction.
                        </p>
                      </div>

                      {/* Current Overrides */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Active Course Overrides ({overrides.length})
                        </h4>

                        {overrides.length === 0 ? (
                          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-slate-500 text-center italic">
                            No active course overrides configured.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {overrides.map((ov) => (
                              <div
                                key={ov.id}
                                className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-bold font-mono text-white">
                                    {ov.course_code}
                                  </span>
                                  <span className="text-[10px] text-slate-500 ml-2">
                                    Added {new Date(ov.created_at).toLocaleDateString()}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleRemoveOverride(ov.id, ov.course_code)}
                                  disabled={overrideActionLoading}
                                  className="text-rose-400 hover:text-rose-300 p-1 text-xs font-bold transition flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Course Override */}
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Add Eligible Lower-Level Course
                        </h4>

                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search course code or title..."
                            value={overrideSearch}
                            onChange={(e) => setOverrideSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none"
                          />
                        </div>

                        {candidateLoading ? (
                          <div className="py-4 text-center text-slate-400 text-xs">
                            Loading eligible courses...
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-800/40 border border-slate-800 rounded-xl bg-slate-950/60 p-1">
                            {candidateCourses
                              .filter((c) => {
                                const currentLevel = parseInt(drawerUser.year || "1", 10) * 100;
                                const isLower = (c.level || 0) < currentLevel;
                                const notAdded = !overrides.some(
                                  (o) => o.course_code?.toLowerCase() === c.course_code?.toLowerCase()
                                );
                                const matches =
                                  !overrideSearch ||
                                  c.course_code?.toLowerCase().includes(overrideSearch.toLowerCase()) ||
                                  c.name?.toLowerCase().includes(overrideSearch.toLowerCase());
                                return isLower && notAdded && matches;
                              })
                              .slice(0, 30)
                              .map((c) => (
                                <div
                                  key={c.id || c.course_code}
                                  className="p-2 flex items-center justify-between hover:bg-slate-800/50 rounded-lg"
                                >
                                  <div>
                                    <span className="font-bold text-white font-mono">{c.course_code}</span>
                                    <span className="text-slate-400 ml-2">{c.name || c.title}</span>
                                    <span className="text-[10px] text-slate-500 ml-2">({c.level}L)</span>
                                  </div>

                                  <button
                                    onClick={() => handleAddOverride(c.course_code)}
                                    disabled={overrideActionLoading}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add</span>
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── TAB 5: GRANT PREMIUM ───────────────────────────── */}
                  {drawerTab === "grant" && (
                    <form onSubmit={handleGrantPremium} className="space-y-4 text-xs animate-in fade-in duration-150">
                      <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-300 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <Gift className="w-4 h-4 text-emerald-400" />
                          Grant Free Trial / Promo Premium
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Instantly provision temporary premium days to reward student contributors or ambassadors.
                        </p>
                      </div>

                      {/* Preset Days Picker */}
                      <div>
                        <label className="block text-slate-400 mb-1.5 font-semibold">
                          Duration to Grant
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[7, 14, 30, 90].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setGrantDays(d)}
                              className={`py-2 rounded-xl font-bold transition text-xs ${
                                grantDays === d
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800"
                              }`}
                            >
                              {d === 90 ? "Semester" : `${d} Days`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reason */}
                      <div>
                        <label className="block text-slate-400 mb-1.5 font-semibold">
                          Grant Reason Preset
                        </label>
                        <select
                          value={grantPreset}
                          onChange={(e) => setGrantPreset(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                        >
                          <option value="contribution">Content Contribution / Volunteer</option>
                          <option value="other">Custom Administrative Reason</option>
                        </select>
                      </div>

                      {grantPreset === "other" && (
                        <div>
                          <label className="block text-slate-400 mb-1 font-semibold">
                            Custom Reason Note
                          </label>
                          <input
                            type="text"
                            value={grantReasonText}
                            onChange={(e) => setGrantReasonText(e.target.value)}
                            placeholder="e.g. Student campus ambassador promo..."
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                          />
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setDrawerTab("overview")}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={grantLoading}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {grantLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                          <span>Grant {grantDays} Days Premium</span>
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete User Dialog ─────────────────────────────────────────── */}
      {deleteUserDialog && (
        <ConfirmDialog
          isOpen={Boolean(deleteUserDialog)}
          title="Delete Student Account"
          message={`Are you sure you want to permanently delete the student account for ${
            deleteUserDialog.name || deleteUserDialog.id
          }? This will delete all their historical attempts and cannot be undone.`}
          confirmLabel="Delete Account"
          confirmVariant="danger"
          onConfirm={confirmDeleteUser}
          onCancel={() => setDeleteUserDialog(null)}
        />
      )}

      {/* ─── Clear All Favourites Modal ─────────────────────────────────── */}
      {isClearFavsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-3">
              <HeartOff className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold text-white">
                Clear All Favourites Platform-Wide
              </h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to clear favourite courses for{" "}
              <strong className="text-rose-400">ALL {total} users</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                disabled={isClearingFavs}
                onClick={() => setIsClearFavsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                disabled={isClearingFavs}
                onClick={handleConfirmClearAllFavourites}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {isClearingFavs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HeartOff className="w-4 h-4" />}
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Increment Level Modal ──────────────────────────────────────── */}
      {isIncrementLevelModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-indigo-400 border-b border-slate-800 pb-3">
              <TrendingUp className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold text-white">
                Promote All Users Level (+1)
              </h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Promotes all student levels platform-wide by +1 (100L → 200L, 200L → 300L, 300L → 400L). 400L remains unchanged.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                disabled={isIncrementingLevel}
                onClick={() => setIsIncrementLevelModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                disabled={isIncrementingLevel}
                onClick={handleConfirmIncrementLevel}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {isIncrementingLevel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                Promote All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Undo Increment Level Modal ─────────────────────────────────── */}
      {isUndoModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400 border-b border-slate-800 pb-3">
              <Undo2 className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold text-white">
                Undo Last Promotion
              </h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Reverts {undoStatus?.updatedCount ?? 0} users back to their previous level.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                disabled={isUndoingLevel}
                onClick={() => setIsUndoModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                disabled={isUndoingLevel}
                onClick={handleConfirmUndoIncrementLevel}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {isUndoingLevel ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                Undo Promotion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
