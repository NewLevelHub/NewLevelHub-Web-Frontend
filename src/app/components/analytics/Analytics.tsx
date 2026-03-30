import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";

// ─── DATA ────────────────────────────────────────────────────────────────────

const hourlyData = [
  { hour: "08:00", openSpace: 22, meetings: 18, parking: 38 },
  { hour: "09:00", openSpace: 52, meetings: 58, parking: 62 },
  { hour: "10:00", openSpace: 70, meetings: 76, parking: 71 },
  { hour: "11:00", openSpace: 84, meetings: 94, parking: 77 },
  { hour: "12:00", openSpace: 88, meetings: 90, parking: 74 },
  { hour: "13:00", openSpace: 80, meetings: 87, parking: 70 },
  { hour: "14:00", openSpace: 73, meetings: 78, parking: 64 },
  { hour: "15:00", openSpace: 66, meetings: 70, parking: 57 },
  { hour: "16:00", openSpace: 55, meetings: 62, parking: 52 },
  { hour: "17:00", openSpace: 44, meetings: 50, parking: 44 },
  { hour: "18:00", openSpace: 30, meetings: 36, parking: 36 },
  { hour: "19:00", openSpace: 17, meetings: 20, parking: 27 },
  { hour: "20:00", openSpace: 9,  meetings: 11, parking: 18 },
];

const kpiData = [
  { label: "Посещаемость", value: "247", unit: "чел", delta: "+12%", up: true },
  { label: "Загрузка залов", value: "68", unit: "%", delta: "+8%", up: true },
  { label: "Заказы через платформу", value: "1 240", unit: "шт", delta: "+34%", up: true },
  { label: "Средний чек доставки", value: "840", unit: "₽", delta: "−5%", up: false },
  { label: "Экономия vs ручные", value: "2.4М", unit: "₽", delta: "+18%", up: true },
];

const aiInsights = [
  { icon: "💡", text: "Вторник — пик нагрузки. Переговорки заняты на 94% с 11:00 до 13:00.", color: "#6c8aff" },
  { icon: "📉", text: "Затраты на печать снизились на 23% после внедрения платформы.", color: "#00f5c4" },
  { icon: "⚡", text: "Open Space пустой по пятницам после 16:00 — зона оптимизации.", color: "#ff8a65" },
  { icon: "🤖", text: "Роботы заменили 340 ручных доставок за месяц, сэкономив 4.2 часа.", color: "#a78bfa" },
];

const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const timeSlots = ["09–10", "10–11", "11–12", "12–13", "13–14", "14–15", "15–16"];
const heatmapData: number[][] = [
  [20, 45, 72, 68, 55, 40, 25],
  [30, 60, 94, 88, 72, 55, 35],
  [24, 50, 80, 76, 64, 44, 28],
  [20, 42, 65, 70, 58, 40, 20],
  [16, 36, 52, 50, 32, 18, 8],
  [4,  8,  14, 12, 7,  4,  2],
  [2,  4,  7,  8,  5,  3,  1],
];

const roomsData = [
  { name: "Atlas",  value: 94, color: "#6c8aff" },
  { name: "Nexus",  value: 87, color: "#6c8aff" },
  { name: "Void",   value: 76, color: "#6c8aff" },
  { name: "Orbit",  value: 68, color: "#6c8aff" },
  { name: "Core",   value: 54, color: "#6c8aff" },
  { name: "Pulse",  value: 41, color: "#6c8aff" },
];

const deliveryData = [
  { label: "Еда",        value: 45, color: "#ff8a65" },
  { label: "Документы",  value: 28, color: "#6c8aff" },
  { label: "Клининг",    value: 18, color: "#00f5c4" },
  { label: "VIP-встречи",value: 9,  color: "#a78bfa" },
];
const DONUT_TOTAL = 31;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function heatColor(value: number): string {
  const t = Math.max(0, Math.min(1, value / 100));
  if (t < 0.08) return "rgba(255,255,255,0.03)";
  return `rgba(0,245,196,${(0.06 + 0.78 * t).toFixed(2)})`;
}

function heatBorder(value: number): string {
  const t = Math.max(0, Math.min(1, value / 100));
  if (t < 0.08) return "rgba(255,255,255,0.05)";
  return `rgba(0,245,196,${(0.08 + 0.5 * t).toFixed(2)})`;
}

