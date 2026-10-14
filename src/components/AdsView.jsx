import React, { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  X,
  Eye,
  MousePointer,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";
import ConfirmDialog from "./ConfirmDialog";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ctr(impressions, clicks) {
  if (!impressions) return "0.00%";
  return `${Math.round((clicks / impressions) * 10000) / 100}%`;
}

function adStatus(ad) {
  const now = new Date();
  if (!ad.active) return { label: "Inactive", color: "slate" };
  if (ad.starts_at && new Date(ad.starts_at) > now)
    return { label: "Scheduled", color: "amber" };
  if (ad.ends_at && new Date(ad.ends_at) <= now)
    return { label: "Expired", color: "red" };
  return { label: "Live", color: "emerald" };
}

const STATUS_COLORS = {
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/10  text-amber-400  border-amber-500/20",
  red: "bg-red-500/10    text-red-400    border-red-500/20",
  slate: "bg-slate-800     text-slate-400  border-slate-700",
};

const EMPTY_FORM = {
  title: "",
  advertiser_name: "",
  tracking_id: "",
  media_type: "image",
  media_url: "",
  link_type: "whatsapp",
  link_url: "",
  whatsapp_phone: "",
  whatsapp_message: "",
  duration_secs: 5,
  display_weight: 1,
  active: true,
  starts_at: "",
  ends_at: "",
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdsView() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    id: null,
    title: "",
  });
  const [copiedId, setCopiedId] = useState(null);
  const [expiring, setExpiring] = useState(false);

  // ── Auth token helper ──────────────────────────────────────────────────────
  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token;
  };

  const notify = (type, text) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 5000);
  };

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/promo-banners`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch ads");
      const data = await res.json();
      setAds(data);
    } catch (err) {
      notify("error", `Error loading ads: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // ── Summary KPIs ───────────────────────────────────────────────────────────
  const totalActive = ads.filter((a) => adStatus(a).label === "Live").length;
  const totalImpressions = ads.reduce((s, a) => s + (a.impressions || 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.clicks || 0), 0);

  // ── Open modal ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingAd(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (ad) => {
    setEditingAd(ad);
    setForm({
      title: ad.title || "",
      advertiser_name: ad.advertiser_name || "",
      tracking_id: ad.tracking_id || "",
      media_type: ad.media_type || "image",
      media_url: ad.media_url || "",
      link_type: ad.link_type || "whatsapp",
      link_url: ad.link_url || "",
      whatsapp_phone: ad.whatsapp_phone || "",
      whatsapp_message: ad.whatsapp_message || "",
      duration_secs: ad.duration_secs ?? 5,
      display_weight: ad.display_weight ?? 1,
      active: ad.active ?? true,
      starts_at: ad.starts_at ? ad.starts_at.slice(0, 16) : "",
      ends_at: ad.ends_at ? ad.ends_at.slice(0, 16) : "",
    });
    setIsModalOpen(true);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      const payload = {
        ...form,
        duration_secs: parseInt(form.duration_secs, 10) || 5,
        display_weight: parseInt(form.display_weight, 10) || 1,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        // Don't send tracking_id on edit — server ignores it anyway
        ...(editingAd ? { id: editingAd.id } : {}),
      };

      const res = await fetch(`${API_BASE_URL}/api/admin/promo-banners`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Save failed");
      }

      setIsModalOpen(false);
      notify(
        "success",
        `Ad ${editingAd ? "updated" : "created"} successfully.`,
      );
      fetchAds();
    } catch (err) {
      notify("error", `Error saving ad: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (ad) => {
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/admin/promo-banners/${ad.id}/toggle`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ active: !ad.active }),
        },
      );
      if (!res.ok) throw new Error("Toggle failed");
      // Optimistic update
      setAds((prev) =>
        prev.map((a) => (a.id === ad.id ? { ...a, active: !a.active } : a)),
      );
    } catch (err) {
      notify("error", `Error toggling ad: ${err.message}`);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (ad) => {
    setDeleteDialog({ isOpen: true, id: ad.id, title: ad.title });
  };

  const confirmDelete = async () => {
    const { id } = deleteDialog;
    setDeleteDialog({ isOpen: false, id: null, title: "" });
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/admin/promo-banners/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      notify("success", "Ad deleted.");
      fetchAds();
    } catch (err) {
      notify("error", `Error deleting ad: ${err.message}`);
    }
  };

  // ── Expire cron ────────────────────────────────────────────────────────────
  const handleExpire = async () => {
    setExpiring(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `${API_BASE_URL}/api/admin/promo-banners/expire`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      notify("success", `Expired ${data.expired ?? 0} ads.`);
      fetchAds();
    } catch (err) {
      notify("error", `Expire run failed: ${err.message}`);
    } finally {
      setExpiring(false);
    }
  };

  // ── Copy tracking ID ───────────────────────────────────────────────────────
  const copyTrackingId = (id) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-400" />
            Ad Campaigns
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Manage promo banners shown to free users. Supports weighted
            rotation, scheduling, and real-time tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExpire}
            disabled={expiring}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${expiring ? "animate-spin" : ""}`}
            />
            Run Expiry
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
          >
            <Plus className="w-4 h-4" /> Add Ad
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Live Ads",
            value: totalActive,
            icon: <Megaphone className="w-4 h-4 text-emerald-400" />,
          },
          {
            label: "Impressions",
            value: fmt(totalImpressions),
            icon: <Eye className="w-4 h-4 text-indigo-400" />,
          },
          {
            label: "Clicks",
            value: fmt(totalClicks),
            icon: <MousePointer className="w-4 h-4 text-amber-400" />,
          },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center gap-1"
          >
            {icon}
            <p className="text-lg font-black text-white">{value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}
        >
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Ads table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading ads…
          </div>
        ) : ads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No ads yet. Click <strong className="text-white">Add Ad</strong> to
            create the first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-bold">Ad</th>
                  <th className="text-left px-4 py-3 font-bold">Tracking ID</th>
                  <th className="text-center px-4 py-3 font-bold">Status</th>
                  <th className="text-right px-4 py-3 font-bold">Views</th>
                  <th className="text-right px-4 py-3 font-bold">Clicks</th>
                  <th className="text-right px-4 py-3 font-bold">CTR</th>
                  <th className="text-center px-4 py-3 font-bold">Weight</th>
                  <th className="text-center px-4 py-3 font-bold">Active</th>
                  <th className="text-right px-4 py-3 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => {
                  const status = adStatus(ad);
                  return (
                    <tr
                      key={ad.id}
                      className="border-b border-slate-800/60 hover:bg-slate-800/30 transition"
                    >
                      {/* Ad identity */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {ad.media_url && (
                            <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
                              <img
                                src={ad.media_url}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white text-[12px] leading-snug max-w-[160px] truncate">
                              {ad.title}
                            </p>
                            <p className="text-slate-500 text-[10px] truncate max-w-[160px]">
                              {ad.advertiser_name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Tracking ID */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyTrackingId(ad.tracking_id)}
                          className="flex items-center gap-1 font-mono text-indigo-400 hover:text-indigo-300 transition"
                          title="Click to copy"
                        >
                          {ad.tracking_id}
                          {copiedId === ad.tracking_id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 opacity-50" />
                          )}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_COLORS[status.color]}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      {/* Metrics */}
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {fmt(ad.impressions)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {fmt(ad.clicks)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {ctr(ad.impressions, ad.clicks)}
                      </td>

                      {/* Weight */}
                      <td className="px-4 py-3 text-center">
                        <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-bold">
                          {ad.display_weight}×
                        </span>
                      </td>

                      {/* Toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggle(ad)}
                          className="inline-flex items-center justify-center transition"
                          title={ad.active ? "Disable ad" : "Enable ad"}
                        >
                          {ad.active ? (
                            <ToggleRight className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-6 h-6 text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(ad)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(ad)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-400" />
                {editingAd ? "Edit Ad" : "New Ad Campaign"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-5 text-xs">
              {/* Row 1: Title + Advertiser */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Ad Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    placeholder="Internal label, e.g. Solar Q3 2026"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Advertiser Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    required
                    value={form.advertiser_name}
                    onChange={(e) =>
                      setForm({ ...form, advertiser_name: e.target.value })
                    }
                    placeholder="Shown in 'Sponsored by …'"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Row 2: Tracking ID (create only) + Media type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Tracking ID
                    {editingAd ? (
                      <span className="ml-1 text-slate-500">(read-only)</span>
                    ) : (
                      <span className="ml-1 text-slate-500">
                        (auto-generated if blank)
                      </span>
                    )}
                  </label>
                  <input
                    value={editingAd ? editingAd.tracking_id : form.tracking_id}
                    onChange={(e) =>
                      !editingAd &&
                      setForm({ ...form, tracking_id: e.target.value })
                    }
                    readOnly={!!editingAd}
                    placeholder="e.g. SOLAR-2026-Q3"
                    className={`w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ${editingAd ? "text-indigo-400 cursor-default" : "text-white"}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Media Type
                  </label>
                  <select
                    value={form.media_type}
                    onChange={(e) =>
                      setForm({ ...form, media_type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
              </div>

              {/* Media URL */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Media URL <span className="text-red-400">*</span>
                  {form.media_url && (
                    <a
                      href={form.media_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 inline-flex items-center gap-0.5 text-indigo-400 hover:underline"
                    >
                      Preview <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </label>
                <input
                  required
                  value={form.media_url}
                  onChange={(e) =>
                    setForm({ ...form, media_url: e.target.value })
                  }
                  placeholder="https://res.cloudinary.com/…"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Link config */}
              <div className="space-y-3 p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
                <p className="text-slate-300 font-bold flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" /> Click
                  Destination
                </p>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Link Type
                  </label>
                  <select
                    value={form.link_type}
                    onChange={(e) =>
                      setForm({ ...form, link_type: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="website">Website URL</option>
                    <option value="none">No link</option>
                  </select>
                </div>

                {form.link_type === "whatsapp" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">
                        WhatsApp Phone
                      </label>
                      <input
                        value={form.whatsapp_phone}
                        onChange={(e) =>
                          setForm({ ...form, whatsapp_phone: e.target.value })
                        }
                        placeholder="2347015585397"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">
                        Prefilled Message
                      </label>
                      <input
                        value={form.whatsapp_message}
                        onChange={(e) =>
                          setForm({ ...form, whatsapp_message: e.target.value })
                        }
                        placeholder="Hi, I saw your ad…"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {form.link_type === "website" && (
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">
                      Website URL
                    </label>
                    <input
                      value={form.link_url}
                      onChange={(e) =>
                        setForm({ ...form, link_url: e.target.value })
                      }
                      placeholder="https://example.com"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Display config */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Duration (s)
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="30"
                    value={form.duration_secs}
                    onChange={(e) =>
                      setForm({ ...form, duration_secs: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Weight
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={form.display_weight}
                    onChange={(e) =>
                      setForm({ ...form, display_weight: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-slate-600 mt-0.5">Higher = shown more</p>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Start date
                  </label>
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) =>
                      setForm({ ...form, starts_at: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    End date
                  </label>
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) =>
                      setForm({ ...form, ends_at: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
                <div
                  onClick={() => setForm({ ...form, active: !form.active })}
                  className={`relative w-10 h-5 rounded-full transition ${form.active ? "bg-indigo-600" : "bg-slate-700"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.active ? "left-5" : "left-0.5"}`}
                  />
                </div>
                <span className="text-slate-300 font-semibold text-xs">
                  Active
                </span>
              </label>

              {/* Footer buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold transition hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {saving
                    ? "Saving…"
                    : editingAd
                      ? "Save Changes"
                      : "Create Ad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Ad"
        message={`Are you sure you want to permanently delete "${deleteDialog.title}"? This cannot be undone.`}
        confirmLabel="Delete Ad"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null, title: "" })}
      />
    </div>
  );
}
