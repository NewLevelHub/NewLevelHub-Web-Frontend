import React, { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Booking } from "./components/booking/Booking";
import { DolaAI } from "./components/dola/DolaAI";
import { Analytics } from "./components/analytics/Analytics";
import { IoTControl } from "./components/iot/IoTControl";
import { HRPortal } from "./components/hr/HRPortal";
import { Robotics } from "./components/robotics/Robotics";
import { AuthPage } from "./components/auth/AuthPage";
import {
  fetchSystemSnapshot,
  getCurrentUser,
  getStoredAccessToken,
  loginUser,
  logoutUser,
  registerUser,
  type CurrentUser,
  type LoginInput,
  type RegisterInput,
  type SystemSnapshot,
} from "./lib/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(true);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isBootstrappingAuth, setIsBootstrappingAuth] = useState(true);
  const [showAuthPage, setShowAuthPage] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSnapshot = async () => {
      setIsLoadingSnapshot(true);
      setSnapshotError(null);
      try {
        const data = await fetchSystemSnapshot();
        if (isMounted) {
          setSnapshot(data);
        }
      } catch (error) {
        if (isMounted) {
          setSnapshotError(error instanceof Error ? error.message : "Failed to load backend data");
        }
      } finally {
        if (isMounted) {
          setIsLoadingSnapshot(false);
        }
      }
    };

    loadSnapshot();
    const interval = setInterval(loadSnapshot, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      if (!getStoredAccessToken()) {
        if (isMounted) setIsBootstrappingAuth(false);
        return;
      }

      try {
        const me = await getCurrentUser();
        if (isMounted) {
          setCurrentUser(me);
          setAuthError(null);
        }
      } catch (error) {
        if (isMounted) {
          setCurrentUser(null);
          setAuthError(error instanceof Error ? error.message : "Session restore failed");
        }
      } finally {
        if (isMounted) {
          setIsBootstrappingAuth(false);
        }
      }
    };

    bootstrapAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async (payload: LoginInput) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const result = await loginUser(payload);
      setCurrentUser(result.user);
      setShowAuthPage(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async (payload: RegisterInput) => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const result = await registerUser(payload);
      setCurrentUser(result.user);
      setShowAuthPage(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setAuthError(null);
    setActiveTab("overview");
    setShowAuthPage(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <Dashboard
            snapshot={snapshot}
            isLoadingSnapshot={isLoadingSnapshot}
            snapshotError={snapshotError}
          />
        );
      case "booking":   return <Booking />;
      case "dola":      return <DolaAI />;
      case "iot":       return <IoTControl />;
      case "hr":        return <HRPortal />;
      case "robotics":  return <Robotics />;
      case "analytics": return <Analytics />;
      default:
        return (
          <Dashboard
            snapshot={snapshot}
            isLoadingSnapshot={isLoadingSnapshot}
            snapshotError={snapshotError}
          />
        );
    }
  };

  if (showAuthPage) {
    return (
      <AuthPage
        roles={snapshot?.roles ?? []}
        isBusy={authBusy}
        error={authError}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080c14",
        display: "flex",
        fontFamily: "Syne, sans-serif",
      }}
    >
      {/* Ambient glow effects */}
      <div style={{
        position: "fixed",
        top: "10%",
        left: "30%",
        width: 600,
        height: 400,
        background: "radial-gradient(ellipse, rgba(108,138,255,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />
      <div style={{
        position: "fixed",
        bottom: "20%",
        right: "10%",
        width: 400,
        height: 300,
        background: "radial-gradient(ellipse, rgba(0,245,196,0.04) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} currentUser={currentUser} />

      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
        <Header
          activeTab={activeTab}
          onTabChange={setActiveTab}
          snapshot={snapshot}
          snapshotError={snapshotError}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main style={{ flex: 1, overflowY: "auto" }}>
          {!currentUser && !isBootstrappingAuth && (
            <div style={{ padding: "12px 32px", color: "#8892a4", fontFamily: "DM Mono, monospace", fontSize: 11 }}>
              Гостевой режим.{" "}
              <button
                onClick={() => setActiveTab("overview")}
                style={{
                  marginLeft: 6,
                  border: "1px solid rgba(108,138,255,0.3)",
                  borderRadius: 6,
                  background: "rgba(108,138,255,0.1)",
                  color: "#6c8aff",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                Main
              </button>
              <button
                onClick={() => {
                  setAuthError(null);
                  setAuthBusy(false);
                  setShowAuthPage(true);
                }}
                style={{
                  marginLeft: 6,
                  border: "1px solid rgba(0,245,196,0.3)",
                  borderRadius: 6,
                  background: "rgba(0,245,196,0.1)",
                  color: "#00f5c4",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                Войти / Register
              </button>
            </div>
          )}
          {renderContent()}
        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        input::placeholder { color: rgba(136,146,164,0.6); }
        input:focus { border-color: rgba(108,138,255,0.4) !important; box-shadow: 0 0 0 2px rgba(108,138,255,0.08); }
      `}</style>
    </div>
  );
}