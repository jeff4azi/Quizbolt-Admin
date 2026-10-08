import React, { useState, useEffect } from "react";
import {
  Crown,
  Key,
  Download,
  Plus,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  ShieldAlert,
  Copy,
  Filter,
  Sparkles,
  Clock,
  Trash2,
  BarChart3,
  GraduationCap,
  Wallet,
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import { useUniversities } from "../hooks/useUniversitiesAndColleges";

export default function PremiumView() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  // Real universities from Supabase (no more hardcoded list)
  const { universities } = useUniversities();

  // Category tab: 'full' (Permanent) vs 'temp' (Temporary/Trial)
  const [codeType, setCodeType] = useState("full");
  const [usedFilter, setUsedFilter] = useState("all"); // 'all', 'unused', 'used'
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  // Generator Modal
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [genType, setGenType] = useState("full");
  const [quantity, setQuantity] = useState("20");
  const [notification, setNotification] = useState(null);

  // Revoke All Modal
  const [isRevokeAllOpen, setIsRevokeAllOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // Delete All Codes Modal
  const [isDeleteAllCodesOpen, setIsDeleteAllCodesOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState("active"); // 'active' (current tab) or 'all'
  const [isDeletingCodes, setIsDeletingCodes] = useState(false);

  // University overview stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [uniFilter, setUniFilter] = useState("");

  const fetchCodes = async () => {
    setLoading(true);
    // Clear stale codes immediately so switching tabs never shows data from another tier
    setCodes([]);
    setTotal(0);
    setTotalPages(1);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams({ page, limit, type: codeType });
      if (usedFilter === "used") params.append("used", "true");
      if (usedFilter === "unused") params.append("used", "false");

      const res = await fetch(
        `${API_BASE_URL}/api/admin/premium-codes?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        // Table likely doesn't exist yet (migration not pushed) — stay empty, don't leak prior tab's data
        console.warn(`Failed to fetch ${codeType} codes: HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("Error fetching codes:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      const params = uniFilter
        ? `?university=${encodeURIComponent(uniFilter)}`
        : "";
      const res = await fetch(
        `${API_BASE_URL}/api/admin/premium-codes/stats${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error("Error fetching code stats:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [page, usedFilter, codeType]);
  useEffect(() => {
    fetchStats();
  }, [uniFilter]);

  const handleCopyCode = (codeText, id) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const tierLabel = (t) =>
    t === "full"
      ? "full premium"
      : t === "temp"
        ? "14-day temp"
        : "3-day budget";

  const handleCopyUnusedCodes = () => {
    const unusedList = codes.filter((c) => !c.used).map((c) => c.code);
    if (unusedList.length === 0) {
      setNotification({
        type: "warning",
        text: `No unused ${tierLabel(codeType)} codes available on this page to copy.`,
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    navigator.clipboard.writeText(unusedList.join("\n"));
    setNotification({
      type: "success",
      text: `Copied ${unusedList.length} unused ${tierLabel(codeType)} code(s) to clipboard!`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const openGeneratorModal = () => {
    setGenType(codeType);
    setIsGeneratorOpen(true);
  };

  const handleGenerateCodes = async (e) => {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/premium-codes/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantity: parseInt(quantity, 10),
            type: genType,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate codes");

      setIsGeneratorOpen(false);
      setNotification({
        type: "success",
        text: `Generated ${data.count} ${tierLabel(genType)} premium redemption codes!`,
      });
      setTimeout(() => setNotification(null), 4000);

      if (genType !== codeType) {
        setCodeType(genType);
      } else {
        fetchCodes();
      }
    } catch (err) {
      setNotification({ type: "error", text: `Error generating codes: ${err.message}` });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleConfirmRevokeAll = async () => {
    setIsRevoking(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/premium-grants/revoke-all`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to revoke all premium access");

      setIsRevokeAllOpen(false);
      setNotification({
        type: "success",
        text: "Successfully revoked premium access for ALL users and cleared premium_access records.",
      });
      setTimeout(() => setNotification(null), 5000);
      fetchCodes();
    } catch (err) {
      setNotification({ type: "error", text: `Error revoking premium: ${err.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleConfirmDeleteAllCodes = async () => {
    setIsDeletingCodes(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const targetType = deleteTarget === "all" ? "all" : codeType;

      const res = await fetch(
        `${API_BASE_URL}/api/admin/premium-codes/delete-all`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type: targetType }),
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete codes");

      setIsDeleteAllCodesOpen(false);
      setNotification({
        type: "success",
        text:
          targetType === "all"
            ? "Successfully deleted all premium redemption codes across all 3 tiers!"
            : `Successfully deleted all ${tierLabel(targetType)} redemption codes!`,
      });
      setTimeout(() => setNotification(null), 5000);
      fetchCodes();
    } catch (err) {
      setNotification({ type: "error", text: `Error deleting codes: ${err.message}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsDeletingCodes(false);
    }
  };

  const exportCodesCsv = () => {
    if (codes.length === 0) return;
    const typeLabel =
      codeType === "full"
        ? "Full Premium"
        : codeType === "temp"
          ? "14-Day Temp"
          : "3-Day Budget ₦500";
    let csv = "Code,Tier,Status,Used By,Created At\n";
    codes.forEach((c) => {
      csv += `"${c.code}","${typeLabel}","${c.used ? "Used" : "Unused"}","${c.used_by_email || "-"}","${c.created_at}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quizbolt-${codeType}-codes-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-400" />
              Monetization & Redemption Codes
            </h1>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Switch between Full Premium, 14-Day Temp, and ₦500 3-Day Budget
            Codes. Generate, copy, export, and monitor all redemption tiers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsDeleteAllCodesOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            Delete All Codes
          </button>

          <button
            onClick={() => setIsRevokeAllOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            Revoke Everyone's Premium
          </button>

          <button
            onClick={handleCopyUnusedCodes}
            disabled={codes.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition disabled:opacity-50"
          >
            <Copy className="w-4 h-4 text-emerald-400" />
            Copy Unused Codes
          </button>

          <button
            onClick={exportCodesCsv}
            disabled={codes.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-slate-400" />
            Export CSV
          </button>

          <button
            onClick={openGeneratorModal}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
          >
            <Plus className="w-4 h-4" />
            Bulk Code Generator
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            notification.type === "warning"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── University Code Redemption Overview ── */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-black text-white">
              Code Redemption Overview
            </h2>
          </div>
          <select
            value={uniFilter}
            onChange={(e) => setUniFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-auto"
          >
            <option value="">All Universities</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.id}
              </option>
            ))}
          </select>
        </div>

        {statsLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-500 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading stats...
          </div>
        ) : stats ? (
          <>
            {/* KPI Cards — 3 tiers × 2 metrics = 6 cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="p-3.5 rounded-xl border bg-amber-500/5 border-amber-500/20">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Full · Total
                </div>
                <div className="text-xl font-black text-amber-400 mt-1">
                  {(stats.full?.total ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Full · Used
                </div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {(stats.full?.used ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border bg-cyan-500/5 border-cyan-500/20">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  14d · Total
                </div>
                <div className="text-xl font-black text-cyan-400 mt-1">
                  {(stats.temp?.total ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  14d · Used
                </div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {(stats.temp?.used ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border bg-emerald-600/5 border-emerald-500/30">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  3d · Total
                </div>
                <div className="text-xl font-black text-emerald-500 mt-1">
                  {(stats.budget3d?.total ?? 0).toLocaleString()}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  3d · Used
                </div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {(stats.budget3d?.used ?? 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Redemption rates — 3 tiers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(() => {
                const fullRate =
                  (stats.full?.total ?? 0) > 0
                    ? (
                        ((stats.full.used ?? 0) / stats.full.total) *
                        100
                      ).toFixed(1)
                    : "0.0";
                const tempRate =
                  (stats.temp?.total ?? 0) > 0
                    ? (
                        ((stats.temp.used ?? 0) / stats.temp.total) *
                        100
                      ).toFixed(1)
                    : "0.0";
                const budget3dRate =
                  (stats.budget3d?.total ?? 0) > 0
                    ? (
                        ((stats.budget3d.used ?? 0) / stats.budget3d.total) *
                        100
                      ).toFixed(1)
                    : "0.0";
                return (
                  <>
                    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase mb-2">
                        Full Premium Redemption Rate
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-amber-400">
                          {fullRate}%
                        </span>
                        <span className="text-[10px] text-slate-500 mb-1">
                          {stats.full?.used ?? 0} / {stats.full?.total ?? 0}{" "}
                          codes
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(parseFloat(fullRate), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase mb-2">
                        14-Day Temp Redemption Rate
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-cyan-400">
                          {tempRate}%
                        </span>
                        <span className="text-[10px] text-slate-500 mb-1">
                          {stats.temp?.used ?? 0} / {stats.temp?.total ?? 0}{" "}
                          codes
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(parseFloat(tempRate), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase mb-2">
                        3-Day Budget Redemption Rate
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-black text-emerald-500">
                          {budget3dRate}%
                        </span>
                        <span className="text-[10px] text-slate-500 mb-1">
                          {stats.budget3d?.used ?? 0} /{" "}
                          {stats.budget3d?.total ?? 0} codes
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(parseFloat(budget3dRate), 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* University Breakdown Tables — 3 tiers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-700/40 text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> Full · by University
                </div>
                {(stats.full?.byUniversity ?? []).length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-[10px]">
                    No redemptions found
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/30">
                    {stats.full.byUniversity.map((row) => (
                      <div
                        key={row.university}
                        className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-slate-700/20 transition"
                      >
                        <span className="text-slate-200 font-semibold">
                          {row.university}
                        </span>
                        <span className="font-black text-amber-400">
                          {row.count} used
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-700/40 text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> 14d Temp · by
                  University
                </div>
                {(stats.temp?.byUniversity ?? []).length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-[10px]">
                    No redemptions found
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/30">
                    {stats.temp.byUniversity.map((row) => (
                      <div
                        key={row.university}
                        className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-slate-700/20 transition"
                      >
                        <span className="text-slate-200 font-semibold">
                          {row.university}
                        </span>
                        <span className="font-black text-cyan-400">
                          {row.count} used
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-700/40 text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" /> 3d Budget · by
                  University
                </div>
                {(stats.budget3d?.byUniversity ?? []).length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-[10px]">
                    No redemptions found
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/30">
                    {stats.budget3d.byUniversity.map((row) => (
                      <div
                        key={row.university}
                        className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-slate-700/20 transition"
                      >
                        <span className="text-slate-200 font-semibold">
                          {row.university}
                        </span>
                        <span className="font-black text-emerald-500">
                          {row.count} used
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">
            Unable to load stats
          </div>
        )}
      </div>

      {/* Code Category Selection Tabs (3 tiers now) */}
      <div className="flex items-center justify-between gap-4 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl flex-wrap lg:flex-nowrap">
        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              setCodeType("full");
              setPage(1);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
              codeType === "full"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Full Premium
          </button>

          <button
            onClick={() => {
              setCodeType("temp");
              setPage(1);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
              codeType === "temp"
                ? "bg-cyan-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Clock className="w-4 h-4" />
            14-Day Temp
          </button>

          <button
            onClick={() => {
              setCodeType("budget_3d");
              setPage(1);
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition ${
              codeType === "budget_3d"
                ? "bg-emerald-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Wallet className="w-4 h-4" />
            ₦500 · 3-Day
          </button>
        </div>

        <div className="hidden lg:block text-xs text-slate-400 pr-3 whitespace-nowrap">
          Currently Viewing:{" "}
          <span
            className={`font-bold ${
              codeType === "full"
                ? "text-amber-400"
                : codeType === "temp"
                  ? "text-cyan-400"
                  : "text-emerald-500"
            }`}
          >
            {codeType === "full"
              ? "Full Premium (premium_codes)"
              : codeType === "temp"
                ? "14-Day Temp (temp_premium_codes)"
                : "₦500 3-Day Budget (budget_3day_premium_codes)"}
          </span>
        </div>
      </div>

      {/* Filter Tabs & Badge Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <span className="text-xs text-slate-400 font-semibold">
            Filter Usage Status:
          </span>
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setUsedFilter("all");
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                usedFilter === "all"
                  ? codeType === "full"
                    ? "bg-amber-500 text-slate-950"
                    : codeType === "temp"
                      ? "bg-cyan-500 text-slate-950"
                      : "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Codes
            </button>
            <button
              onClick={() => {
                setUsedFilter("unused");
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                usedFilter === "unused"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Unused Only
            </button>
            <button
              onClick={() => {
                setUsedFilter("used");
                setPage(1);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                usedFilter === "used"
                  ? "bg-red-500 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Used Only
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-800">
          Showing:{" "}
          <span
            className={`font-semibold ${
              codeType === "full"
                ? "text-amber-400"
                : codeType === "temp"
                  ? "text-cyan-400"
                  : "text-emerald-500"
            }`}
          >
            {codeType === "full"
              ? "Full Premium Codes"
              : codeType === "temp"
                ? "14-Day Trial Codes"
                : "₦500 · 3-Day Budget Codes"}
          </span>
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            Loading {tierLabel(codeType)} codes...
          </div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No {tierLabel(codeType)} codes found. Generate some above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Redemption Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Used By User</th>
                  <th className="py-3 px-4">Redeemed Date</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td
                      className={`py-3.5 px-4 font-mono font-bold tracking-wider text-sm ${
                        codeType === "full"
                          ? "text-amber-400"
                          : codeType === "temp"
                            ? "text-cyan-400"
                            : "text-emerald-500"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{c.code}</span>
                        <button
                          onClick={() => handleCopyCode(c.code, c.id)}
                          title="Copy Code"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
                        >
                          {copiedCodeId === c.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {codeType === "full" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Full Premium
                        </span>
                      ) : codeType === "temp" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          14-Day Temp
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                          3-Day · ₦500
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.used ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                          Used
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Unused
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {c.used_by_email || c.used_by_user_id || "-"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {c.used_at
                        ? new Date(c.used_at).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString()
                        : "-"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleCopyCode(c.code, c.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          copiedCodeId === c.id
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                        }`}
                      >
                        {copiedCodeId === c.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />{" "}
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Code
                          </>
                        )}
                      </button>
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
              {codes.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-bold text-white">
              {Math.min(page * limit, total)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-white">
              {total.toLocaleString()}
            </span>{" "}
            {tierLabel(codeType)} codes
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

      {/* Bulk Generator Modal */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Generate Codes
              </h2>
              <button
                onClick={() => setIsGeneratorOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateCodes} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Code Category
                </label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="full">
                    Full Premium Code (premium_codes)
                  </option>
                  <option value="temp">
                    14-Day Temp Code (temp_premium_codes)
                  </option>
                  <option value="budget_3d">
                    ₦500 · 3-Day Budget Code (budget_3day_premium_codes)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Quantity to Generate (Max 500)
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px]">
                Note: Generated codes will be saved in the{" "}
                <code className="bg-slate-800 px-1 py-0.5 rounded font-mono">
                  {genType === "full"
                    ? "premium_codes"
                    : genType === "temp"
                      ? "temp_premium_codes"
                      : "budget_3day_premium_codes"}
                </code>{" "}
                table.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGeneratorOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold transition"
                >
                  Generate Codes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke All Premium Access Modal */}
      {isRevokeAllOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="w-7 h-7 shrink-0 text-red-400" />
              <h2 className="text-base font-bold text-white">
                Revoke Everyone's Premium
              </h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to{" "}
              <strong className="text-red-400">
                revoke premium access for ALL users
              </strong>{" "}
              app-wide?
            </p>

            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 space-y-1">
              <div className="font-bold">What this action does:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
                <li>
                  Sets{" "}
                  <code className="bg-slate-800 px-1 rounded text-red-300">
                    is_premium = false
                  </code>{" "}
                  on all student profiles.
                </li>
                <li>
                  Deletes all rows from the{" "}
                  <code className="bg-slate-800 px-1 rounded text-red-300">
                    premium_access
                  </code>{" "}
                  table.
                </li>
                <li>Records an audit log entry.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                disabled={isRevoking}
                onClick={() => setIsRevokeAllOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                disabled={isRevoking}
                onClick={handleConfirmRevokeAll}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {isRevoking ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
                Yes, Revoke All Premium
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete All Codes Modal */}
      {isDeleteAllCodesOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                Delete All Codes
              </h2>
              <button
                onClick={() => setIsDeleteAllCodesOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Select which code database table to clear. This action will
              permanently remove all generated codes.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400">
                Deletion Scope
              </label>
              <div className="space-y-2">
                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    deleteTarget === "active"
                      ? "bg-slate-800 border-amber-500/50 text-white"
                      : "bg-slate-950/50 border-slate-800 text-slate-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteScope"
                    value="active"
                    checked={deleteTarget === "active"}
                    onChange={() => setDeleteTarget("active")}
                    className="accent-amber-500"
                  />
                  <div>
                    <div className="font-bold text-xs">
                      Delete Current Tab Codes (
                      {codeType === "full"
                        ? "premium_codes"
                        : codeType === "temp"
                          ? "temp_premium_codes"
                          : "budget_3day_premium_codes"}
                      )
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Clears only the {tierLabel(codeType)} codes table.
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    deleteTarget === "all"
                      ? "bg-red-500/10 border-red-500/50 text-red-300"
                      : "bg-slate-950/50 border-slate-800 text-slate-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="deleteScope"
                    value="all"
                    checked={deleteTarget === "all"}
                    onChange={() => setDeleteTarget("all")}
                    className="accent-red-500"
                  />
                  <div>
                    <div className="font-bold text-xs text-red-400">
                      Delete ALL Codes (All 3 Tier Tables)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Clears premium_codes, temp_premium_codes, AND
                      budget_3day_premium_codes tables entirely.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
              ⚠️ Warning: Deleting codes will remove unused redemption keys.
              Already redeemed access granted to users remains active.
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                disabled={isDeletingCodes}
                onClick={() => setIsDeleteAllCodesOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingCodes}
                onClick={handleConfirmDeleteAllCodes}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingCodes ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Yes, Delete Selected Codes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
