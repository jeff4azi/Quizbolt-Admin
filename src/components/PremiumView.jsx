import React, { useState, useEffect } from "react";
import { Crown, Key, Download, Plus, Check, RefreshCw, ChevronLeft, ChevronRight, X, AlertTriangle, ShieldAlert, Copy, Filter, Sparkles, Clock, Trash2 } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function PremiumView() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  
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
  const [deleteTarget, setDeleteTarget] = useState("active"); // 'active' (current tab) or 'both'
  const [isDeletingCodes, setIsDeletingCodes] = useState(false);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams({ page, limit, type: codeType });
      if (usedFilter === "used") params.append("used", "true");
      if (usedFilter === "unused") params.append("used", "false");

      const res = await fetch(`${API_BASE_URL}/api/admin/premium-codes?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching codes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [page, usedFilter, codeType]);

  const handleCopyCode = (codeText, id) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleCopyUnusedCodes = () => {
    const unusedList = codes.filter(c => !c.used).map(c => c.code);
    if (unusedList.length === 0) {
      setNotification({ type: "warning", text: `No unused ${codeType === "temp" ? "temporary" : "full"} codes available on this page to copy.` });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    navigator.clipboard.writeText(unusedList.join("\n"));
    setNotification({ type: "success", text: `Copied ${unusedList.length} unused ${codeType === "temp" ? "temporary" : "full"} code(s) to clipboard!` });
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

      const res = await fetch(`${API_BASE_URL}/api/admin/premium-codes/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: parseInt(quantity, 10), type: genType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate codes");

      setIsGeneratorOpen(false);
      setNotification({
        type: "success",
        text: `Generated ${data.count} ${genType === "temp" ? "temporary" : "permanent"} premium redemption codes!`,
      });
      setTimeout(() => setNotification(null), 4000);

      if (genType !== codeType) {
        setCodeType(genType);
      } else {
        fetchCodes();
      }
    } catch (err) {
      alert(`Error generating codes: ${err.message}`);
    }
  };

  const handleConfirmRevokeAll = async () => {
    setIsRevoking(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/premium-grants/revoke-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revoke all premium access");

      setIsRevokeAllOpen(false);
      setNotification({ type: "success", text: "Successfully revoked premium access for ALL users and cleared premium_access records." });
      setTimeout(() => setNotification(null), 5000);
      fetchCodes();
    } catch (err) {
      alert(`Error revoking premium: ${err.message}`);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleConfirmDeleteAllCodes = async () => {
    setIsDeletingCodes(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const targetType = deleteTarget === "both" ? "all" : codeType;

      const res = await fetch(`${API_BASE_URL}/api/admin/premium-codes/delete-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: targetType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete codes");

      setIsDeleteAllCodesOpen(false);
      setNotification({
        type: "success",
        text: `Successfully deleted all ${targetType === "all" ? "full and temporary premium" : targetType} redemption codes!`,
      });
      setTimeout(() => setNotification(null), 5000);
      fetchCodes();
    } catch (err) {
      alert(`Error deleting codes: ${err.message}`);
    } finally {
      setIsDeletingCodes(false);
    }
  };

  const exportCodesCsv = () => {
    if (codes.length === 0) return;
    let csv = "Code,Type,Status,Used By,Created At\n";
    codes.forEach(c => {
      csv += `"${c.code}","${codeType === "temp" ? "Temporary" : "Full Premium"}","${c.used ? "Used" : "Unused"}","${c.used_by_email || "-"}","${c.created_at}"\n`;
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
            Switch between Full Premium Codes and Temporary Codes. Generate, copy, export, and monitor access codes.
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
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            Bulk Code Generator
          </button>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
          notification.type === "warning"
            ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
        }`}>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Code Category Selection Tabs (Full Premium vs Temporary Codes) */}
      <div className="flex items-center justify-between gap-4 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => { setCodeType("full"); setPage(1); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition ${
              codeType === "full"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Full Premium Codes (Permanent)
          </button>

          <button
            onClick={() => { setCodeType("temp"); setPage(1); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition ${
              codeType === "temp"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Clock className="w-4 h-4" />
            Temporary Premium Codes (Trial)
          </button>
        </div>

        <div className="hidden lg:block text-xs text-slate-400 pr-3">
          Currently Viewing:{" "}
          <span className={`font-bold ${codeType === "temp" ? "text-cyan-400" : "text-amber-400"}`}>
            {codeType === "temp" ? "Temporary Access Codes (temp_premium_codes)" : "Full Premium Codes (premium_codes)"}
          </span>
        </div>
      </div>

      {/* Filter Tabs & Badge Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <span className="text-xs text-slate-400 font-semibold">Filter Usage Status:</span>
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => { setUsedFilter("all"); setPage(1); }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                usedFilter === "all"
                  ? codeType === "temp" ? "bg-cyan-500 text-slate-950" : "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Codes
            </button>
            <button
              onClick={() => { setUsedFilter("unused"); setPage(1); }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                usedFilter === "unused"
                  ? "bg-emerald-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Unused Only
            </button>
            <button
              onClick={() => { setUsedFilter("used"); setPage(1); }}
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
          Showing: <span className={`font-semibold ${codeType === "temp" ? "text-cyan-400" : "text-amber-400"}`}>
            {codeType === "temp" ? "Temporary Trial Codes" : "Full Premium Codes"}
          </span>
        </div>
      </div>

      {/* Codes Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading {codeType === "temp" ? "temporary" : "premium"} codes...</div>
        ) : codes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No {codeType === "temp" ? "temporary" : "premium"} codes found. Generate some above.
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
                    <td className={`py-3.5 px-4 font-mono font-bold tracking-wider text-sm ${
                      codeType === "temp" ? "text-cyan-400" : "text-amber-400"
                    }`}>
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
                      {codeType === "temp" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          Temp Trial
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Full Premium
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
                      {c.used_at ? new Date(c.used_at).toLocaleDateString() : "-"}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : "-"}
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
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
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
            Showing <span className="font-bold text-white">{codes.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{" "}
            <span className="font-bold text-white">{Math.min(page * limit, total)}</span> of{" "}
            <span className="font-bold text-white">{total.toLocaleString()}</span> {codeType === "temp" ? "temporary" : "full premium"} codes
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

      {/* Bulk Generator Modal */}
      {isGeneratorOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Generate Codes
              </h2>
              <button onClick={() => setIsGeneratorOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleGenerateCodes} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Code Category</label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="full">Full Premium Code (premium_codes)</option>
                  <option value="temp">Temporary Code (temp_premium_codes)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Quantity to Generate (Max 500)</label>
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
                Note: Generated codes will be saved in the <code className="bg-slate-800 px-1 py-0.5 rounded font-mono">{genType === "temp" ? "temp_premium_codes" : "premium_codes"}</code> table.
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
              <h2 className="text-base font-bold text-white">Revoke Everyone's Premium</h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to <strong className="text-red-400">revoke premium access for ALL users</strong> app-wide?
            </p>

            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 space-y-1">
              <div className="font-bold">What this action does:</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
                <li>Sets <code className="bg-slate-800 px-1 rounded text-red-300">is_premium = false</code> on all student profiles.</li>
                <li>Deletes all rows from the <code className="bg-slate-800 px-1 rounded text-red-300">premium_access</code> table.</li>
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
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isRevoking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
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
              <button onClick={() => setIsDeleteAllCodesOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Select which code database table to clear. This action will permanently remove all generated codes.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400">Deletion Scope</label>
              <div className="space-y-2">
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  deleteTarget === "active" ? "bg-slate-800 border-amber-500/50 text-white" : "bg-slate-950/50 border-slate-800 text-slate-400"
                }`}>
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
                      Delete Current Tab Codes ({codeType === "temp" ? "temp_premium_codes" : "premium_codes"})
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Clears only the {codeType === "temp" ? "temporary trial" : "full premium"} codes table.
                    </div>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  deleteTarget === "both" ? "bg-red-500/10 border-red-500/50 text-red-300" : "bg-slate-950/50 border-slate-800 text-slate-400"
                }`}>
                  <input
                    type="radio"
                    name="deleteScope"
                    value="both"
                    checked={deleteTarget === "both"}
                    onChange={() => setDeleteTarget("both")}
                    className="accent-red-500"
                  />
                  <div>
                    <div className="font-bold text-xs text-red-400">
                      Delete ALL Codes (Both Premium & Temp Tables)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Clears both premium_codes AND temp_premium_codes tables entirely.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
              ⚠️ Warning: Deleting codes will remove unused redemption keys. Already redeemed access granted to users remains active.
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
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingCodes ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Yes, Delete Selected Codes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

