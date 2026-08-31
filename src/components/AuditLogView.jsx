import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function AuditLogView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const params = new URLSearchParams({ page, limit });
      const res = await fetch(
        `${API_BASE_URL}/api/admin/audit-logs?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          Administrative Audit Log & Trail
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Chronological security audit trail of all sensitive admin actions,
          premium grants, and semester switches.
        </p>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            Loading audit history...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No audit logs recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin Email</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type / ID</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white font-sans">
                      {log.admin_email}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-sans">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {log.target_type}{" "}
                      {log.target_id ? `(${log.target_id})` : ""}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 max-w-md truncate">
                      {log.details ? JSON.stringify(log.details) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing{" "}
            <span className="font-bold text-white">
              {logs.length > 0 ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-bold text-white">
              {Math.min(page * limit, total)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-white">
              {total.toLocaleString()}
            </span>{" "}
            entries
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
    </div>
  );
}
