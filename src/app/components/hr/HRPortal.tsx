import React, { useState } from "react";

const card = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  backdropFilter: "blur(12px)",
  ...extra,
});

// ─── DATA ────────────────────────────────────────────────────────────────────

const employees = [
  { id: "e1",  name: "Alexei Kovalev",    role: "Head of Product",    dept: "Product",    status: "online",  floor: 12, avatar: "AK", attendance: 92 },
  { id: "e2",  name: "Marina Sokolova",   role: "Lead Designer",      dept: "Design",     status: "online",  floor: 12, avatar: "MS", attendance: 88 },
  { id: "e3",  name: "Dmitry Volkov",     role: "Backend Engineer",   dept: "Engineering",status: "remote",  floor: null, avatar: "DV", attendance: 95 },
  { id: "e4",  name: "Anna Petrova",      role: "Product Manager",    dept: "Product",    status: "online",  floor: 11, avatar: "AP", attendance: 78 },
  { id: "e5",  name: "Ivan Sorokin",      role: "Frontend Engineer",  dept: "Engineering",status: "away",    floor: 12, avatar: "IS", attendance: 84 },
  { id: "e6",  name: "Elena Kuznetsova",  role: "HR Manager",         dept: "HR",         status: "online",  floor: 9,  avatar: "EK", attendance: 97 },
  { id: "e7",  name: "Pavel Nikitin",     role: "Data Analyst",       dept: "Analytics",  status: "offline", floor: null, avatar: "PN", attendance: 71 },
  { id: "e8",  name: "Sofia Romanova",    role: "DevOps Engineer",    dept: "Engineering",status: "remote",  floor: null, avatar: "SR", attendance: 90 },
  { id: "e9",  name: "Andrei Morozov",    role: "Sales Lead",         dept: "Sales",      status: "online",  floor: 10, avatar: "AM", attendance: 86 },
];

const statusConfig = {
  online:  { color: "#00f5c4", label: "В офисе" },
  remote:  { color: "#6c8aff", label: "Удалённо" },
  away:    { color: "#ffd700", label: "Отошёл" },
  offline: { color: "#8892a4", label: "Не в сети" },
};

const depts = ["Все", "Product", "Design", "Engineering", "HR", "Analytics", "Sales"];

const tasks = [
  { id: "t1", title: "Провести onboarding для 2 новых сотрудников", assignee: "EK", due: "28 мар", priority: "high",   done: false },
  { id: "t2", title: "Обновить политику удалённой работы",          assignee: "EK", due: "31 мар", priority: "medium", done: false },
  { id: "t3", title: "Q1 Performance Review — сбор данных",         assignee: "AK", due: "01 апр", priority: "high",   done: false },
  { id: "t4", title: "Оформить больничный Соколовой",               assignee: "EK", due: "27 мар", priority: "low",    done: true  },
  { id: "t5", title: "Заказать пропуска для новых сотрудников",     assignee: "EK", due: "28 мар", priority: "medium", done: true  },
];

const attendanceWeek = [
  { day: "Пн", total: 247, inOffice: 162, remote: 52, absent: 33 },
  { day: "Вт", total: 247, inOffice: 178, remote: 48, absent: 21 },
  { day: "Ср", total: 247, inOffice: 171, remote: 44, absent: 32 },
  { day: "Чт", total: 247, inOffice: 165, remote: 55, absent: 27 },
  { day: "Пт", total: 247, inOffice: 140, remote: 70, absent: 37 },
];

const deptStats = [
  { dept: "Engineering", count: 42, present: 38, color: "#6c8aff" },
  { dept: "Product",     count: 18, present: 15, color: "#00f5c4" },
  { dept: "Design",      count: 12, present: 11, color: "#ff8a65" },
  { dept: "Sales",       count: 24, present: 20, color: "#a78bfa" },
  { dept: "HR",          count: 8,  present: 8,  color: "#ffd700" },
  { dept: "Analytics",   count: 10, present: 7,  color: "#6c8aff" },
];

