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
import ContentCmsView from "./components/ContentCmsView";
import AuditLogView from "./components/AuditLogView";
import { RefreshCw } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [adminRecord, setAdminRecord] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedCourseCode, setSelectedCourseCode] = useState("");

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

  if (loadingAuth) {
    return (
      <div className="h-screen bg-slate-950 text-slate-400 flex flex-col items-center justify-center gap-3">
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
      {/* Desktop Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== "questions") setSelectedCourseCode("");
          setActiveTab(tab);
        }}
        adminRecord={adminRecord}
        onLogout={handleLogout}
      />

      {/* Main Admin View Content */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden bg-slate-950">
        {activeTab === "dashboard" && <DashboardView onNavigate={setActiveTab} />}
        {activeTab === "users" && <UsersView />}
        {activeTab === "universities" && <UniversitiesView />}
        {activeTab === "courses" && (
          <CoursesView
            onNavigateToQuestions={(code) => {
              setSelectedCourseCode(code);
              setActiveTab("questions");
            }}
          />
        )}
        {activeTab === "questions" && <QuestionBank initialCourseCode={selectedCourseCode} />}
        {activeTab === "premium" && <PremiumView />}
        {activeTab === "reviews" && <ReviewsView />}
        {activeTab === "cms" && <ContentCmsView />}
        {activeTab === "audit" && <AuditLogView />}
      </main>
    </div>
  );
}