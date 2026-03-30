import React, { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Booking } from "./components/booking/Booking";
import { DolaAI } from "./components/dola/DolaAI";
import { Analytics } from "./components/analytics/Analytics";
import { IoTControl } from "./components/iot/IoTControl";
import { HRPortal } from "./components/hr/HRPortal";
import { Robotics } from "./components/robotics/Robotics";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");

  const renderContent = () => {
    switch (activeTab) {
      case "overview":  return <Dashboard />;
      case "booking":   return <Booking />;
      case "dola":      return <DolaAI />;
      case "iot":       return <IoTControl />;
      case "hr":        return <HRPortal />;
      case "robotics":  return <Robotics />;
      case "analytics": return <Analytics />;
      default:          return <Dashboard />;
    }
  };

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
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content */}
      <div style={{ marginLeft: 220, flex: 1, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
        <Header activeTab={activeTab} onTabChange={setActiveTab} />
        <main style={{ flex: 1, overflowY: "auto" }}>
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