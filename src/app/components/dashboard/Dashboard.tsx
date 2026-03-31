import React, { useState } from "react";
import type { SystemSnapshot } from "../../lib/api";

const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  backdropFilter: "blur(12px)",
  ...extra,
});

const quickActions = [
  {
    id: "book",
    icon: "◫",
    label: "Книга переговорки",
    desc: "Свободно 4 зала",
    color: "#00f5c4",
    bg: "rgba(0,245,196,0.08)",
    border: "rgba(0,245,196,0.2)",
  },
  {
    id: "robot",
    icon: "◬",
    label: "Вызвать робота",
    desc: "Доставка за 3–8 мин",
    color: "#6c8aff",
    bg: "rgba(108,138,255,0.08)",
    border: "rgba(108,138,255,0.2)",
  },
  {
    id: "food",
    icon: "◉",
    label: "Заказать еду",
    desc: "Кухня открыта",
    color: "#ff8a65",
    bg: "rgba(255,138,101,0.08)",
    border: "rgba(255,138,101,0.2)",
  },
  {
    id: "iot",
    icon: "⬡",
    label: "IoT Контроль",
    desc: "22°C · 48% влаж.",
    color: "#00f5c4",
    bg: "rgba(0,245,196,0.06)",
    border: "rgba(0,245,196,0.15)",
  },
];

const schedule = [
  { time: "09:00", title: "Stand-up команды", room: "Зал Орион", color: "#6c8aff", done: true },
  { time: "11:00", title: "Ревью продукта Q2", room: "Зал Вега · 8 чел.", color: "#00f5c4", done: false, active: true },
  { time: "13:00", title: "Обед с Dola summary", room: "Кафетерий 4 эт.", color: "#ff8a65", done: false },
  { time: "15:30", title: "1:1 с командой дизайна", room: "Зал Сириус", color: "#6c8aff", done: false },
  { time: "17:00", title: "Quarterly OKR Review", room: "Конф. зал A", color: "#00f5c4", done: false },
];

const deliveries = [
  { id: "R-041", item: "Кофе × 3, Сэндвичи", floor: "12 эт. · A302", eta: "~4 мин", status: "В пути", color: "#00f5c4", x: 2, y: 1 },
  { id: "R-039", item: "Документы HR", floor: "11 эт. → 12 эт.", eta: "~9 мин", status: "Загрузка", color: "#ff8a65", x: 0, y: 0 },
  { id: "R-036", item: "Посылка из ресепшена", floor: "1 эт. → 12 эт.", eta: "~14 мин", status: "Ожидание", color: "#6c8aff", x: 3, y: 2 },
];

// Floor map grid (5×4)
const GRID_W = 5;
const GRID_H = 4;

interface DashboardProps {
  snapshot: SystemSnapshot | null;
  isLoadingSnapshot: boolean;
  snapshotError: string | null;
}

