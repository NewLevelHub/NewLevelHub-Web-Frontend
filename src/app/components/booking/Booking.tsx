import React, { useState } from "react";

const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  backdropFilter: "blur(12px)",
  ...extra,
});

interface Room {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  status: "free" | "busy";
  features: string[];
  nextFree?: string;
}

const rooms: Room[] = [
  { id: "r1", name: "Орион", floor: 12, capacity: 6, status: "free", features: ["TV", "WB", "VC"] },
  { id: "r2", name: "Вега", floor: 12, capacity: 12, status: "busy", features: ["TV", "WB", "VC", "AV"], nextFree: "13:30" },
  { id: "r3", name: "Сириус", floor: 11, capacity: 4, status: "free", features: ["TV", "WB"] },
  { id: "r4", name: "Полярная", floor: 11, capacity: 8, status: "busy", features: ["TV", "WB", "VC"], nextFree: "14:00" },
  { id: "r5", name: "Альтаир", floor: 10, capacity: 20, status: "free", features: ["TV", "WB", "VC", "AV", "PA"] },
  { id: "r6", name: "Денеб", floor: 10, capacity: 3, status: "free", features: ["TV"] },
];

// Parking: 4 rows × 6 cols
const PARK_ROWS = 4;
const PARK_COLS = 6;
const MY_SLOT = { row: 1, col: 2 };
const occupiedSlots = [
  { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 3 }, { row: 0, col: 5 },
  { row: 1, col: 0 }, { row: 1, col: 4 },
  { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 5 },
  { row: 3, col: 0 }, { row: 3, col: 3 }, { row: 3, col: 4 },
];

const capsules = [
  { id: "C-01", floor: 8, status: "free", until: null },
  { id: "C-02", floor: 8, status: "busy", until: "15:00" },
  { id: "C-03", floor: 8, status: "busy", until: "16:30" },
  { id: "C-04", floor: 9, status: "free", until: null },
  { id: "C-05", floor: 9, status: "free", until: null },
];

const featureLabels: Record<string, string> = {
  TV: "📺",
  WB: "📋",
  VC: "📹",
  AV: "🎙",
  PA: "🔊",
};

