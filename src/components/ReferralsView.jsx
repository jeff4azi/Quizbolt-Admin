import React, { useState, useEffect } from "react";
import { Share2, Users, Award, ShieldAlert } from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function ReferralsView() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(`${API_BASE_URL}/api/admin/referrals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReferrals(data || []);
      }
    } catch (err) {
      console.error("Error fetching referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  return (
    <div className="p-6 space-y-6 text-slate-100">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Share2 className="w-6 h-6 text-indigo-400" />
          Referral Monitoring & Fraud Control (2.10)
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Monitor user referral codes, track referee conversions, and audit suspicious signup activity.
        </p>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading referral records...</div>
        ) : referrals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">No referral conversions recorded yet.</div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">Referred User</th>
                <th className="py-3 px-4">University</th>
                <th className="py-3 px-4">Referred By Code</th>
                <th className="py-3 px-4">User Referral Code</th>
                <th className="py-3 px-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {referrals.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-bold text-white">{r.full_name || r.user_name || r.email}</td>
                  <td className="py-3.5 px-4 font-semibold text-indigo-300">{r.university || "TASUED"}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{r.referred_by}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{r.referral_code || "-"}</td>
                  <td className="py-3.5 px-4 text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
