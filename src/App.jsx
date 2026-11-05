import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import UsersView from "./components/UsersView";
import UniversitiesView from "./components/UniversitiesView";
import CoursesView from "./components/CoursesView";
import QuestionBank from "./components/QuestionBank";
import PremiumView from "./components/PremiumView";
import ReviewsView from "./components/ReviewsView";
import ReportsView from "./components/ReportsView";
import ReferralsView from "./components/ReferralsView";
import LeaderboardView from "./components/LeaderboardView";
import AnalyticsView from "./components/AnalyticsView";
import NotificationsView from "./components/NotificationsView";
import ContentCmsView from "./components/ContentCmsView";
import AdminUsersView from "./components/AdminUsersView";
import AuditLogView from "./components/AuditLogView";
import AdsView from "./components/AdsView";
import { RefreshCw, Menu } from "lucide-react";

// ─── QuestionBank wrapper — reads course/uni from URL search params ───────────
function QuestionBankRoute({ adminRecord }) {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("course") || "";
  const uni = searchParams.get("uni") || "";
  return (
    <QuestionBank
      initialCourseCode={code}
      initialUniversity={uni}
      adminRecord={adminRecord}
    />
  );
}

// ─── Main shell (only shown when authenticated) ───────────────────────────────
function AdminShell({ adminRecord, onLogout }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleTabChange = (tab) => {
    navigate(`/${tab}`);
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950 font-sans antialiased text-slate-100">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:flex lg:shrink-0 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar
          adminRecord={adminRecord}
          onLogout={onLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0B0F17] border-b border-slate-800/80 shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-black text-white tracking-tight">
            QuizBolt Admin
          </span>
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-950">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={<DashboardView onNavigate={handleTabChange} />}
            />
            <Route path="/users" element={<UsersView />} />
            <Route path="/universities" element={<UniversitiesView />} />
            <Route
              path="/courses"
              element={
                <CoursesView
                  onNavigateToQuestions={(code, uni) => {
                    const params = new URLSearchParams();
                    if (code) params.set("course", code);
                    if (uni) params.set("uni", uni);
                    navigate(`/questions?${params.toString()}`);
                    setSidebarOpen(false);
                  }}
                />
              }
            />
            <Route
              path="/questions"
              element={<QuestionBankRoute adminRecord={adminRecord} />}
            />
            <Route path="/premium" element={<PremiumView />} />
            <Route path="/reviews" element={<ReviewsView />} />
            <Route path="/reports" element={<ReportsView />} />
            <Route path="/referrals" element={<ReferralsView />} />
            <Route path="/leaderboard" element={<LeaderboardView />} />
            <Route path="/analytics" element={<AnalyticsView />} />
            <Route path="/notifications" element={<NotificationsView />} />
            <Route path="/ads" element={<AdsView />} />
            <Route path="/cms" element={<ContentCmsView />} />
            <Route path="/admins" element={<AdminUsersView />} />
            <Route path="/audit" element={<AuditLogView />} />
            {/* Catch-all → dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ─── Root — handles auth, then renders shell inside BrowserRouter ─────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [adminRecord, setAdminRecord] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const currentUser = sessionData?.session?.user;

        if (currentUser) {
          const { data: adminData } = await supabase
            .from("admin_users")
            .select("*")
            .eq("id", currentUser.id)
            .eq("active", true)
            .single();

          if (adminData) {
            setUser(currentUser);
            setAdminRecord(adminData);
          } else {
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoadingAuth(false);
      }
    }

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          setUser(null);
          setAdminRecord(null);
        }
      },
    );

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  const handleLoginSuccess = (authUser, adminRec) => {
    setUser(authUser);
    setAdminRecord(adminRec);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAdminRecord(null);
  };

  if (loadingAuth) {
    return (
      <div className="h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center gap-3 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs font-semibold">
          Initializing QuizBolt Admin...
        </span>
      </div>
    );
  }

  if (!user || !adminRecord) {
    return (
      <BrowserRouter>
        <Routes>
          <Route
            path="*"
            element={<Login onLoginSuccess={handleLoginSuccess} />}
          />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AdminShell adminRecord={adminRecord} onLogout={handleLogout} />
    </BrowserRouter>
  );
}
