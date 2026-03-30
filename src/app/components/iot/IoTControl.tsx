import React, { useState, useEffect } from "react";

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  backdropFilter: "blur(12px)",
  ...extra,
});

// ─── DATA ────────────────────────────────────────────────────────────────────

const zones = [
  { id: "z1", name: "Open Space A", floor: 12, temp: 22, humidity: 47, co2: 620, light: 78, occupancy: 34, maxOccupancy: 50, status: "normal" },
  { id: "z2", name: "Open Space B", floor: 12, temp: 23, humidity: 52, co2: 710, light: 65, occupancy: 28, maxOccupancy: 50, status: "normal" },
  { id: "z3", name: "Зал Орион",    floor: 12, temp: 21, humidity: 44, co2: 480, light: 90, occupancy: 6,  maxOccupancy: 6,  status: "normal" },
  { id: "z4", name: "Зал Вега",     floor: 12, temp: 24, humidity: 56, co2: 890, light: 85, occupancy: 12, maxOccupancy: 12, status: "warning" },
  { id: "z5", name: "Лобби",        floor: 1,  temp: 20, humidity: 40, co2: 420, light: 100, occupancy: 18, maxOccupancy: 80, status: "normal" },
  { id: "z6", name: "Кафетерий",    floor: 4,  temp: 22, humidity: 58, co2: 540, light: 95, occupancy: 22, maxOccupancy: 40, status: "normal" },
];

const energyData = [
  { hour: "00", kw: 12 }, { hour: "02", kw: 9 }, { hour: "04", kw: 8 },
  { hour: "06", kw: 14 }, { hour: "08", kw: 42 }, { hour: "10", kw: 68 },
  { hour: "12", kw: 74 }, { hour: "14", kw: 71 }, { hour: "16", kw: 65 },
  { hour: "18", kw: 48 }, { hour: "20", kw: 30 }, { hour: "22", kw: 18 },
];
const maxKw = 80;

const alerts = [
  { id: "a1", zone: "Зал Вега",     msg: "CO₂ превышает норму (890 ppm)", level: "warning", time: "14:32" },
  { id: "a2", zone: "Open Space B", msg: "Влажность повышена (52%)",        level: "info",    time: "13:58" },
  { id: "a3", zone: "Лобби",        msg: "Освещение на 100% — снизить?",    level: "info",    time: "11:20" },
];

const scenariosData = [
  { id: "s1", label: "Рабочий день",  icon: "☀️", desc: "22°C · 70% свет · Вентиляция ×1.0" },
  { id: "s2", label: "Конференция",   icon: "👥", desc: "21°C · 90% свет · Вентиляция ×1.5" },
  { id: "s3", label: "Эко-режим",     icon: "🌿", desc: "20°C · 40% свет · Вентиляция ×0.6" },
  { id: "s4", label: "Ночной режим",  icon: "🌙", desc: "18°C · 5% свет · Вентиляция ×0.2" },
];

// ─── MINI SPARKLINE ────────────────────────────────────────────────────────

function Sparkline({ data, color, max }: { data: typeof energyData; color: string; max: number }) {
  const w = 220; const h = 48; const pad = 4;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.kw / max) * (h - pad * 2));
    return `${x},${y}`;
  });
  const polyline = pts.join(" ");
  const area = `${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <defs>
        <linearGradient id="sgFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sgFill)" />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// ─── GAUGE ─────────────────────────────────────────────────────────────────

function RadialGauge({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) {
  const pct = value / max;
  const r = 28; const cx = 36; const cy = 36;
  const circumference = Math.PI * r; // half circle
  const offset = circumference * (1 - pct);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={72} height={44} viewBox="0 0 72 44">
        <path d={`M8,36 A${r},${r} 0 0,1 64,36`} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} strokeLinecap="round" />
        <path
          d={`M8,36 A${r},${r} 0 0,1 64,36`}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
        <text x={36} y={34} textAnchor="middle" fill="#e8eaf0" fontSize={13} fontWeight={700} fontFamily="Syne, sans-serif">{value}</text>
      </svg>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", letterSpacing: "0.05em", textAlign: "center" }}>
        {label} <span style={{ color }}>{unit}</span>
      </div>
    </div>
  );
}

// ─── TOGGLE SLIDER ─────────────────────────────────────────────────────────

function Toggle({ on, onChange, color = "#00f5c4" }: { on: boolean; onChange: () => void; color?: string }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 38, height: 20, borderRadius: 10,
        background: on ? color : "rgba(255,255,255,0.1)",
        position: "relative", cursor: "pointer",
        transition: "background 0.2s",
        border: `1px solid ${on ? color : "rgba(255,255,255,0.15)"}`,
        boxShadow: on ? `0 0 8px ${color}40` : "none",
        flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute",
        top: 2, left: on ? 19 : 2,
        width: 14, height: 14,
        borderRadius: "50%",
        background: on ? "#080c14" : "rgba(255,255,255,0.5)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

// ─── SLIDER ────────────────────────────────────────────────────────────────

function SliderCtrl({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div style={{ position: "relative", height: 6, flex: 1 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 3, background: "rgba(255,255,255,0.08)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${value}%`, borderRadius: 3, background: color, boxShadow: `0 0 6px ${color}50` }} />
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "pointer", margin: 0, height: "100%",
        }}
      />
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────