const priorityConfig = {
  high:   { color: "#ff8a65", label: "Высокий", bg: "rgba(255,138,101,0.1)" },
  medium: { color: "#6c8aff", label: "Средний", bg: "rgba(108,138,255,0.1)" },
  low:    { color: "#8892a4", label: "Низкий",  bg: "rgba(255,255,255,0.06)" },
};

// ─── AVATAR ─────────────────────────────────────────────────────────────────

function Avatar({ initials, size = 36, color = "#6c8aff" }: { initials: string; size?: number; color?: string }) {
  const colors: Record<string, string> = {
    AK: "#6c8aff", MS: "#ff8a65", DV: "#00f5c4", AP: "#a78bfa",
    IS: "#ffd700", EK: "#00f5c4", PN: "#8892a4", SR: "#6c8aff", AM: "#ff8a65",
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${colors[initials] || color}88, ${colors[initials] || color})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "Syne, sans-serif", fontWeight: 700,
      fontSize: size * 0.33, color: "#080c14", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function HRPortal() {
  const [selectedDept, setSelectedDept] = useState("Все");
  const [search, setSearch] = useState("");
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set(tasks.filter(t => t.done).map(t => t.id)));
  const [selectedEmployee, setSelectedEmployee] = useState<typeof employees[0] | null>(null);

  const filtered = employees.filter(e =>
    (selectedDept === "Все" || e.dept === selectedDept) &&
    (search === "" || e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase()))
  );

  const onlineCount = employees.filter(e => e.status === "online").length;
  const remoteCount = employees.filter(e => e.status === "remote").length;

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
            HR Портал
          </h1>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginTop: 3 }}>
            {employees.length} сотрудников · {onlineCount} в офисе · {remoteCount} удалённо
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "В офисе", value: onlineCount, color: "#00f5c4" },
            { label: "Удалённо", value: remoteCount, color: "#6c8aff" },
            { label: "Не в сети", value: employees.filter(e => e.status === "offline").length, color: "#8892a4" },
          ].map(s => (
            <div key={s.label} style={{ padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 20, color: s.color }}>{s.value}</div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 14 }}>

        {/* Employee list */}
        <div style={card({ padding: "16px", display: "flex", flexDirection: "column", gap: 12 })}>
          {/* Search + filter */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              placeholder="Поиск сотрудника..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8,
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#e8eaf0", fontFamily: "Syne, sans-serif", fontSize: 12, outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {depts.map(d => (
              <button
                key={d}
                onClick={() => setSelectedDept(d)}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: "none",
                  background: selectedDept === d ? "rgba(108,138,255,0.2)" : "rgba(255,255,255,0.05)",
                  color: selectedDept === d ? "#6c8aff" : "#8892a4",
                  fontFamily: "DM Mono, monospace", fontSize: 10, cursor: "pointer",
                  transition: "all 0.15s",
                  border: `1px solid ${selectedDept === d ? "rgba(108,138,255,0.35)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Employee rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 340, overflowY: "auto" }}>
            {filtered.map(emp => {
              const sc = statusConfig[emp.status as keyof typeof statusConfig];
              const isSelected = selectedEmployee?.id === emp.id;
              return (
                <div
                  key={emp.id}
                  onClick={() => setSelectedEmployee(isSelected ? null : emp)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                    borderRadius: 10,
                    background: isSelected ? "rgba(108,138,255,0.07)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isSelected ? "rgba(108,138,255,0.25)" : "rgba(255,255,255,0.05)"}`,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <Avatar initials={emp.avatar} size={34} />
                    <div style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: sc.color, border: "2px solid rgba(8,12,20,0.9)", boxShadow: `0 0 5px ${sc.color}` }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 13, color: "#e8eaf0" }}>{emp.name}</div>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>{emp.role} · {emp.dept}</div>
                  </div>
                  <div style={{ display: "flex", flex: "column", alignItems: "flex-end", gap: 4, textAlign: "right" }}>
                    <div style={{ padding: "2px 8px", borderRadius: 5, background: `${sc.color}15`, border: `1px solid ${sc.color}30`, fontFamily: "DM Mono, monospace", fontSize: 9, color: sc.color }}>
                      {sc.label}
                    </div>
                    {emp.floor && (
                      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", marginTop: 3 }}>
                        Этаж {emp.floor}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: emp.attendance > 90 ? "#00f5c4" : emp.attendance > 80 ? "#6c8aff" : "#ff8a65" }}>
                      {emp.attendance}%
                    </div>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 8, color: "#8892a4" }}>явка</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected employee card */}
          {selectedEmployee && (
            <div style={{
              padding: "14px", borderRadius: 12,
              background: "rgba(108,138,255,0.07)",
              border: "1px solid rgba(108,138,255,0.2)",
            }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                <Avatar initials={selectedEmployee.avatar} size={44} />
                <div>
                  <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 15, color: "#e8eaf0" }}>{selectedEmployee.name}</div>
                  <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>{selectedEmployee.role} · {selectedEmployee.dept}</div>
                </div>
                <button onClick={() => setSelectedEmployee(null)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#8892a4", cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { label: "Явка", value: `${selectedEmployee.attendance}%`, color: "#00f5c4" },
                  { label: "Статус", value: statusConfig[selectedEmployee.status as keyof typeof statusConfig].label, color: statusConfig[selectedEmployee.status as keyof typeof statusConfig].color },
                  { label: "Этаж", value: selectedEmployee.floor ? `${selectedEmployee.floor} эт.` : "—", color: "#6c8aff" },
                ].map(i => (
                  <div key={i.label} style={{ padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", textAlign: "center" }}>
                    <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: i.color }}>{i.value}</div>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", marginTop: 2 }}>{i.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Dept breakdown */}
          <div style={card({ padding: "16px" })}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              По отделам
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deptStats.map(d => (
                <div key={d.dept}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#e8eaf0" }}>{d.dept}</span>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: d.color }}>{d.present}/{d.count}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(d.present / d.count) * 100}%`, background: d.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance chart */}
          <div style={card({ padding: "16px" })}>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 12, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
              Явка · Эта неделя
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
              {attendanceWeek.map((d, i) => {
                const h = 56;
                const officePct = d.inOffice / d.total;
                const remotePct = d.remote / d.total;
                const isToday = i === 3;
                return (
                  <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ width: "100%", height: h, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 1, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: "100%", height: `${remotePct * h}px`, background: isToday ? "#6c8aff" : "rgba(108,138,255,0.4)", transition: "height 0.5s" }} />
                      <div style={{ width: "100%", height: `${officePct * h}px`, background: isToday ? "#00f5c4" : "rgba(0,245,196,0.4)", transition: "height 0.5s" }} />
                    </div>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: isToday ? "#e8eaf0" : "#8892a4" }}>{d.day}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {[{ label: "В офисе", color: "#00f5c4" }, { label: "Удалённо", color: "#6c8aff" }].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div style={card({ padding: "16px", marginBottom: 24 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#e8eaf0" }}>
            HR Задачи
          </div>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>
            {tasks.filter(t => !doneTasks.has(t.id)).length} открытых · {tasks.filter(t => doneTasks.has(t.id)).length} завершено
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {tasks.map(t => {
            const isDone = doneTasks.has(t.id);
            const pc = priorityConfig[t.priority as keyof typeof priorityConfig];
            return (
              <div
                key={t.id}
                style={{
                  display: "flex", gap: 10, padding: "10px 12px", borderRadius: 10,
                  background: isDone ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isDone ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)"}`,
                  opacity: isDone ? 0.5 : 1, transition: "all 0.2s",
                }}
              >
                <div
                  onClick={() => setDoneTasks(prev => { const n = new Set(prev); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })}
                  style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: "pointer", marginTop: 2,
                    background: isDone ? "#00f5c4" : "rgba(255,255,255,0.08)",
                    border: `1px solid ${isDone ? "#00f5c4" : "rgba(255,255,255,0.15)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "#080c14",
                  }}
                >
                  {isDone && "✓"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#e8eaf0", textDecoration: isDone ? "line-through" : "none", marginBottom: 4 }}>
                    {t.title}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ padding: "1px 7px", borderRadius: 4, background: pc.bg, fontFamily: "DM Mono, monospace", fontSize: 9, color: pc.color }}>
                      {pc.label}
                    </div>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4" }}>до {t.due}</span>
                    <Avatar initials={t.assignee} size={16} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
