import React, { useState, useEffect } from "react";

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  backdropFilter: "blur(12px)",
  ...extra,
});

// ─── DATA ────────────────────────────────────────────────────────────────────

const robots = [
  { id: "R-041", name: "Орбита-1", type: "delivery", status: "active",   battery: 78, floor: 12, task: "Доставка: Кофе × 3",       eta: "~4 мин",  speed: 1.2, totalDeliveries: 1284 },
  { id: "R-039", name: "Нова-2",   type: "delivery", status: "loading",  battery: 55, floor: 11, task: "Загрузка: Документы HR",    eta: "~9 мин",  speed: 0.0, totalDeliveries: 987  },
  { id: "R-036", name: "Пульсар-3",type: "delivery", status: "active",   battery: 62, floor: 3,  task: "Доставка: Посылка VIP",     eta: "~14 мин", speed: 0.8, totalDeliveries: 1102 },
  { id: "R-022", name: "Кварк-4",  type: "cleaning", status: "active",   battery: 91, floor: 8,  task: "Уборка: Коридор 8А",        eta: "—",       speed: 0.3, totalDeliveries: 640  },
  { id: "R-018", name: "Протон-5", type: "delivery", status: "charging", battery: 23, floor: 0,  task: "На зарядке · Станция B1",   eta: "~42 мин", speed: 0.0, totalDeliveries: 1450 },
  { id: "R-011", name: "Фотон-6",  type: "cleaning", status: "charging", battery: 8,  floor: 0,  task: "На зарядке · Станция B1",   eta: "~90 мин", speed: 0.0, totalDeliveries: 890  },
];

const deliveryLog = [
  { id: "D-1904", robot: "R-041", from: "Кухня 4 эт.", to: "A302 · 12 эт.", item: "Кофе × 3, Сэндвичи", time: "14:28", duration: "6 мин", status: "done" },
  { id: "D-1903", robot: "R-036", from: "Ресепшен",    to: "B201 · VIP",     item: "Посылка (конфиденц.)", time: "14:15", duration: "11 мин", status: "transit" },
  { id: "D-1902", robot: "R-041", from: "Кухня 4 эт.", to: "C108 · 11 эт.", item: "Обед × 2",           time: "13:50", duration: "8 мин", status: "done" },
  { id: "D-1901", robot: "R-039", from: "HR · 9 эт.",  to: "A302 · 12 эт.", item: "Документы HR",        time: "13:20", duration: "9 мин", status: "done" },
  { id: "D-1900", robot: "R-022", from: "Склад",        to: "Open Space A",  item: "Расходники",          time: "12:44", duration: "5 мин", status: "done" },
];

// 6×5 building floor map (floors × zones)
const FLOORS = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const ZONES_PER_FLOOR = 6;

const statusCfg = {
  active:   { color: "#00f5c4", label: "Активен",    icon: "▶" },
  loading:  { color: "#ffd700", label: "Загрузка",   icon: "⬤" },
  charging: { color: "#ff8a65", label: "Зарядка",    icon: "⚡" },
  idle:     { color: "#8892a4", label: "Ожидание",   icon: "◌" },
};

const typeCfg = {
  delivery: { emoji: "🤖", label: "Доставка" },
  cleaning: { emoji: "🧹", label: "Уборка" },
};

// ─── BATTERY BAR ─────────────────────────────────────────────────────────────

function BatteryBar({ value }: { value: number }) {
  const color = value > 60 ? "#00f5c4" : value > 25 ? "#ffd700" : "#ff8a65";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{
        width: 28, height: 12, borderRadius: 3,
        border: `1.5px solid ${color}60`,
        padding: "1.5px 2px",
        display: "flex", alignItems: "center",
        position: "relative",
        background: "rgba(0,0,0,0.3)",
      }}>
        <div style={{
          width: `${value}%`, height: "100%",
          background: color, borderRadius: 1.5,
          boxShadow: `0 0 4px ${color}60`,
          transition: "width 0.5s",
        }} />
        {/* nub */}
        <div style={{ position: "absolute", right: -4, top: "50%", transform: "translateY(-50%)", width: 3, height: 6, background: `${color}60`, borderRadius: "0 2px 2px 0" }} />
      </div>
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color }}>{value}%</span>
    </div>
  );
}

// ─── BUILDING MAP ─────────────────────────────────────────────────────────────

