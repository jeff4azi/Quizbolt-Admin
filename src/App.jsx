import React, { useState, useEffect } from "react";
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
import ReferralsView from "./components/ReferralsView";
import LeaderboardView from "./components/LeaderboardView";
import AnalyticsView from "./components/AnalyticsView";
import NotificationsView from "./components/NotificationsView";
import ContentCmsView from "./components/ContentCmsView";
import AdminUsersView from "./components/AdminUsersView";
import AuditLogView from "./components/AuditLogView";
import { RefreshCw, Menu } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [adminRecord, setAdminRecord] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedCourseCode, setSelectedCourseCode] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Check initial Supabase auth session & verify admin role
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

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setUser(null);
        setAdminRecord(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
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

  const handleTabChange = (tab) => {
    if (tab !== "questions") setSelectedCourseCode("");
    setActiveTab(tab);
    setSidebarOpen(false); // always close drawer after nav on mobile
  };

  if (loadingAuth) {
    return (
      <div className="h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center gap-3 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-xs font-semibold">Initializing QuizBolt Admin...</span>
      </div>
    );
  }

  if (!user || !adminRecord) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-950 font-sans antialiased text-slate-100">
      {/* Mobile backdrop — clicking it closes the sidebar drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on lg+, slide-in drawer on mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:flex lg:shrink-0 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          adminRecord={adminRecord}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile top bar — hamburger menu, only visible on small screens */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0B0F17] border-b border-slate-800/80 shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-black text-white tracking-tight">QuizBolt Admin</span>
        </div>

        {/* Scrollable view area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-950">
          {activeTab === "dashboard" && <DashboardView onNavigate={handleTabChange} />}
          {activeTab === "users" && <UsersView />}
          {activeTab === "universities" && <UniversitiesView />}
          {activeTab === "courses" && (
            <CoursesView
              onNavigateToQuestions={(code) => {
                setSelectedCourseCode(code);
                setActiveTab("questions");
                setSidebarOpen(false);
              }}
            />
          )}
          {activeTab === "questions" && <QuestionBank initialCourseCode={selectedCourseCode} />}
          {activeTab === "premium" && <PremiumView />}
          {activeTab === "reviews" && <ReviewsView />}
          {activeTab === "referrals" && <ReferralsView />}
          {activeTab === "leaderboard" && <LeaderboardView />}
          {activeTab === "analytics" && <AnalyticsView />}
          {activeTab === "notifications" && <NotificationsView />}
          {activeTab === "cms" && <ContentCmsView />}
          {activeTab === "admins" && <AdminUsersView />}
          {activeTab === "audit" && <AuditLogView />}
        </main>
      </div>
    </div>
  );
}