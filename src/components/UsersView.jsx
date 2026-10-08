import React, { useState, useEffect } from "react";
import { Search, Users, Shield, Crown, Trash2, Edit2, X, Check, Filter, AlertCircle, ChevronLeft, ChevronRight, HeartOff, AlertTriangle, RefreshCw, TrendingUp, Undo2, GraduationCap, BookOpen, Gift } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import { useUniversities, useColleges } from "../hooks/useUniversitiesAndColleges";
import ConfirmDialog from "./ConfirmDialog";

// profiles.year is a NOT NULL smallint storing 1-4 (NOT literally
// 100/200/300/400) — there is no 400+1 "500 Level", year 4 is the final year.
const LEVEL_OPTIONS = [
  { value: "1", label: "100 Level" },
  { value: "2", label: "200 Level" },
  { value: "3", label: "300 Level" },
  { value: "4", label: "400 Level" },
];
const LEVEL_LABELS = { 1: "100 Level", 2: "200 Level", 3: "300 Level", 4: "400 Level" };
const formatLevel = (year) => LEVEL_LABELS[Number(year)] || `Year ${year}`;

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(100); // Users list — higher page size for large cohorts
  const [totalPages, setTotalPages] = useState(1);

  // Real universities/colleges from Supabase (no more hardcoded lists)
  const { universities } = useUniversities();

  // Filters
  const [search, setSearch] = useState("");
  const [university, setUniversity] = useState("");
  const [premiumFilter, setPremiumFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const { colleges: filterColleges } = useColleges(university);

  // Clear All Favourites Modal State
  const [isClearFavsModalOpen, setIsClearFavsModalOpen] = useState(false);
  const [isClearingFavs, setIsClearingFavs] = useState(false);

  // Increment Level Modal State
  const [isIncrementLevelModalOpen, setIsIncrementLevelModalOpen] = useState(false);
  const [isIncrementingLevel, setIsIncrementingLevel] = useState(false);

  // Undo Promotion State
  const [undoStatus, setUndoStatus] = useState(null); // { canUndo, updatedCount, promotedAt }
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [isUndoingLevel, setIsUndoingLevel] = useState(false);

  // --- Grant Temporary Premium (Feature B) ---
  const [grantModalUser, setGrantModalUser] = useState(null);
  // grantTargetInfo = { user, isFullSemester: boolean, isTempActive: boolean, expiresAt: Date|null }
  const [grantTargetInfo, setGrantTargetInfo] = useState(null);
  const [grantPreset, setGrantPreset] = useState("contribution"); // "contribution" | "other"
  const [grantReasonText, setGrantReasonText] = useState("");
  const [grantDays, setGrantDays] = useState(7);
  const [grantLoading, setGrantLoading] = useState(false);

  // Edit Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    user_name: "",
    university: "",
    college: "",
    department: "",
    year: "1",
    is_premium: false,
  });
  const { colleges: editColleges } = useColleges(editForm.university);

  const [notification, setNotification] = useState(null);

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
        headers: { Authorization: `Bearer ${token}` }
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

  const fetchUndoStatus = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/users/increment-levels/undo-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUndoStatus(data.canUndo ? data : null);
      }
    } catch (err) {
      console.error("Error checking undo status:", err);
    }
  };

  // Check on mount whether a recent promotion can still be undone
  // (e.g. admin navigated away and came back).
  useEffect(() => {
    fetchUndoStatus();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || "",
      user_name: user.user_name || "",
      university: user.university || "",
      college: user.college || "",
      department: user.department || "",
      year: user.year ? String(user.year) : "1",
      is_premium: Boolean(user.is_premium),
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) throw new Error("Failed to update user profile");

      setSelectedUser(null);
      setNotification({ type: "success", text: "User profile updated successfully!" });
      setTimeout(() => setNotification(null), 4000);
      fetchUsers();
    } catch (err) {
      setNotification({ type: "error", text: `Error updating user: ${err.message}` });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const [deleteUserDialog, setDeleteUserDialog] = useState(null);

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

      setNotification({ type: "success", text: `User ${name || id} deleted successfully.` });
      setTimeout(() => setNotification(null), 4000);
      fetchUsers();
    } catch (err) {
      setNotification({ type: "error", text: `Error deleting user: ${err.message}` });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleConfirmClearAllFavourites = async () => {
    setIsClearingFavs(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/users/clear-all-favourites`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to clear favourite courses");

      setIsClearFavsModalOpen(false);
      setNotification({ type: "success", text: "Successfully cleared favourite courses for ALL users on the platform!" });
      setTimeout(() => setNotification(null), 5000);
      fetchUsers();
    } catch (err) {
      setNotification({ type: "error", text: `Error clearing favourites: ${err.message}` });
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

      const res = await fetch(`${API_BASE_URL}/api/admin/users/increment-levels`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to promote user levels");

      setIsIncrementLevelModalOpen(false);
      setNotification({
        type: "success",
        text: data.message || `Successfully promoted ${data.updatedCount} users to their next level!`,
      });
      setTimeout(() => setNotification(null), 5000);
      fetchUsers();
      fetchUndoStatus();
    } catch (err) {
      setNotification({ type: "error", text: `Error promoting levels: ${err.message}` });
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

      const res = await fetch(`${API_BASE_URL}/api/admin/users/increment-levels/undo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to undo level promotion");

      setIsUndoModalOpen(false);
      setUndoStatus(null);
      setNotification({
        type: "success",
        text: data.message || `Successfully reverted ${data.revertedCount} users to their previous level!`,
      });
      setTimeout(() => setNotification(null), 5000);
      fetchUsers();
    } catch (err) {
      setNotification({ type: "error", text: `Error undoing promotion: ${err.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsUndoingLevel(false);
    }
  };

  // ---------------------------------------------------------------------
  // Feature B: Grant Free Days UI
  // ---------------------------------------------------------------------
  const openGrantModal = async (u) => {
    setGrantModalUser(u);
    setGrantPreset("contribution");
    setGrantReasonText("");
    setGrantDays(7);
    setGrantLoading(false);
    setGrantTargetInfo(null);

    try {
      const { data: accessRow, error } = await supabase
        .from("premium_access")
        .select("expires_at, active")
        .eq("user_id", u.id)
        .maybeSingle();
      if (error) throw error;

      const now = new Date();
      const isTempActive =
        !!accessRow && accessRow.active && new Date(accessRow.expires_at) > now;

      // Full-semester detection rule: is_premium=true AND NO premium_access row
      // (redeem_premium_code explicitly DELETES premium_access for full-semester codes)
      const isFullSemester = Boolean(u.is_premium) && !accessRow;

      setGrantTargetInfo({
        user: u,
        isFullSemester,
        isTempActive,
        hasAccessRow: !!accessRow,
        expiresAt: accessRow?.expires_at ? new Date(accessRow.expires_at) : null,
      });
    } catch {
      // Fallback to optimistic data so the modal still opens
      setGrantTargetInfo({
        user: u,
        isFullSemester:   false,
        isTempActive:      false,
        hasAccessRow:      false,
        expiresAt:         null,
      });
    }
  };

  const closeGrantModal = () => {
    setGrantModalUser(null);
    setGrantTargetInfo(null);
  };

  const handleConfirmGrantDays = async () => {
    if (!grantModalUser || !grantTargetInfo) return;
    if (grantTargetInfo.isFullSemester) return;

    const reason =
      grantPreset === "contribution"
        ? "Material Contribution"
        : grantReasonText.trim();

    if (!reason) {
      setNotification({ type: "error", text: "Please provide a reason for the grant." });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setGrantLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/premium-grants/grant-days`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: grantModalUser.id,
          reason,
          days:    grantDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to grant premium days");
      }

      closeGrantModal();
      setNotification({
        type: "success",
        text: data.message
          || `Granted ${data.days_added ?? grantDays} premium days to ${grantModalUser.full_name || grantModalUser.user_name}!`,
      });
      setTimeout(() => setNotification(null), 5000);
      fetchUsers();
    } catch (err) {
      setNotification({ type: "error", text: `Error granting premium days: ${err.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setGrantLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            User Management & Overrides
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Search student profiles, grant/revoke premium access, edit academic details, and manage course access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsIncrementLevelModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Promote All Levels (+1)
          </button>

          {undoStatus?.canUndo && (
            <button
              onClick={() => setIsUndoModalOpen(true)}
              title={`Promoted ${undoStatus.updatedCount} users on ${new Date(undoStatus.promotedAt).toLocaleString()}`}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-xl transition shadow-sm"
            >
              <Undo2 className="w-4 h-4 text-amber-400" />
              Undo Last Promotion
            </button>
          )}

          <button
            onClick={() => setIsClearFavsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <HeartOff className="w-4 h-4 text-red-400" />
            Clear All Users' Favourite Courses
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search by full name, username, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filter:</span>

          <select
            value={university}
            onChange={(e) => { setUniversity(e.target.value); setCollegeFilter(""); setPage(1); }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.id}</option>
            ))}
          </select>

          <select
            value={collegeFilter}
            onChange={(e) => { setCollegeFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={!university}
          >
            <option value="">{university ? "All Colleges" : "Select University First"}</option>
            {filterColleges.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Levels</option>
            {LEVEL_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>

          <select
            value={premiumFilter}
            onChange={(e) => { setPremiumFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Users</option>
            <option value="true">Premium Users Only</option>
            <option value="false">Free Users Only</option>
          </select>

          {(university || collegeFilter || yearFilter || premiumFilter) && (
            <button
              onClick={() => { setUniversity(""); setCollegeFilter(""); setYearFilter(""); setPremiumFilter(""); setPage(1); }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold transition"
            >
              <X className="w-3 h-3" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading student profiles...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No user accounts found matching query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">University</th>
                  <th className="py-3 px-4">College / Dept</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Streak</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{u.full_name || u.user_name || "Unnamed User"}</div>
                      <div className="text-[11px] text-slate-400">{u.email || u.user_name || u.id}</div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-indigo-300">{u.university || "—"}</td>
                    <td className="py-3.5 px-4 text-slate-300">{u.college || "-"} / {u.department || "-"}</td>
                    <td className="py-3.5 px-4 text-slate-300">{formatLevel(u.year)}</td>

                    <td className="py-3.5 px-4">
                      {u.is_premium ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Crown className="w-3 h-3" /> Premium
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          Free Tier
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-amber-400">🔥 {u.streak || 0}</td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openGrantModal(u)}
                          className={`p-1.5 rounded-lg transition ${
                            u.is_premium
                              ? "text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                              : "text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                          }`}
                          title="Grant Free Premium Days"
                        >
                          <Gift className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.full_name || u.user_name)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-bold text-white">{users.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{" "}
            <span className="font-bold text-white">{Math.min(page * limit, total)}</span> of{" "}
            <span className="font-bold text-white">{total.toLocaleString()}</span> accounts
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="font-semibold text-slate-300 px-2">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">Edit User Profile</h2>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Full Name</label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Username</label>
                  <input
                    type="text"
                    value={editForm.user_name}
                    onChange={(e) => setEditForm({ ...editForm, user_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">University</label>
                  <select
                    value={editForm.university}
                    onChange={(e) => setEditForm({ ...editForm, university: e.target.value, college: "" })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select University</option>
                    {universities.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.id}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Level</label>
                  <select
                    value={editForm.year}
                    onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {LEVEL_OPTIONS.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">College</label>
                  <select
                    value={editForm.college}
                    onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                    disabled={!editForm.university}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">{editForm.university ? "Select College" : "Select University First"}</option>
                    {editColleges.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Premium Access Toggle */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Crown className="w-4 h-4" /> Grant Premium Access
                  </div>
                  <div className="text-[10px] text-slate-400">Manually override user premium status</div>
                </div>
                <input
                  type="checkbox"
                  checked={editForm.is_premium}
                  onChange={(e) => setEditForm({ ...editForm, is_premium: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Favourites Modal */}
      {isClearFavsModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-7 h-7 shrink-0 text-red-400" />
              <h2 className="text-base font-bold text-white">Clear All Favourite Courses</h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to <strong className="text-red-400">clear all favourite courses</strong> for <strong className="text-white">ALL users</strong> on the platform at once?
            </p>

            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 space-y-1">
              <div className="font-bold">What this action does:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
                <li>Resets <code className="bg-slate-800 px-1 rounded text-red-300">favourite_courses</code> array to empty for all student profiles.</li>
                <li>Clears every user's saved course list from their homepage dashboard.</li>
                <li>Records an audit log entry.</li>
              </ul>
            </div>

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
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {isClearingFavs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <HeartOff className="w-4 h-4" />}
                Yes, Clear All Favourites
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Increment Level Modal */}
      {isIncrementLevelModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-indigo-400 border-b border-slate-800 pb-3">
              <TrendingUp className="w-7 h-7 shrink-0 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Promote All Users Level (+1)</h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to <strong className="text-indigo-400">promote all student levels by +1 level</strong> platform-wide?
            </p>

            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 space-y-1.5">
              <div className="font-bold">Promotion Rules:</div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                <li>100 Level (100L) → <strong>200 Level (200L)</strong></li>
                <li>200 Level (200L) → <strong>300 Level (300L)</strong></li>
                <li>300 Level (300L) → <strong>400 Level (400L)</strong></li>
                <li><strong className="text-amber-400">400 Level (400L):</strong> Will remain in 400L (unchanged).</li>
              </ul>
            </div>

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
                Yes, Promote Everyone +1
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo Increment Level Modal */}
      {isUndoModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-400 border-b border-slate-800 pb-3">
              <Undo2 className="w-7 h-7 shrink-0 text-amber-400" />
              <h2 className="text-base font-bold text-white">Undo Last Promotion</h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will revert <strong className="text-amber-400">{undoStatus?.updatedCount ?? 0} users</strong> back to
              the level they were at before the last "Promote All Levels" action
              {undoStatus?.promotedAt ? ` (run on ${new Date(undoStatus.promotedAt).toLocaleString()})` : ""}.
            </p>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Note
              </div>
              <p className="text-[11px] text-slate-300">
                This only reverts the most recent promotion, and only within 24 hours of it running. Any manual level
                edits made to individual users since then will NOT be restored.
              </p>
            </div>

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
                Yes, Undo Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Temporary Premium Modal (Feature B) */}
      {grantModalUser && grantTargetInfo && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-400" />
                Grant Temporary Premium
              </h2>
              <button onClick={closeGrantModal} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target summary */}
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Target</span>
                <span className="text-white font-bold">
                  {grantModalUser.full_name || grantModalUser.user_name || "Unnamed User"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">University / Level</span>
                <span className="text-slate-300">
                  {grantModalUser.university || "—"} · {formatLevel(grantModalUser.year)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold">Plan Status</span>
                <span>
                  {grantTargetInfo.isFullSemester ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Crown className="w-3 h-3" /> Full Semester
                    </span>
                  ) : grantTargetInfo.isTempActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      Temp active · expires {grantTargetInfo.expiresAt?.toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      Free Tier
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Full-semester block banner */}
            {grantTargetInfo.isFullSemester && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs">
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Full-semester user detected
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  This user already has <strong className="text-amber-300">permanent full-semester premium</strong> (not
                  temporary). A free days grant is not required — their access never expires.
                </p>
              </div>
            )}

            {/* Reason + Day picker form */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Reason for grant</label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    grantPreset === "contribution"
                      ? "bg-slate-800 border-emerald-500/50 text-white"
                      : "bg-slate-950/50 border-slate-800 text-slate-400"
                  }`}>
                    <input
                      type="radio"
                      name="grantReason"
                      checked={grantPreset === "contribution"}
                      onChange={() => setGrantPreset("contribution")}
                      className="accent-emerald-500"
                    />
                    <span className="font-semibold text-[11px]">Material Contribution</span>
                  </label>
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                    grantPreset === "other"
                      ? "bg-slate-800 border-emerald-500/50 text-white"
                      : "bg-slate-950/50 border-slate-800 text-slate-400"
                  }`}>
                    <input
                      type="radio"
                      name="grantReason"
                      checked={grantPreset === "other"}
                      onChange={() => setGrantPreset("other")}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div className="flex-1 space-y-1.5">
                      <span className="font-semibold text-[11px]">Other reason</span>
                      <input
                        type="text"
                        placeholder="E.g. Bug bounty, Beta tester gift, Support resolution…"
                        value={grantReasonText}
                        onChange={(e) => { setGrantReasonText(e.target.value); setGrantPreset("other"); }}
                        onFocus={() => setGrantPreset("other")}
                        className="w-full px-2.5 py-1.5 bg-slate-950/70 border border-slate-700 rounded-lg text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Days to grant</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setGrantDays(d)}
                      className={`py-2 rounded-lg text-[11px] font-bold border transition ${
                        grantDays === d
                          ? "bg-emerald-500 text-slate-950 border-emerald-500"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={grantLoading}
                onClick={closeGrantModal}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={grantLoading || grantTargetInfo.isFullSemester}
                onClick={handleConfirmGrantDays}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {grantLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Gift className="w-4 h-4" />
                )}
                Confirm Grant ({grantDays}d)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirm Dialog */}
      {deleteUserDialog && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeleteUserDialog(null)}
          onConfirm={confirmDeleteUser}
          title="Delete User Account"
          message={`Are you sure you want to permanently delete user "${deleteUserDialog.name || deleteUserDialog.id}" and all their attempt records?`}
          detail="This action cannot be undone."
          variant="danger"
          confirmLabel="Yes, Delete User"
        />
      )}
    </div>
  );
}