function BuildingMap({ robots: botList }: { robots: typeof robots }) {
  return (
    <div>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginBottom: 8, letterSpacing: "0.06em" }}>
        СХЕМА ЗДАНИЯ · ПОЗИЦИИ РОБОТОВ
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {/* Floor labels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {FLOORS.map(f => (
            <div key={f} style={{
              height: 20,
              display: "flex", alignItems: "center",
              fontFamily: "DM Mono, monospace", fontSize: 8, color: "#8892a4",
              width: 24, justifyContent: "flex-end", paddingRight: 4,
            }}>
              {f === 0 ? "B1" : `${f}`}
            </div>
          ))}
        </div>
        {/* Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {FLOORS.map(f => {
            const botsOnFloor = botList.filter(b => b.floor === f);
            return (
              <div key={f} style={{ display: "grid", gridTemplateColumns: `repeat(${ZONES_PER_FLOOR}, 1fr)`, gap: 3 }}>
                {Array.from({ length: ZONES_PER_FLOOR }).map((_, zi) => {
                  const bot = botsOnFloor[zi];
                  const isBase = f === 0;
                  return (
                    <div
                      key={zi}
                      title={bot ? `${bot.name} · ${bot.task}` : undefined}
                      style={{
                        height: 20,
                        borderRadius: 4,
                        background: bot
                          ? `${statusCfg[bot.status as keyof typeof statusCfg].color}20`
                          : isBase ? "rgba(255,138,101,0.05)" : "rgba(255,255,255,0.03)",
                        border: bot
                          ? `1px solid ${statusCfg[bot.status as keyof typeof statusCfg].color}50`
                          : isBase ? "1px solid rgba(255,138,101,0.1)" : "1px solid rgba(255,255,255,0.05)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: bot ? 10 : 0,
                        transition: "all 0.3s",
                        boxShadow: bot ? `0 0 6px ${statusCfg[bot.status as keyof typeof statusCfg].color}25` : "none",
                      }}
                    >
                      {bot && <span>{typeCfg[bot.type as keyof typeof typeCfg].emoji}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        {Object.entries(statusCfg).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: v.color }} />
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4" }}>{v.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function Robotics() {
  const [selectedRobot, setSelectedRobot] = useState<typeof robots[0] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 2000);
    return () => clearInterval(t);
  }, []);

  const activeCount = robots.filter(r => r.status === "active").length;
  const chargingCount = robots.filter(r => r.status === "charging").length;
  const avgBattery = Math.round(robots.reduce((s, r) => s + r.battery, 0) / robots.length);
  const totalToday = 31;

  return (
    <div style={{
      padding: "24px 32px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      backgroundImage: "repeating-linear-gradient(180deg, transparent 0px, transparent 39px, rgba(255,255,255,0.018) 39px, rgba(255,255,255,0.018) 40px)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 28, color: "#e8eaf0", margin: 0, letterSpacing: "-0.04em" }}>
            Робофлот
          </h1>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginTop: 3 }}>
            {robots.length} роботов · {activeCount} активных · Реальное время
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "Активных", value: activeCount,   color: "#00f5c4" },
            { label: "Зарядка",  value: chargingCount, color: "#ff8a65" },
            { label: "Средний заряд", value: `${avgBattery}%`, color: "#ffd700" },
            { label: "Сегодня", value: `${totalToday} доставок`, color: "#6c8aff" },
          ].map(s => (
            <div key={s.label} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 18, color: s.color, lineHeight: 1.2 }}>{s.value}</div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>
        {/* Robot fleet */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={card({ padding: "16px" })}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Флот роботов
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {robots.map(r => {
                const sc = statusCfg[r.status as keyof typeof statusCfg];
                const tc = typeCfg[r.type as keyof typeof typeCfg];
                const isSelected = selectedRobot?.id === r.id;
                // Animate active robot "pulse" using tick
                const pulse = r.status === "active" && tick % 2 === 0;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRobot(isSelected ? null : r)}
                    style={{
                      display: "flex", gap: 12, alignItems: "center", padding: "12px 14px",
                      borderRadius: 12,
                      background: isSelected ? `${sc.color}0a` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isSelected ? `${sc.color}40` : "rgba(255,255,255,0.06)"}`,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                  >
                    {/* Robot icon */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: `${sc.color}12`,
                      border: `1px solid ${sc.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20,
                      boxShadow: r.status === "active" ? `0 0 ${pulse ? 14 : 6}px ${sc.color}30` : "none",
                      transition: "box-shadow 0.5s",
                    }}>
                      {tc.emoji}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                        <span style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>{r.name}</span>
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4" }}>#{r.id}</span>
                        <div style={{
                          marginLeft: "auto",
                          padding: "2px 7px", borderRadius: 4,
                          background: `${sc.color}15`, border: `1px solid ${sc.color}30`,
                          fontFamily: "DM Mono, monospace", fontSize: 9, color: sc.color,
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <span style={{ fontSize: 7 }}>{sc.icon}</span>{sc.label}
                        </div>
                      </div>
                      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.task}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <BatteryBar value={r.battery} />
                        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4" }}>
                          {r.floor === 0 ? "База B1" : `Этаж ${r.floor}`} · ETA {r.eta}
                        </span>
                      </div>
                    </div>

                    {/* Speed */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 14, color: r.speed > 0 ? "#00f5c4" : "#8892a4" }}>
                        {r.speed.toFixed(1)}
                      </div>
                      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, color: "#8892a4" }}>м/с</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected robot detail */}
          {selectedRobot && (
            <div style={card({
              padding: "16px",
              border: `1px solid ${statusCfg[selectedRobot.status as keyof typeof statusCfg].color}30`,
              background: `${statusCfg[selectedRobot.status as keyof typeof statusCfg].color}07`,
            })}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "#e8eaf0" }}>
                    {typeCfg[selectedRobot.type as keyof typeof typeCfg].emoji} {selectedRobot.name}
                  </div>
                  <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>
                    #{selectedRobot.id} · {typeCfg[selectedRobot.type as keyof typeof typeCfg].label}
                  </div>
                </div>
                <button onClick={() => setSelectedRobot(null)} style={{ background: "none", border: "none", color: "#8892a4", cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { label: "Статус", value: statusCfg[selectedRobot.status as keyof typeof statusCfg].label, color: statusCfg[selectedRobot.status as keyof typeof statusCfg].color },
                  { label: "Этаж", value: selectedRobot.floor === 0 ? "База" : `${selectedRobot.floor} эт.`, color: "#6c8aff" },
                  { label: "ETA", value: selectedRobot.eta, color: "#00f5c4" },
                  { label: "Всего доставок", value: selectedRobot.totalDeliveries.toLocaleString(), color: "#ffd700" },
                ].map(i => (
                  <div key={i.label} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", textAlign: "center" }}>
                    <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: i.color, whiteSpace: "nowrap" }}>{i.value}</div>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, color: "#8892a4", marginTop: 2 }}>{i.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>
                📦 {selectedRobot.task}
              </div>
            </div>
          )}
        </div>

        {/* Right: building map + stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card({ padding: "16px" })}>
            <BuildingMap robots={robots} />
          </div>

          {/* Stats */}
          <div style={card({ padding: "16px" })}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              Статистика · Сегодня
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "Доставок выполнено", value: "28", color: "#00f5c4" },
                { label: "В процессе", value: "3", color: "#ffd700" },
                { label: "Среднее ETA", value: "8.4 мин", color: "#6c8aff" },
                { label: "Пробег флота", value: "14.2 км", color: "#ff8a65" },
              ].map(s => (
                <div key={s.label} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 22, color: s.color, letterSpacing: "-0.03em", lineHeight: 1.1 }}>{s.value}</div>
                  <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delivery log */}
      <div style={card({ padding: "16px", marginBottom: 24 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>
            Лог доставок
          </div>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>
            Последние 5 операций
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {deliveryLog.map(d => (
            <div
              key={d.id}
              style={{
                padding: "12px 13px", borderRadius: 10,
                background: d.status === "transit" ? "rgba(0,245,196,0.05)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${d.status === "transit" ? "rgba(0,245,196,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#6c8aff" }}>{d.id}</span>
                <div style={{
                  padding: "1px 6px", borderRadius: 3,
                  background: d.status === "transit" ? "rgba(0,245,196,0.12)" : "rgba(255,255,255,0.06)",
                  fontFamily: "DM Mono, monospace", fontSize: 8,
                  color: d.status === "transit" ? "#00f5c4" : "#8892a4",
                }}>
                  {d.status === "transit" ? "В ПУТИ" : "✓"}
                </div>
              </div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, color: "#e8eaf0", marginBottom: 4, lineHeight: 1.4 }}>{d.item}</div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", marginBottom: 2 }}>
                {d.from} → {d.to}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4" }}>{d.time}</span>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#6c8aff" }}>{d.duration}</span>
              </div>
              <div style={{ marginTop: 5, fontFamily: "DM Mono, monospace", fontSize: 8, color: "#8892a4" }}>
                {d.robot}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
