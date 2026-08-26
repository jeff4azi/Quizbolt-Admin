import React, { useEffect, useState } from "react";
import {
  Users,
  Crown,
  BookOpen,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  GraduationCap,
  Clock,
  Sparkles
} from "lucide-react";
import { API_BASE_URL } from "../config/apiConfig";
import { supabase } from "../lib/supabaseClient";

export default function DashboardView({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;

        const res = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse font-medium">
        Loading admin dashboard analytics...
      </div>
    );
  }

  const kpis = stats?.kpis || {};
  const needsAttention = stats?.needsAttention || {};

  return (
    <div className="p-6 space-y-6 text-slate-100">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            QuizBolt Admin Overview
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time multi-tenant university platform telemetry & administrative controls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("questions")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30"
          >
            Manage Question Bank
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Profiles</span>
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{kpis.totalUsers?.toLocaleString() || 0}</div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +{kpis.newSignups7d || 0} signups (7d)
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Premium</span>
            <Crown className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">{kpis.premiumUsers?.toLocaleString() || 0}</div>
          <div className="text-[11px] text-slate-400 font-medium">
            {kpis.redeemedCodes || 0} codes redeemed total
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Exam Attempts</span>
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{kpis.totalExamAttempts?.toLocaleString() || 0}</div>
          <div className="text-[11px] text-slate-400 font-medium">
            {kpis.totalTestAttempts?.toLocaleString() || 0} practice tests
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg backdrop-blur-md space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Moderation</span>
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-400">{kpis.pendingReviews || 0}</div>
          <div className="text-[11px] text-slate-400 font-medium">
            Testimonials awaiting review
          </div>
        </div>
      </div>

      {/* Grid: Needs Attention & Academic Semester Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Needs Attention Card */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Needs Attention Queue
            </h2>
            <button
              onClick={() => onNavigate("reviews")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View Moderation Queue &rarr;
            </button>
          </div>

          {needsAttention.pendingReviews && needsAttention.pendingReviews.length > 0 ? (
            <div className="space-y-2.5">
              {needsAttention.pendingReviews.map((rev) => (
                <div key={rev.id} className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">{rev.user_name || "Anonymous Student"}</div>
                    <div className="text-slate-400 line-clamp-1 italic mt-0.5">"{rev.review_text}"</div>
                  </div>
                  <button
                    onClick={() => onNavigate("reviews")}
                    className="px-2.5 py-1 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg font-bold hover:bg-indigo-600 hover:text-white transition"
                  >
                    Moderate
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <span>All reviews moderated! No pending items in queue.</span>
            </div>
          )}
        </div>

        {/* University Semester Status */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-400" />
              Active University Semesters
            </h2>
            <button
              onClick={() => onNavigate("universities")}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              Manage & Rollover &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {needsAttention.universities && needsAttention.universities.map((uni) => (
              <div key={uni.id} className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{uni.id} &mdash; {uni.name}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">Controls course visibility app-wide</div>
                </div>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold rounded-lg">
                  Semester {uni.current_semester || 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
