import React from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  HelpCircle,
  Crown,
  MessageSquare,
  FileText,
  ShieldCheck,
  LogOut,
  ChevronRight
} from "lucide-react";
import Logo from "../images/Logo";

export default function Sidebar({ activeTab, setActiveTab, adminRecord, onLogout }) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users & Overrides", icon: Users },
    { id: "universities", label: "Universities & Colleges", icon: GraduationCap },
    { id: "courses", label: "Courses Management", icon: BookOpen },
    { id: "questions", label: "Question Bank", icon: HelpCircle },
    { id: "premium", label: "Monetization & Codes", icon: Crown },
    { id: "reviews", label: "Testimonials Moderation", icon: MessageSquare },
    { id: "cms", label: "Content & CMS", icon: FileText },
    { id: "audit", label: "Audit Log", icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 h-screen bg-[#0B0F17] border-r border-slate-800/80 flex flex-col justify-between p-4 text-slate-300 select-none shrink-0 overflow-hidden">
      <div className="space-y-6 flex-1 overflow-y-auto pr-1">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-1 sticky top-0 bg-[#0B0F17] z-10 pb-2">
          <Logo className="w-10 h-10 shrink-0" />
          <div>
            <div className="font-black text-base text-white tracking-tight leading-none">QuizBolt</div>
            <div className="text-[11px] font-semibold text-indigo-400 mt-1 uppercase tracking-wider">Admin Control</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Admin Profile & Logout (Pinned to bottom of viewport) */}
      <div className="pt-4 border-t border-slate-800/80 space-y-3 shrink-0 bg-[#0B0F17]">
        <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">{adminRecord?.email}</div>
            <div className="text-[10px] font-semibold text-indigo-400 mt-0.5 inline-block px-1.5 py-0.2 bg-indigo-500/10 border border-indigo-500/20 rounded">
              {adminRecord?.role || "Admin"}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
