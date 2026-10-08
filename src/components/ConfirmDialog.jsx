import React, { useEffect } from "react";
import { AlertTriangle, Trash2, Info, CheckCircle2, X, ShieldAlert } from "lucide-react";

/**
 * Global custom dialog — replaces window.confirm() and window.alert().
 *
 * Usage (confirm-style):
 *   <ConfirmDialog
 *     isOpen={bool}
 *     onClose={() => setOpen(false)}
 *     onConfirm={handleDelete}
 *     title="Delete Question"
 *     message="This action cannot be undone."
 *     variant="danger"
 *     confirmLabel="Delete"
 *     loading={bool}
 *   />
 *
 * Usage (alert-style — no onConfirm, just an OK button):
 *   <ConfirmDialog
 *     isOpen={bool}
 *     onClose={() => setOpen(false)}
 *     title="Error"
 *     message="Something went wrong."
 *     variant="info"
 *     cancelLabel="OK"
 *   />
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "",
  detail = "",
  variant = "danger",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
}) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const icons = {
    danger: <Trash2 className="w-5 h-5 text-rose-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    info: <Info className="w-5 h-5 text-indigo-400" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    caution: <ShieldAlert className="w-5 h-5 text-orange-400" />,
  };

  const iconBg = {
    danger: "bg-rose-500/15 border-rose-500/30",
    warning: "bg-amber-500/15 border-amber-500/30",
    info: "bg-indigo-500/15 border-indigo-500/30",
    success: "bg-emerald-500/15 border-emerald-500/30",
    caution: "bg-orange-500/15 border-orange-500/30",
  };

  const confirmBtnClass = {
    danger: "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20",
    warning: "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20",
    info: "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20",
    success: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20",
    caution: "bg-orange-600 hover:bg-orange-500 shadow-orange-600/20",
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" />

      {/* Dialog panel */}
      <div
        className="relative bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        style={{ animation: "dialogIn 0.15s ease-out" }}
      >
        <style>{`
          @keyframes dialogIn {
            from { opacity: 0; transform: scale(0.95) translateY(-8px); }
            to   { opacity: 1; transform: scale(1)   translateY(0);     }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${
              iconBg[variant] || iconBg.info
            }`}
          >
            {icons[variant] || icons.info}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="dialog-title"
              className="text-sm font-bold text-white leading-tight"
            >
              {title}
            </h2>
            {message && (
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {message}
              </p>
            )}
            {detail && (
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {detail}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800" />

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            {cancelLabel}
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-white rounded-xl text-xs font-semibold shadow-lg transition flex items-center gap-2 disabled:opacity-60 ${
                confirmBtnClass[variant] || confirmBtnClass.info
              }`}
            >
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