export function Dashboard({ snapshot, isLoadingSnapshot, snapshotError }: DashboardProps) {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const featureFlags = snapshot?.features?.features;
  const quickActionsActual = quickActions.map((action) => {
    if (!featureFlags) return action;
    if (action.id === "book") return { ...action, desc: featureFlags.booking ? "Модуль активен" : "Модуль выключен" };
    if (action.id === "iot") return { ...action, desc: featureFlags.iot ? "Модуль активен" : "Модуль выключен" };
    if (action.id === "robot") return { ...action, desc: featureFlags.crm ? "CRM включен" : "CRM выключен" };
    return { ...action, desc: featureFlags.auth ? "Auth доступен" : "Auth недоступен" };
  });

  const uptimeHours = snapshot?.uptime ? Math.floor(snapshot.uptime.uptime_seconds / 3600) : null;
  const uptimeMinutes = snapshot?.uptime ? Math.floor((snapshot.uptime.uptime_seconds % 3600) / 60) : null;
  const uptimeLabel =
    uptimeHours === null || uptimeMinutes === null ? "n/a" : `${uptimeHours}ч ${uptimeMinutes}м`;

  const statsActual = [
    {
      label: "Статус API",
      value: snapshot?.ping?.message === "pong" ? "OK" : "ERR",
      unit: "",
      sub: snapshot?.environment ? `${snapshot.environment.environment} · debug=${String(snapshot.environment.debug)}` : "Нет данных",
      color: snapshot?.ping?.message === "pong" ? "#00f5c4" : "#ff8a65",
    },
    {
      label: "Uptime сервиса",
      value: uptimeLabel,
      unit: "",
      sub: snapshot?.uptime?.started_at ? `Старт: ${snapshot.uptime.started_at}` : "Нет данных",
      color: "#6c8aff",
    },
    {
      label: "Поддерживаемые роли",
      value: String(snapshot?.roles?.length ?? 0),
      unit: "",
      sub: "Из /api/v1/auth/roles/",
      color: "#ff8a65",
    },
  ];

  return (
    <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
      {(isLoadingSnapshot || snapshotError) && (
        <div
          style={{
            ...cardStyle({
              padding: "12px 16px",
              color: snapshotError ? "#ff8a65" : "#8892a4",
              fontFamily: "DM Mono, monospace",
              fontSize: 11,
            }),
          }}
        >
          {snapshotError ? `Ошибка загрузки backend данных: ${snapshotError}` : "Загрузка данных с backend..."}
        </div>
      )}
      {/* Quick Actions */}
      <section>
        <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
          Быстрые сценарии
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {quickActionsActual.map((a) => (
            <button
              key={a.id}
              onMouseEnter={() => setHoveredAction(a.id)}
              onMouseLeave={() => setHoveredAction(null)}
              style={{
                ...cardStyle({
                  padding: "18px 20px",
                  background: hoveredAction === a.id ? a.bg : "rgba(255,255,255,0.04)",
                  border: `1px solid ${hoveredAction === a.id ? a.border : "rgba(255,255,255,0.07)"}`,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  transform: hoveredAction === a.id ? "translateY(-2px)" : "none",
                }),
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 10, color: a.color }}>{a.icon}</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 13, color: "#e8eaf0", marginBottom: 4 }}>
                {a.label}
              </div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8892a4" }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Middle Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
        {/* Schedule */}
        <section style={cardStyle({ padding: "20px" })}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            Расписание дня
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {schedule.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: i < schedule.length - 1 ? 16 : 0 }}>
                {/* Line */}
                {i < schedule.length - 1 && (
                  <div style={{
                    position: "absolute",
                    left: 46,
                    top: 20,
                    bottom: 0,
                    width: 1,
                    background: "rgba(255,255,255,0.06)",
                  }} />
                )}
                {/* Time */}
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: item.done ? "#8892a4" : "#e8eaf0", width: 36, flexShrink: 0, opacity: item.done ? 0.5 : 1, paddingTop: 2 }}>
                  {item.time}
                </div>
                {/* Dot */}
                <div style={{ position: "relative", flexShrink: 0, paddingTop: 6 }}>
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: item.done ? "rgba(255,255,255,0.15)" : item.active ? item.color : "rgba(255,255,255,0.1)",
                    border: `2px solid ${item.done ? "rgba(255,255,255,0.1)" : item.color}`,
                    boxShadow: item.active ? `0 0 10px ${item.color}` : "none",
                  }} />
                </div>
                {/* Content */}
                <div style={{ flex: 1, opacity: item.done ? 0.45 : 1 }}>
                  <div style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: item.active ? 600 : 400,
                    fontSize: 13,
                    color: item.active ? "#e8eaf0" : "#c8cad4",
                    marginBottom: 2,
                    textDecoration: item.done ? "line-through" : "none",
                  }}>
                    {item.title}
                  </div>
                  <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>
                    {item.room}
                  </div>
                  {item.active && (
                    <div style={{
                      display: "inline-flex",
                      marginTop: 4,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "rgba(0,245,196,0.12)",
                      border: "1px solid rgba(0,245,196,0.2)",
                      fontFamily: "DM Mono, monospace",
                      fontSize: 9,
                      color: "#00f5c4",
                      letterSpacing: "0.05em",
                    }}>
                      СЕЙЧАС
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Deliveries */}
        <section style={cardStyle({ padding: "20px" })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Активные доставки
            </div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#00f5c4" }}>3 АКТИВНЫХ</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Delivery list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {deliveries.map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: d.color }}>#{d.id}</div>
                    <div style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 9,
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: `rgba(${d.color === "#00f5c4" ? "0,245,196" : d.color === "#ff8a65" ? "255,138,101" : "108,138,255"},0.12)`,
                      color: d.color,
                    }}>
                      {d.status}
                    </div>
                  </div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#e8eaf0", marginBottom: 4 }}>{d.item}</div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>{d.floor}</div>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#e8eaf0" }}>ETA {d.eta}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Floor Map */}
            <div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginBottom: 8, letterSpacing: "0.06em" }}>
                12 ЭТАЖ · СХЕМА
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${GRID_W}, 1fr)`,
                  gap: 4,
                  padding: 12,
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {Array.from({ length: GRID_W * GRID_H }).map((_, i) => {
                  const col = i % GRID_W;
                  const row = Math.floor(i / GRID_W);
                  const robot = deliveries.find((d) => d.x === col && d.y === row);
                  const isWall = (row === 1 && col === 2);
                  return (
                    <div
                      key={i}
                      style={{
                        height: 32,
                        borderRadius: 6,
                        background: isWall
                          ? "rgba(255,255,255,0.02)"
                          : robot
                          ? `rgba(${robot.color === "#00f5c4" ? "0,245,196" : robot.color === "#ff8a65" ? "255,138,101" : "108,138,255"},0.18)`
                          : "rgba(255,255,255,0.03)",
                        border: isWall
                          ? "1px solid rgba(255,255,255,0.04)"
                          : robot
                          ? `1px solid ${robot.color}40`
                          : "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: robot ? 14 : 0,
                        transition: "all 0.3s ease",
                        boxShadow: robot ? `0 0 8px ${robot.color}30` : "none",
                      }}
                    >
                      {robot && <span title={`Робот ${robot.id}`}>🤖</span>}
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
                {deliveries.map((d) => (
                  <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4" }}>{d.id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {statsActual.map((s, i) => (
          <div key={i} style={cardStyle({ padding: "20px 24px" })}>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8892a4", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {s.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 40, color: s.color, lineHeight: 1 }}>
                {s.value}
              </span>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 14, color: "#8892a4" }}>
                {s.unit}
              </span>
            </div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginTop: 6 }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
