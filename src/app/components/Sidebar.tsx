import React, { useState } from "react";
import type { CurrentUser } from "../lib/api";

interface NavItem {
  icon: string;
  label: string;
  id: string;
}

const navItems: NavItem[] = [
  { icon: "⬡", label: "Overview", id: "overview" },
  { icon: "◫", label: "Booking", id: "booking" },
  { icon: "◈", label: "Dola AI", id: "dola" },
  { icon: "▦", label: "IoT Control", id: "iot" },
  { icon: "◉", label: "HR Portal", id: "hr" },
  { icon: "◬", label: "Robotics", id: "robotics" },
  { icon: "▲", label: "Analytics", id: "analytics" },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: CurrentUser | null;
}

export function Sidebar({ activeTab, onTabChange, currentUser }: SidebarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const initials =
    currentUser
      ? `${currentUser.first_name?.[0] || ""}${currentUser.last_name?.[0] || ""}`.trim() ||
        currentUser.email.slice(0, 2).toUpperCase()
      : "GU";
  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: "rgba(8,12,20,0.95)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "28px 24px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #00f5c4 0%, #6c8aff 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 800,
              color: "#080c14",
              fontFamily: "Syne, sans-serif",
              flexShrink: 0,
            }}
          >
            N
          </div>
          <div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0", letterSpacing: "-0.02em" }}>
              New Level
            </div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", letterSpacing: "0.08em", marginTop: 1 }}>
              HUB OS v2.4
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        <div style={{ fontSize: 10, color: "#8892a4", fontFamily: "DM Mono, monospace", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 12px", marginBottom: 8 }}>
          Main
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isClickable = true;
          return (
            <button
              key={item.id}
              onClick={() => isClickable && onTabChange(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                background: isActive ? "rgba(0,245,196,0.08)" : "transparent",
                cursor: isClickable ? "pointer" : "not-allowed",
                opacity: isClickable ? 1 : 0.4,
                transition: "all 0.15s ease",
                marginBottom: 2,
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!isActive && isClickable) {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                <span style={{ fontSize: 16, width: 20, textAlign: "center", color: isActive ? "#00f5c4" : "#8892a4" }}>
                  {item.icon}
                </span>
                <span
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 13,
                    color: isActive ? "#e8eaf0" : "#8892a4",
                  }}
                >
                  {item.label}
                </span>
              </div>
              {isActive && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#00f5c4",
                    boxShadow: "0 0 8px #00f5c4",
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile Card */}
      <div
        style={{
          margin: "12px",
          padding: "14px",
          borderRadius: 12,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <button
          onClick={() => setIsProfileMenuOpen((prev) => !prev)}
          aria-expanded={isProfileMenuOpen}
          aria-label="Toggle profile actions"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            border: "none",
            background: "transparent",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #6c8aff, #00f5c4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                color: "#080c14",
              }}
            >
              {initials}
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 1,
                right: 1,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#00f5c4",
                border: "2px solid #080c14",
                boxShadow: "0 0 6px #00f5c4",
              }}
            />
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 600,
                fontSize: 12,
                color: "#e8eaf0",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentUser?.full_name || currentUser?.email || "Guest user"}
            </div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginTop: 1 }}>
              {currentUser?.role || "guest"}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#00f5c4" }}>
              ONLINE
            </div>
          </div>
        </button>
        {isProfileMenuOpen && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {["Settings", "Log Out", "Help"].map((action) => (
              <button
                key={action}
                type="button"
                style={{
                  width: "100%",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#e8eaf0",
                  fontFamily: "Syne, sans-serif",
                  fontSize: 12,
                  padding: "8px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}