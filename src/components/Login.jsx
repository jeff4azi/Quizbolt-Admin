import React, { useState } from "react";
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Supabase Auth Login
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) throw authError;

      // 2. Verify user is registered in admin_users table
      const { data: adminRecord, error: adminErr } = await supabase
        .from("admin_users")
        .select("*")
        .eq("id", data.user.id)
        .eq("active", true)
        .single();

      if (adminErr || !adminRecord) {
        await supabase.auth.signOut();
        throw new Error("Access Denied: Your account does not have Admin privileges.");
      }

      onLoginSuccess(data.user, adminRecord);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (fillEmail) => {
    setEmail(fillEmail);
    setPassword("QuizBolt123!@");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl p-8 space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-lg shadow-indigo-500/30 text-white font-black text-2xl mb-2">
            Q
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            QuizBolt Admin
          </h1>
          <p className="text-slate-400 text-xs">
            Sign in with your authorized admin credentials
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                placeholder="admin@quizbolt.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Admin Panel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Credentials Auto-Fill Helpers */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Demo Admin Credentials:
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => quickFill("admin@quizbolt.net")}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono rounded-lg border border-slate-700 transition"
            >
              admin@quizbolt.net
            </button>
            <button
              onClick={() => quickFill("jeffrey@quizbolt.net")}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono rounded-lg border border-slate-700 transition"
            >
              jeffrey@quizbolt.net
            </button>
            <button
              onClick={() => quickFill("superadmin@quizbolt.net")}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono rounded-lg border border-slate-700 transition"
            >
              superadmin@quizbolt.net
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Default Password: <code className="text-indigo-400">QuizBolt123!@</code></p>
        </div>
      </div>
    </div>
  );
}
