import React, { useState, useEffect } from "react";
import { FileText, Plus, Trash2, Edit2, X, Check } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function ContentCmsView() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", category: "General" });
  const [notification, setNotification] = useState(null);

  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/faqs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFaqs(data || []);
      }
    } catch (err) {
      console.error("Error fetching FAQs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const handleSaveFaq = async (e) => {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const payload = {
        id: editingFaq?.id,
        ...faqForm,
      };

      const res = await fetch(`${API_BASE_URL}/api/admin/faqs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save FAQ");

      setIsFaqModalOpen(false);
      setNotification({ type: "success", text: `FAQ ${editingFaq ? "updated" : "created"} successfully!` });
      setTimeout(() => setNotification(null), 4000);
      fetchFaqs();
    } catch (err) {
      alert(`Error saving FAQ: ${err.message}`);
    }
  };

  const handleDeleteFaq = async (id) => {
    if (!window.confirm("Are you sure you want to delete this FAQ entry?")) return;
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/faqs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete FAQ");

      setNotification({ type: "success", text: "FAQ deleted successfully." });
      setTimeout(() => setNotification(null), 4000);
      fetchFaqs();
    } catch (err) {
      alert(`Error deleting FAQ: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            Content CMS & FAQ Management
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Update dynamic FAQ entries, legal terms, and promo banner placements.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingFaq(null);
            setFaqForm({ question: "", answer: "", category: "General" });
            setIsFaqModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
        >
          <Plus className="w-4 h-4" /> Add FAQ Entry
        </button>
      </div>

      {notification && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* FAQ Entries Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg p-6 space-y-4">
        <h2 className="text-base font-bold text-white">Active FAQ Knowledgebase</h2>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading FAQ entries...</div>
        ) : faqs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No FAQ entries created yet. Add one above.</div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-4 bg-slate-800/60 border border-slate-800 rounded-xl flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-indigo-400 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded">
                    {faq.category || "General"}
                  </span>
                  <h3 className="font-bold text-white text-sm mt-1">{faq.question}</h3>
                  <p className="text-slate-300 text-xs">{faq.answer}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEditingFaq(faq);
                      setFaqForm({ question: faq.question, answer: faq.answer, category: faq.category || "General" });
                      setIsFaqModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQ Modal */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white">
                {editingFaq ? "Edit FAQ Entry" : "Add FAQ Entry"}
              </h2>
              <button onClick={() => setIsFaqModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Premium, Exams, General"
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Question</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How do I redeem a QuizBolt premium code?"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Answer</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detailed answer text..."
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition"
                >
                  Save FAQ Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