export function IoTControl() {
  const [selectedZone, setSelectedZone] = useState(zones[0]);
  const [hvacOn, setHvacOn] = useState(true);
  const [lightsOn, setLightsOn] = useState(true);
  const [ventOn, setVentOn] = useState(true);
  const [blindsOn, setBlindsOn] = useState(false);
  const [lightVal, setLightVal] = useState(78);
  const [tempVal, setTempVal] = useState(22);
  const [activeScenario, setActiveScenario] = useState("s1");
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const co2Color = selectedZone.co2 > 800 ? "#ff8a65" : selectedZone.co2 > 650 ? "#ffd700" : "#00f5c4";

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
            IoT Контроль
          </h1>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginTop: 3 }}>
            New Level Hub · {zones.length} зон · Реальное время
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {alerts.filter(a => a.level === "warning").length > 0 && (
            <div style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(255,138,101,0.1)", border: "1px solid rgba(255,138,101,0.25)", fontFamily: "DM Mono, monospace", fontSize: 10, color: "#ff8a65" }}>
              ⚠ {alerts.filter(a => a.level === "warning").length} предупреждение
            </div>
          )}
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 16, color: "#e8eaf0", padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {liveTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Top strip: global KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Ср. температура", value: "22°C", sub: "Норма: 21–23°C", color: "#00f5c4" },
          { label: "Ср. влажность", value: "49%", sub: "Норма: 40–60%", color: "#6c8aff" },
          { label: "Потребление", value: "68 кВт", sub: "−12% vs вчера", color: "#ff8a65" },
          { label: "Активных сенсоров", value: "142", sub: "4 оффлайн", color: "#00f5c4" },
        ].map((k) => (
          <div key={k.label} style={card({ padding: "14px 16px" })}>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 26, color: k.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", marginTop: 6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Main row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        {/* Zone list + detail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Zone selector */}
          <div style={card({ padding: "14px 16px" })}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              Зоны здания
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {zones.map((z) => (
                <div
                  key={z.id}
                  onClick={() => { setSelectedZone(z); setLightVal(z.light); setTempVal(z.temp); }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: selectedZone.id === z.id ? "rgba(0,245,196,0.07)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedZone.id === z.id ? "rgba(0,245,196,0.3)" : "rgba(255,255,255,0.06)"}`,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 12, color: "#e8eaf0" }}>{z.name}</div>
                    {z.status === "warning" && <span style={{ fontSize: 11 }}>⚠️</span>}
                  </div>
                  <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginTop: 3 }}>
                    {z.temp}°C · {z.humidity}% · {z.occupancy}/{z.maxOccupancy} чел
                  </div>
                  <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(z.occupancy / z.maxOccupancy) * 100}%`, background: z.occupancy === z.maxOccupancy ? "#ff8a65" : "#00f5c4", borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected zone gauges */}
          <div style={card({ padding: "16px" })}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 14 }}>
              {selectedZone.name} · Датчики
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              <RadialGauge value={selectedZone.temp} max={35} color="#ff8a65" label="Темп." unit="°C" />
              <RadialGauge value={selectedZone.humidity} max={100} color="#6c8aff" label="Влажн." unit="%" />
              <RadialGauge value={Math.round((selectedZone.co2 / 1200) * 100)} max={100} color={co2Color} label="CO₂" unit="ppm" />
              <RadialGauge value={selectedZone.light} max={100} color="#ffd700" label="Свет" unit="%" />
            </div>
            <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: `rgba(${co2Color === "#ff8a65" ? "255,138,101" : "0,245,196"},0.07)`, border: `1px solid ${co2Color}30`, fontFamily: "DM Mono, monospace", fontSize: 10, color: co2Color }}>
              CO₂: {selectedZone.co2} ppm · {selectedZone.co2 > 800 ? "⚠ Выше нормы, рекомендуется проветривание" : "✓ В норме"}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Scenarios */}
          <div style={card({ padding: "16px" })}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
              Сценарии
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {scenariosData.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => setActiveScenario(sc.id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1px solid ${activeScenario === sc.id ? "rgba(0,245,196,0.35)" : "rgba(255,255,255,0.07)"}`,
                    background: activeScenario === sc.id ? "rgba(0,245,196,0.08)" : "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{sc.icon}</div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 11, color: activeScenario === sc.id ? "#00f5c4" : "#e8eaf0" }}>{sc.label}</div>
                  <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", marginTop: 2 }}>{sc.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual controls */}
          <div style={card({ padding: "16px" })}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Ручное управление · {selectedZone.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Toggles */}
              {[
                { label: "Кондиционер / HVAC", on: hvacOn, set: () => setHvacOn(v => !v), color: "#6c8aff" },
                { label: "Основное освещение", on: lightsOn, set: () => setLightsOn(v => !v), color: "#ffd700" },
                { label: "Вентиляция",          on: ventOn,  set: () => setVentOn(v => !v),  color: "#00f5c4" },
                { label: "Жалюзи (авто)",       on: blindsOn,set: () => setBlindsOn(v => !v),color: "#ff8a65" },
              ].map((ctrl) => (
                <div key={ctrl.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: ctrl.on ? "#e8eaf0" : "#8892a4" }}>{ctrl.label}</span>
                  <Toggle on={ctrl.on} onChange={ctrl.set} color={ctrl.color} />
                </div>
              ))}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />
              {/* Sliders */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#e8eaf0" }}>Яркость</span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#ffd700" }}>{lightVal}%</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12 }}>🌑</span>
                  <SliderCtrl value={lightVal} onChange={setLightVal} color="#ffd700" />
                  <span style={{ fontSize: 12 }}>☀️</span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#e8eaf0" }}>Температура</span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#ff8a65" }}>{tempVal}°C</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12 }}>❄️</span>
                  <SliderCtrl value={tempVal * 3.3} onChange={(v) => setTempVal(Math.round(v / 3.3))} color="#ff8a65" />
                  <span style={{ fontSize: 12 }}>🔥</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: Energy + Alerts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, paddingBottom: 24 }}>
        {/* Energy chart */}
        <div style={card({ padding: "16px" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>
              Потребление энергии
            </div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#ff8a65" }}>СЕЙЧАС 68 КВТ</div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 64 }}>
            {energyData.map((d) => {
              const h = Math.round((d.kw / maxKw) * 56);
              const isCurrent = d.hour === "12";
              return (
                <div key={d.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{
                    width: "100%", height: h,
                    borderRadius: "3px 3px 0 0",
                    background: isCurrent
                      ? "linear-gradient(180deg, #ff8a65, rgba(255,138,101,0.5))"
                      : "rgba(108,138,255,0.3)",
                    boxShadow: isCurrent ? "0 0 8px rgba(255,138,101,0.4)" : "none",
                    transition: "height 0.3s",
                  }} />
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 8, color: "#8892a4" }}>{d.hour}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>Сегодня: 412 кВт·ч</span>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#00f5c4" }}>−12% vs вчера</span>
          </div>
        </div>

        {/* Alerts */}
        <div style={card({ padding: "16px" })}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0", marginBottom: 12 }}>
            Уведомления системы
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a) => (
              <div key={a.id} style={{
                display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10,
                background: a.level === "warning" ? "rgba(255,138,101,0.06)" : "rgba(108,138,255,0.06)",
                border: `1px solid ${a.level === "warning" ? "rgba(255,138,101,0.2)" : "rgba(108,138,255,0.15)"}`,
                borderLeft: `3px solid ${a.level === "warning" ? "#ff8a65" : "#6c8aff"}`,
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{a.level === "warning" ? "⚠️" : "ℹ️"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#e8eaf0", marginBottom: 2 }}>{a.zone}</div>
                  <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8892a4" }}>{a.msg}</div>
                </div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", flexShrink: 0 }}>{a.time}</div>
              </div>
            ))}
            <button style={{
              marginTop: 4, padding: "8px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)",
              cursor: "pointer", fontFamily: "Syne, sans-serif", fontSize: 11, color: "#8892a4",
              transition: "all 0.15s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e8eaf0"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8892a4"; }}
            >
              Посмотреть все уведомления (12) →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
