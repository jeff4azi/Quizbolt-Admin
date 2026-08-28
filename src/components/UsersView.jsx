import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

// College options per university — extend as your schema grows
const COLLEGE_MAP = {
  TASUED: ["COSIT", "COSMAS", "COAES", "COSPED", "COVSED", "COHSS"],
  LASU: [
    "Faculty of Arts",
    "Faculty of Education",
    "Faculty of Engineering",
    "Faculty of Law",
    "Faculty of Management Sciences",
    "Faculty of Science",
    "Faculty of Social Sciences",
  ],
  BOUESTI: [
    "Faculty of Engineering",
    "Faculty of Environmental Sciences",
    "Faculty of Pure & Applied Sciences",
    "Faculty of Management Sciences",
  ],
};

const LEVEL_OPTIONS = ["100", "200", "300", "400", "500"];

export default function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [university, setUniversity] = useState("");
  const [premiumFilter, setPremiumFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  // Clear All Favourites Modal State
  const [isClearFavsModalOpen, setIsClearFavsModalOpen] = useState(false);
  const [isClearingFavs, setIsClearingFavs] = useState(false);

  // Increment Level Modal State
  const [isIncrementLevelModalOpen, setIsIncrementLevelModalOpen] =
    useState(false);
  const [isIncrementingLevel, setIsIncrementingLevel] = useState(false);

  // Undo Promotion State
  const [undoStatus, setUndoStatus] = useState(null); // { canUndo, updatedCount, promotedAt }
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [isUndoingLevel, setIsUndoingLevel] = useState(false);

  // Edit Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    user_name: "",
    university: "",
    college: "",
    department: "",
    year: "100",
    is_premium: false,
  });

  const [notification, setNotification] = useState(null);

  const fetchUsers = useCallback(async () => {
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
  }, [page, limit, search, university, premiumFilter, collegeFilter, yearFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchUndoStatus = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/increment-levels/undo-status`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

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
      university: user.university || "TASUED",
      college: user.college || "",
      department: user.department || "",
      year: user.year ? String(user.year) : "100",
      is_premium: Boolean(user.is_premium),
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${selectedUser.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editForm),
        },
      );

      if (!res.ok) throw new Error("Failed to update user profile");

      setSelectedUser(null);
      setNotification({
        type: "success",
        text: "User profile updated successfully!",
      });
      setTimeout(() => setNotification(null), 4000);
      fetchUsers();
    } catch (err) {
      alert(`Error updating user: ${err.message}`);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (
      !window.confirm(
        `CAUTION: Are you sure you want to permanently delete user "${name || id}" and all their attempt records?`,
      )
    )
      return;

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete user");

      setNotification({
        type: "success",
        text: `User ${name || id} deleted successfully.`,
      });
      setTimeout(() => setNotification(null), 4000);
      fetchUsers();
    } catch (err) {
      alert(`Error deleting user: ${err.message}`);
    }
  };

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
        },
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
      alert(`Error clearing favourites: ${err.message}`);
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
        },
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
      alert(`Error promoting levels: ${err.message}`);
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
        },
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
      alert(`Error undoing promotion: ${err.message}`);
    } finally {
      setIsUndoingLevel(false);
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
            Search student profiles, grant/revoke premium access, edit academic
            details, and manage course access.
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
          <button onClick={() => setNotification(null)}>
            <X className="w-4 h-4" />
          </button>
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
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          <select
            value={university}
            onChange={(e) => {
              setUniversity(e.target.value);
              setCollegeFilter("");
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Universities</option>
            <option value="TASUED">TASUED</option>
            <option value="LASU">LASU</option>
            <option value="BOUESTI">BOUESTI</option>
          </select>

          <select
            value={collegeFilter}
            onChange={(e) => {
              setCollegeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={!university}
          >
            <option value="">
              {university ? "All Colleges" : "Select University First"}
            </option>
            {university &&
              (COLLEGE_MAP[university] || []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Levels</option>
            {LEVEL_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {l} Level
              </option>
            ))}
          </select>

          <select
            value={premiumFilter}
            onChange={(e) => {
              setPremiumFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Users</option>
            <option value="true">Premium Users Only</option>
            <option value="false">Free Users Only</option>
          </select>

          {(university || collegeFilter || yearFilter || premiumFilter) && (
            <button
              onClick={() => {
                setUniversity("");
                setCollegeFilter("");
                setYearFilter("");
                setPremiumFilter("");
                setPage(1);
              }}
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
          <div className="p-12 text-center text-slate-400">
            Loading student profiles...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No user accounts found matching query.
          </div>
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
                      <div className="font-bold text-white">
                        {u.full_name || u.user_name || "Unnamed User"}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {u.email || u.user_name || u.id}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-indigo-300">
                      {u.university || "TASUED"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {u.college || "-"} / {u.department || "-"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {u.year ? `${u.year} L` : "100 L"}
                    </td>

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

                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      🔥 {u.streak || 0}
                    </td>

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
                          onClick={() =>
                            handleDeleteUser(u.id, u.full_name || u.user_name)
                          }
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
            accounts
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="font-semibold text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
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
              <h2 className="text-base font-bold text-white">
                Edit User Profile
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    University
                  </label>
                  <select
                    value={editForm.university}
                    onChange={(e) =>
                      setEditForm({ ...editForm, university: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="TASUED">TASUED</option>
                    <option value="LASU">LASU</option>
                    <option value="BOUESTI">BOUESTI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Level
                  </label>
                  <select
                    value={editForm.year}
                    onChange={(e) =>
                      setEditForm({ ...editForm, year: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    College
                  </label>
                  <input
                    type="text"
                    value={editForm.college}
                    onChange={(e) =>
                      setEditForm({ ...editForm, college: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
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
                  <div className="text-[10px] text-slate-400">
                    Manually override user premium status
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editForm.is_premium}
                  onChange={(e) =>
                    setEditForm({ ...editForm, is_premium: e.target.checked })
                  }
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
              <h2 className="text-base font-bold text-white">
                Clear All Favourite Courses
              </h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to{" "}
              <strong className="text-red-400">
                clear all favourite courses
              </strong>{" "}
              for <strong className="text-white">ALL users</strong> on the
              platform at once?
            </p>

            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 space-y-1">
              <div className="font-bold">What this action does:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
                <li>
                  Resets{" "}
                  <code className="bg-slate-800 px-1 rounded text-red-300">
                    favourite_courses
                  </code>{" "}
                  array to empty for all student profiles.
                </li>
                <li>
                  Clears every user's saved course list from their homepage
                  dashboard.
                </li>
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
                {isClearingFavs ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <HeartOff className="w-4 h-4" />
                )}
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
              <h2 className="text-base font-bold text-white">
                Promote All Users Level (+1)
              </h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to{" "}
              <strong className="text-indigo-400">
                promote all student levels by +1 level
              </strong>{" "}
              platform-wide?
            </p>

            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 space-y-1.5">
              <div className="font-bold">Promotion Rules:</div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-300">
                <li>
                  100 Level (100L) → <strong>200 Level (200L)</strong>
                </li>
                <li>
                  200 Level (200L) → <strong>300 Level (300L)</strong>
                </li>
                <li>
                  300 Level (300L) → <strong>400 Level (400L)</strong>
                </li>
                <li>
                  <strong className="text-amber-400">400 Level (400L):</strong>{" "}
                  Will remain in 400L (unchanged).
                </li>
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
                {isIncrementingLevel ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
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
              <h2 className="text-base font-bold text-white">
                Undo Last Promotion
              </h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will revert{" "}
              <strong className="text-amber-400">
                {undoStatus?.updatedCount ?? 0} users
              </strong>{" "}
              back to the level they were at before the last "Promote All
              Levels" action
              {undoStatus?.promotedAt
                ? ` (run on ${new Date(undoStatus.promotedAt).toLocaleString()})`
                : ""}
              .
            </p>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Note
              </div>
              <p className="text-[11px] text-slate-300">
                This only reverts the most recent promotion, and only within 24
                hours of it running. Any manual level edits made to individual
                users since then will NOT be restored.
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
                {isUndoingLevel ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Undo2 className="w-4 h-4" />
                )}
                Yes, Undo Promotion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