export function Booking() {
  const [bookedRooms, setBookedRooms] = useState<Set<string>>(new Set());
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [bookedCapsule, setBookedCapsule] = useState<string | null>(null);

  const toggleRoom = (id: string, status: string) => {
    if (status === "busy") return;
    setBookedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Rooms Grid */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Переговорные комнаты
          </div>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8892a4" }}>
            <span style={{ color: "#00f5c4" }}>4</span> свободных · 2 заняты
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {rooms.map((room) => {
            const isBooked = bookedRooms.has(room.id);
            const isBusy = room.status === "busy";
            const isHovered = hoveredRoom === room.id;

            let borderColor = "rgba(255,255,255,0.07)";
            let bgColor = "rgba(255,255,255,0.04)";
            if (isBooked) { borderColor = "#00f5c4"; bgColor = "rgba(0,245,196,0.06)"; }
            else if (isBusy) { bgColor = "rgba(255,255,255,0.02)"; }
            else if (isHovered) { borderColor = "rgba(255,255,255,0.15)"; bgColor = "rgba(255,255,255,0.06)"; }

            return (
              <div
                key={room.id}
                onClick={() => toggleRoom(room.id, room.status)}
                onMouseEnter={() => !isBusy && setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
                style={{
                  ...cardStyle({
                    padding: "20px",
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    cursor: isBusy ? "not-allowed" : "pointer",
                    opacity: isBusy ? 0.45 : 1,
                    transition: "all 0.2s ease",
                    position: "relative",
                    overflow: "hidden",
                  }),
                }}
              >
                {/* Booked shine */}
                {isBooked && (
                  <div style={{
                    position: "absolute",
                    top: 0, right: 0,
                    width: 60, height: 60,
                    background: "radial-gradient(circle at top right, rgba(0,245,196,0.15), transparent 70%)",
                    pointerEvents: "none",
                  }} />
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 16, color: "#e8eaf0" }}>
                      {room.name}
                    </div>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginTop: 2 }}>
                      Этаж {room.floor} · до {room.capacity} чел.
                    </div>
                  </div>
                  {isBooked ? (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "rgba(0,245,196,0.15)",
                      border: "1px solid rgba(0,245,196,0.3)",
                      fontFamily: "DM Mono, monospace",
                      fontSize: 10,
                      color: "#00f5c4",
                    }}>
                      ✓ Забронировано
                    </div>
                  ) : (
                    <div style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontFamily: "DM Mono, monospace",
                      fontSize: 10,
                      color: isBusy ? "#ff8a65" : "#00f5c4",
                      background: isBusy ? "rgba(255,138,101,0.12)" : "rgba(0,245,196,0.10)",
                      border: `1px solid ${isBusy ? "rgba(255,138,101,0.25)" : "rgba(0,245,196,0.2)"}`,
                    }}>
                      {isBusy ? `До ${room.nextFree}` : "Свободно"}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {room.features.map((f) => (
                    <div key={f} style={{
                      width: 28, height: 28,
                      borderRadius: 6,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      title: f,
                    }}>
                      {featureLabels[f]}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Row: Parking + Capsules */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        {/* Parking */}
        <section style={cardStyle({ padding: "20px" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Парковка · Уровень B1
            </div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>
              <span style={{ color: "#00f5c4" }}>12</span> / 24 свободных
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${PARK_COLS}, 1fr)`,
            gap: 6,
            padding: 14,
            background: "rgba(0,0,0,0.3)",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.05)",
          }}>
            {Array.from({ length: PARK_ROWS * PARK_COLS }).map((_, i) => {
              const col = i % PARK_COLS;
              const row = Math.floor(i / PARK_COLS);
              const isOccupied = occupiedSlots.some((s) => s.row === row && s.col === col);
              const isMine = MY_SLOT.row === row && MY_SLOT.col === col;
              const isDriveway = row === 1 && col === 5 || row === 2 && col === 0;

              if (isDriveway) {
                return (
                  <div key={i} style={{
                    height: 44,
                    borderRadius: 6,
                    background: "transparent",
                    gridColumn: col === 5 ? undefined : undefined,
                  }} />
                );
              }

              return (
                <div
                  key={i}
                  style={{
                    height: 44,
                    borderRadius: 8,
                    background: isMine
                      ? "rgba(0,245,196,0.15)"
                      : isOccupied
                      ? "rgba(255,100,100,0.12)"
                      : "rgba(255,255,255,0.04)",
                    border: isMine
                      ? "1px solid #00f5c4"
                      : isOccupied
                      ? "1px solid rgba(255,100,100,0.25)"
                      : "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isMine ? 18 : 0,
                    cursor: isOccupied && !isMine ? "not-allowed" : "default",
                    transition: "all 0.2s ease",
                    boxShadow: isMine ? "0 0 12px rgba(0,245,196,0.2)" : "none",
                  }}
                >
                  {isMine && <span title="Ваше место">🚗</span>}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            {[
              { color: "#00f5c4", bg: "rgba(0,245,196,0.15)", label: "Ваше место" },
              { color: "rgba(255,100,100,0.5)", bg: "rgba(255,100,100,0.12)", label: "Занято" },
              { color: "rgba(255,255,255,0.2)", bg: "rgba(255,255,255,0.04)", label: "Свободно" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: l.bg, border: `1px solid ${l.color}` }} />
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Hotel Capsules */}
        <section style={cardStyle({ padding: "20px" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Капсулы отдыха
            </div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>
              Этажи 8–9
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {capsules.map((c) => {
              const isMyBooked = bookedCapsule === c.id;
              const isBusy = c.status === "busy";
              return (
                <div
                  key={c.id}
                  onClick={() => !isBusy && setBookedCapsule(isMyBooked ? null : c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: isMyBooked ? "rgba(0,245,196,0.07)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isMyBooked ? "#00f5c4" : "rgba(255,255,255,0.07)"}`,
                    cursor: isBusy ? "not-allowed" : "pointer",
                    opacity: isBusy ? 0.45 : 1,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 20 }}>🛏</div>
                    <div>
                      <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 13, color: "#e8eaf0" }}>
                        Капсула {c.id}
                      </div>
                      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>
                        Этаж {c.floor}
                      </div>
                    </div>
                  </div>
                  <div>
                    {isMyBooked ? (
                      <div style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: "rgba(0,245,196,0.15)",
                        border: "1px solid rgba(0,245,196,0.3)",
                        fontFamily: "DM Mono, monospace",
                        fontSize: 10,
                        color: "#00f5c4",
                      }}>
                        ✓ Забронировано
                      </div>
                    ) : (
                      <div style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontFamily: "DM Mono, monospace",
                        fontSize: 10,
                        color: isBusy ? "#ff8a65" : "#00f5c4",
                        background: isBusy ? "rgba(255,138,101,0.10)" : "rgba(0,245,196,0.08)",
                        border: `1px solid ${isBusy ? "rgba(255,138,101,0.2)" : "rgba(0,245,196,0.15)"}`,
                      }}>
                        {isBusy ? `До ${c.until}` : "Свободно"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
