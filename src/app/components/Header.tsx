import React, { useState, useEffect } from "react";
import type { CurrentUser, SystemSnapshot } from "../lib/api";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  snapshot: SystemSnapshot | null;
  snapshotError: string | null;
  currentUser: CurrentUser | null;
  onLogout: () => Promise<void>;
}

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "booking", label: "Booking" },
  { id: "dola", label: "Dola AI" },
];

export function Header({ activeTab, onTabChange, snapshot, snapshotError, currentUser, onLogout }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const [showNotif, setShowNotif] = useState(true);

  useEffect(() => {
    if (snapshot?.serverTime?.utc_time) {
      setTime(new Date(snapshot.serverTime.utc_time));
    }
  }, [snapshot?.serverTime?.utc_time]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime((prev) => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const formatDate = (d: Date) =>
    d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  return (
    <header
      style={{
        padding: "20px 32px 0",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(8,12,20,0.8)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Top Row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: "#e8eaf0",
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            Добро пожаловать, {currentUser?.full_name || currentUser?.email || "Guest"} 👋
          </h1>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8892a4", marginTop: 4, textTransform: "capitalize" }}>
            {formatDate(time)} · {snapshot?.buildInfo?.service ?? "New Level Hub"} v{snapshot?.buildInfo?.version ?? "n/a"} · {snapshot?.environment?.environment ?? "unknown"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Notification pill */}
          {showNotif && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px 7px 10px",
                borderRadius: 20,
                background: "rgba(108,138,255,0.12)",
                border: "1px solid rgba(108,138,255,0.25)",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 13 }}>🔔</span>
              <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#6c8aff" }}>
                Dola: Встреча через 20 мин — зал «Орион»
              </span>
              <button
                onClick={() => setShowNotif(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#8892a4",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 0,
                  marginLeft: 2,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Clock */}
          <div
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 18,
              color: "#e8eaf0",
              letterSpacing: "0.05em",
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {formatTime(time)}
          </div>
          {currentUser && (
            <button
              onClick={onLogout}
              style={{
                height: 36,
                borderRadius: 8,
                border: "1px solid rgba(255,138,101,0.35)",
                background: "rgba(255,138,101,0.08)",
                color: "#ff8a65",
                cursor: "pointer",
                padding: "0 12px",
                fontFamily: "DM Mono, monospace",
                fontSize: 11,
              }}
            >
              Logout
            </button>
          )}
        </div>
      </div>
      {snapshotError && (
        <div
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: 10,
            color: "#ff8a65",
            marginBottom: 10,
          }}
        >
          Backend sync error: {snapshotError}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: "8px 18px",
                borderRadius: "8px 8px 0 0",
                border: "none",
                background: isActive ? "rgba(0,245,196,0.08)" : "transparent",
                cursor: "pointer",
                fontFamily: "Syne, sans-serif",
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                color: isActive ? "#00f5c4" : "#8892a4",
                transition: "all 0.15s ease",
                borderBottom: isActive ? "2px solid #00f5c4" : "2px solid transparent",
                marginBottom: -1,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = "#e8eaf0";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = "#8892a4";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }
              }}
            >
              {tab.label}
              {tab.id === "dola" && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: 9,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(108,138,255,0.2)",
                    color: "#6c8aff",
                    fontFamily: "DM Mono, monospace",
                    verticalAlign: "middle",
                  }}
                >
                  AI
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
