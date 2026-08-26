import React, { useState, useEffect } from "react";
import { MessageSquare, Check, Trash2, X } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function ReviewsView() {
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState("pending"); // "pending" or "approved"
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const isApproved = tab === "approved";
      const res = await fetch(`${API_BASE_URL}/api/admin/reviews?approved=${isApproved}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setReviews(data || []);
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [tab]);

  const handleApprove = async (id) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/reviews/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to approve review");

      setNotification({ type: "success", text: "Testimonial approved for public display!" });
      setTimeout(() => setNotification(null), 4000);
      fetchReviews();
    } catch (err) {
      alert(`Error approving review: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to delete review");

      setNotification({ type: "success", text: "Review deleted successfully." });
      setTimeout(() => setNotification(null), 4000);
      fetchReviews();
    } catch (err) {
      alert(`Error deleting review: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-400" />
          Testimonials & Reviews Moderation
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Review and approve student feedback before display on the QuizBolt homepage.
        </p>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            tab === "pending"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Pending Approval Queue
        </button>

        <button
          onClick={() => setTab("approved")}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
            tab === "approved"
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
              : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Published Testimonials
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-900/80 border border-slate-800 rounded-2xl">
            No {tab} reviews found.
          </div>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{rev.user_name || "Student"}</span>
                  <span className="text-[10px] text-indigo-400 font-semibold px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded">
                    {rev.university || "TASUED"}
                  </span>
                </div>
                <p className="text-slate-300 text-xs italic">"{rev.review_text}"</p>
                <div className="text-[10px] text-slate-500">{new Date(rev.created_at).toLocaleString()}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {tab === "pending" && (
                  <button
                    onClick={() => handleApprove(rev.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/30"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                )}
                <button
                  onClick={() => handleDelete(rev.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