// ─── SVG DONUT ────────────────────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, outerR: number, innerR: number, startPct: number, endPct: number) {
  const startAngle = startPct * 3.6;
  const endAngle = endPct * 3.6;
  const s = polarToXY(cx, cy, outerR, startAngle);
  const e = polarToXY(cx, cy, outerR, endAngle);
  const si = polarToXY(cx, cy, innerR, endAngle);
  const ei = polarToXY(cx, cy, innerR, startAngle);
  const large = endPct - startPct > 50 ? 1 : 0;
  return `M${s.x},${s.y} A${outerR},${outerR} 0 ${large},1 ${e.x},${e.y} L${si.x},${si.y} A${innerR},${innerR} 0 ${large},0 ${ei.x},${ei.y}Z`;
}

function DonutChart() {
  const cx = 80, cy = 80, outerR = 66, innerR = 46;
  let cumulative = 0;
  return (
    <svg width={160} height={160} style={{ display: "block" }}>
      <defs>
        {deliveryData.map((d) => (
          <filter key={d.label} id={`glow-${d.label}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>
      {deliveryData.map((d) => {
        const start = cumulative;
        const end = cumulative + d.value;
        cumulative = end;
        return (
          <path
            key={d.label}
            d={arcPath(cx, cy, outerR, innerR, start, end)}
            fill={d.color}
            opacity={0.9}
            strokeWidth={1.5}
            stroke="rgba(8,12,20,0.8)"
          />
        );
      })}
      {/* Center hole bg */}
      <circle cx={cx} cy={cy} r={innerR - 2} fill="rgba(8,12,20,0.95)" />
      {/* Center text */}
      <text
        x={cx} y={cy - 8}
        textAnchor="middle"
        fill="#e8eaf0"
        fontSize={22}
        fontWeight={800}
        fontFamily="Syne, sans-serif"
      >
        {DONUT_TOTAL}
      </text>
      <text
        x={cx} y={cy + 10}
        textAnchor="middle"
        fill="#8892a4"
        fontSize={9}
        fontFamily="DM Mono, monospace"
        letterSpacing="0.06em"
      >
        СЕГОДНЯ
      </text>
    </svg>
  );
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(8,12,20,0.97)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      padding: "10px 14px",
      backdropFilter: "blur(16px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    }}>
      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginBottom: 8, letterSpacing: "0.06em" }}>
        {label}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
          <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#8892a4" }}>{p.name}:</span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: p.color, marginLeft: "auto", paddingLeft: 8 }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

// ─── CARD STYLE ───────────────────────────────────────────────────────────────

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  backdropFilter: "blur(12px)",
  ...extra,
});

const PERIODS = ["День", "Неделя", "Месяц"];
const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function Analytics() {
  const [period, setPeriod] = useState("Месяц");
  const [monthIdx, setMonthIdx] = useState(2); // March
  const [year] = useState(2026);

  return (
    <div
      style={{
        padding: "24px 32px 0",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minHeight: "100%",
        // Bloomberg-style horizontal grid lines
        backgroundImage:
          "repeating-linear-gradient(180deg, transparent 0px, transparent 39px, rgba(255,255,255,0.022) 39px, rgba(255,255,255,0.022) 40px)",
      }}
    >
      {/* ── HEADER + DATE RANGE ─────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 800,
            fontSize: 28,
            color: "#e8eaf0",
            margin: 0,
            letterSpacing: "-0.04em",
          }}>
            Аналитика
          </h1>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginTop: 3, letterSpacing: "0.06em" }}>
            New Level Hub · Реальное время · Обновлено 1 мин назад
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Month picker */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            overflow: "hidden",
          }}>
            <button
              onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#8892a4", padding: "7px 12px", fontSize: 14,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e8eaf0"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8892a4"; }}
            >‹</button>
            <div style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: "#e8eaf0",
              padding: "7px 4px",
              minWidth: 110,
              textAlign: "center",
            }}>
              {MONTHS[monthIdx]} {year}
            </div>
            <button
              onClick={() => setMonthIdx((i) => Math.min(11, i + 1))}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#8892a4", padding: "7px 12px", fontSize: 14,
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#e8eaf0"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8892a4"; }}
            >›</button>
          </div>

          {/* Period chips */}
          <div style={{
            display: "flex",
            gap: 3,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: 3,
          }}>
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: "5px 14px",
                  borderRadius: 7,
                  border: "none",
                  background: period === p ? "rgba(108,138,255,0.2)" : "transparent",
                  color: period === p ? "#6c8aff" : "#8892a4",
                  fontFamily: "Syne, sans-serif",
                  fontWeight: period === p ? 600 : 400,
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  borderBottom: period === p ? "1px solid rgba(108,138,255,0.4)" : "1px solid transparent",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI STRIP ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {kpiData.map((kpi, i) => (
          <div key={i} style={card({ padding: "14px 16px" })}>
            <div style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 10,
              color: "#8892a4",
              marginBottom: 8,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>
              {kpi.label}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 800,
                fontSize: 24,
                color: "#e8eaf0",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}>
                {kpi.value}
              </span>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>
                {kpi.unit}
              </span>
            </div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 7,
              padding: "3px 8px",
              borderRadius: 5,
              background: kpi.up ? "rgba(0,245,196,0.08)" : "rgba(255,100,100,0.08)",
              border: `1px solid ${kpi.up ? "rgba(0,245,196,0.18)" : "rgba(255,100,100,0.18)"}`,
            }}>
              <span style={{ fontSize: 10 }}>{kpi.up ? "▲" : "▼"}</span>
              <span style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 10,
                color: kpi.up ? "#00f5c4" : "#ff6464",
              }}>
                {kpi.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN CHARTS ROW ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>

        {/* Line Chart */}
        <div style={card({ padding: "20px" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>
                Загрузка пространства по часам
              </div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginTop: 3 }}>
                Сегодня · % от максималь��ой вместимости
              </div>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {[
                { label: "Open Space", color: "#00f5c4" },
                { label: "Переговорки", color: "#6c8aff" },
                { label: "Парковка", color: "#ff8a65" },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 20, height: 2, borderRadius: 1, background: l.color }} />
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Peak label */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
            <div style={{
              padding: "3px 10px",
              borderRadius: 5,
              background: "rgba(108,138,255,0.12)",
              border: "1px solid rgba(108,138,255,0.2)",
              fontFamily: "DM Mono, monospace",
              fontSize: 9,
              color: "#6c8aff",
              letterSpacing: "0.05em",
            }}>
              ⬆ ПИКОВЫЙ ЧАС 11:00–13:00
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hourlyData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="gradMint" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f5c4" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#00f5c4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradIndigo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6c8aff" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#6c8aff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCoral" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff8a65" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#ff8a65" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal={true}
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="0"
              />
              <ReferenceArea
                x1="11:00"
                x2="13:00"
                fill="rgba(108,138,255,0.07)"
                stroke="rgba(108,138,255,0.15)"
                strokeWidth={1}
              />
              <XAxis
                dataKey="hour"
                tick={{ fill: "#8892a4", fontSize: 10, fontFamily: "DM Mono, monospace" }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#8892a4", fontSize: 10, fontFamily: "DM Mono, monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip content={<CustomLineTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="openSpace"
                name="Open Space"
                stroke="#00f5c4"
                strokeWidth={2}
                fill="url(#gradMint)"
                dot={false}
                activeDot={{ r: 4, fill: "#00f5c4", stroke: "#080c14", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="meetings"
                name="Переговорки"
                stroke="#6c8aff"
                strokeWidth={2}
                fill="url(#gradIndigo)"
                dot={false}
                activeDot={{ r: 4, fill: "#6c8aff", stroke: "#080c14", strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="parking"
                name="Парковка"
                stroke="#ff8a65"
                strokeWidth={2}
                fill="url(#gradCoral)"
                dot={false}
                activeDot={{ r: 4, fill: "#ff8a65", stroke: "#080c14", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Insights */}
        <div style={card({ padding: "20px", display: "flex", flexDirection: "column" })}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: "#6c8aff" }}>◬</span>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>
              Dola говорит
            </div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#00f5c4", boxShadow: "0 0 6px #00f5c4" }} />
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#00f5c4" }}>AI LIVE</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            {aiInsights.map((ins, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "11px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderLeft: `3px solid ${ins.color}`,
                  transition: "background 0.15s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; }}
              >
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#c8cad4", lineHeight: 1.5 }}>
                  {ins.text}
                </span>
              </div>
            ))}
          </div>

          <button
            style={{
              marginTop: 14,
              padding: "9px 0",
              borderRadius: 9,
              border: "1px solid rgba(108,138,255,0.25)",
              background: "rgba(108,138,255,0.06)",
              cursor: "pointer",
              fontFamily: "Syne, sans-serif",
              fontWeight: 600,
              fontSize: 12,
              color: "#6c8aff",
              transition: "all 0.15s ease",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(108,138,255,0.12)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(108,138,255,0.45)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(108,138,255,0.06)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(108,138,255,0.25)";
            }}
          >
            Полный AI-отчёт →
          </button>
        </div>
      </div>

      {/* ── BOTTOM ROW ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

        {/* Heatmap */}
        <div style={card({ padding: "18px" })}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: "#e8eaf0", marginBottom: 14 }}>
            Использование по зонам
          </div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "36px repeat(7, 1fr)", gap: 3, marginBottom: 4 }}>
            <div />
            {days.map((d) => (
              <div key={d} style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", textAlign: "center" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {timeSlots.map((ts, ri) => (
            <div key={ts} style={{ display: "grid", gridTemplateColumns: "36px repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, color: "#8892a4", display: "flex", alignItems: "center" }}>
                {ts}
              </div>
              {heatmapData.map((dayData, ci) => {
                const val = dayData[ri];
                return (
                  <div
                    key={ci}
                    title={`${days[ci]} ${ts}: ${val}%`}
                    style={{
                      height: 22,
                      borderRadius: 4,
                      background: heatColor(val),
                      border: `1px solid ${heatBorder(val)}`,
                      transition: "transform 0.15s",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.08)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
                  />
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4" }}>Пусто</span>
            <div style={{ display: "flex", gap: 2, flex: 1 }}>
              {[3, 15, 30, 50, 68, 85, 100].map((v) => (
                <div key={v} style={{ flex: 1, height: 6, borderRadius: 2, background: heatColor(v) }} />
              ))}
            </div>
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#00f5c4" }}>Полностью</span>
          </div>
        </div>

        {/* Horizontal Bar Chart */}
        <div style={card({ padding: "18px" })}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: "#e8eaf0", marginBottom: 14 }}>
            Топ переговорок
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {roomsData.map((room, i) => {
              const isTop = i === 0;
              return (
                <div key={room.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      {isTop && (
                        <div style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: "#6c8aff",
                          boxShadow: "0 0 6px #6c8aff",
                        }} />
                      )}
                      <span style={{
                        fontFamily: "Syne, sans-serif",
                        fontSize: 12,
                        color: isTop ? "#e8eaf0" : "#8892a4",
                        fontWeight: isTop ? 600 : 400,
                      }}>
                        {room.name}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 11,
                      color: isTop ? "#6c8aff" : "#8892a4",
                    }}>
                      {room.value}%
                    </span>
                  </div>
                  <div style={{
                    height: 6,
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.05)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${room.value}%`,
                      borderRadius: 3,
                      background: isTop
                        ? "linear-gradient(90deg, #4a68ff, #6c8aff)"
                        : "rgba(108,138,255,0.3)",
                      boxShadow: isTop ? "0 0 8px rgba(108,138,255,0.5)" : "none",
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{
            marginTop: 14,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(108,138,255,0.06)",
            border: "1px solid rgba(108,138,255,0.12)",
            fontFamily: "DM Mono, monospace",
            fontSize: 10,
            color: "#8892a4",
          }}>
            Среднее по всем залам: <span style={{ color: "#6c8aff" }}>70%</span>
          </div>
        </div>

        {/* Donut Chart */}
        <div style={card({ padding: "18px", display: "flex", flexDirection: "column" })}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: "#e8eaf0", marginBottom: 14 }}>
            Доставки и роботы
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1 }}>
            {/* Donut */}
            <div style={{ flexShrink: 0 }}>
              <DonutChart />
            </div>
            {/* Legend */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              {deliveryData.map((d) => (
                <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: d.color,
                      boxShadow: `0 0 6px ${d.color}60`,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontFamily: "Syne, sans-serif", fontSize: 11, color: "#c8cad4" }}>{d.label}</span>
                  </div>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: d.color }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            marginTop: 12,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            fontFamily: "DM Mono, monospace",
            fontSize: 11,
            color: "#8892a4",
            letterSpacing: "0.03em",
          }}>
            Среднее ETA: <span style={{ color: "#e8eaf0" }}>8.4 мин</span>
          </div>
        </div>
      </div>

      {/* ── EXPORT BAR ────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 24,
      }}>
        <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8892a4", letterSpacing: "0.04em" }}>
          Экспорт данных:
        </span>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />
        {["PDF", "CSV", "Поделиться"].map((btn) => (
          <button
            key={btn}
            style={{
              padding: "5px 14px",
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.04)",
              cursor: "pointer",
              fontFamily: "Syne, sans-serif",
              fontWeight: 500,
              fontSize: 11,
              color: "#8892a4",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "rgba(255,255,255,0.08)";
              b.style.color = "#e8eaf0";
              b.style.borderColor = "rgba(255,255,255,0.15)";
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.background = "rgba(255,255,255,0.04)";
              b.style.color = "#8892a4";
              b.style.borderColor = "rgba(255,255,255,0.09)";
            }}
          >
            {btn}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", opacity: 0.5 }}>
          Данные обновляются каждые 60с
        </div>
      </div>
    </div>
  );
}
