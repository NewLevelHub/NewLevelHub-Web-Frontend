import React, { useState, useRef, useEffect } from "react";

const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  backdropFilter: "blur(12px)",
  ...extra,
});

interface Message {
  id: number;
  role: "ai" | "user";
  text: string;
  time: string;
}

const initialMessages: Message[] = [
  {
    id: 1,
    role: "ai",
    text: "Привет, Alexei! Я Dola — твой AI-ассистент в New Level Hub. Я могу помочь с бронированием, управлением встречами, отчётами и многим другим. Что тебе нужно сегодня?",
    time: "09:02",
  },
  {
    id: 2,
    role: "user",
    text: "Покажи мою загрузку встречами за эту неделю.",
    time: "09:04",
  },
  {
    id: 3,
    role: "ai",
    text: "Анализирую твой календарь... За эту неделю у тебя 14 встреч: 8 часов в переговорках, 2.5 часа 1:1, и 3.5 часа на ревью. Пиковый день — среда (5 встреч). Рекомендую забронировать «тихое время» в четверг с 14:00 до 16:00.",
    time: "09:04",
  },
  {
    id: 4,
    role: "user",
    text: "Отлично. Забронируй зал Орион на завтра в 11:00 на 2 часа.",
    time: "09:06",
  },
  {
    id: 5,
    role: "ai",
    text: "✓ Готово! Зал «Орион» (этаж 12, до 6 чел.) забронирован на завтра 28 марта, 11:00–13:00. Invite разослан участникам из твоего календаря. Хочешь заказать кофе к встрече через робота?",
    time: "09:06",
  },
];

const analyticsData = [
  { label: "Продуктивность", value: 87, color: "#00f5c4" },
  { label: "Посещаемость офиса", value: 73, color: "#6c8aff" },
  { label: "Использование залов", value: 68, color: "#6c8aff" },
  { label: "Время в встречах", value: 42, color: "#ff8a65" },
];

const meetings = [
  {
    id: "m1",
    title: "Ревью продукта Q2",
    time: "Сегодня · 11:00–12:30",
    attendees: 8,
    status: "active",
    summary: null,
  },
  {
    id: "m2",
    title: "Stand-up команды",
    time: "Сегодня · 09:00–09:30",
    attendees: 6,
    status: "done",
    summary: "3 решения, 5 задач создано в Linear",
  },
  {
    id: "m3",
    title: "1:1 с командой дизайна",
    time: "Сегодня · 15:30–16:00",
    attendees: 2,
    status: "upcoming",
    summary: null,
  },
  {
    id: "m4",
    title: "Quarterly OKR Review",
    time: "Сегодня · 17:00–18:00",
    attendees: 12,
    status: "upcoming",
    summary: null,
  },
];

const statusConfig = {
  active: { label: "СЕЙЧАС", color: "#00f5c4", bg: "rgba(0,245,196,0.12)" },
  done: { label: "ЗАВЕРШЕНО", color: "#8892a4", bg: "rgba(255,255,255,0.06)" },
  upcoming: { label: "СКОРО", color: "#6c8aff", bg: "rgba(108,138,255,0.12)" },
};

const suggestedQueries = [
  "Забронируй зал на завтра",
  "Вызови робота с кофе",
  "Что в расписании на 15:00?",
  "Сводка по встречам",
];

export function DolaAI() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      text,
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));

    const responses = [
      "Понял! Обрабатываю запрос... Готово ✓",
      "Анализирую данные по вашему запросу. Результат: всё в порядке, задача выполнена.",
      "Отличный вопрос. На основе данных платформы: текущая загрузка оптимальна. Рекомендую продолжать в том же темпе.",
      "Запрос принят. Выполнено за 0.3с. Нужно что-то ещё?",
    ];

    const aiMsg: Message = {
      id: Date.now() + 1,
      role: "ai",
      text: responses[Math.floor(Math.random() * responses.length)],
      time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };
    setIsTyping(false);
    setMessages((prev) => [...prev, aiMsg]);
  };

  return (
    <div style={{ padding: "28px 32px", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, height: "calc(100vh - 120px)", maxHeight: 720 }}>
      {/* Chat */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0, ...cardStyle() }}>
        {/* Chat Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #6c8aff 0%, #00f5c4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Syne, sans-serif",
            fontWeight: 800,
            fontSize: 16,
            color: "#080c14",
            flexShrink: 0,
            boxShadow: "0 0 16px rgba(108,138,255,0.3)",
          }}>
            D
          </div>
          <div>
            <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 14, color: "#e8eaf0" }}>
              Dola
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00f5c4", boxShadow: "0 0 6px #00f5c4" }} />
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#00f5c4" }}>AI ONLINE</span>
            </div>
          </div>
          <div style={{ marginLeft: "auto", fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4" }}>
            GPT-4o · Hub Context
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                flexShrink: 0,
                background: msg.role === "ai"
                  ? "linear-gradient(135deg, #6c8aff, #00f5c4)"
                  : "linear-gradient(135deg, #6c8aff, #00f5c4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 11,
                color: "#080c14",
              }}>
                {msg.role === "ai" ? "D" : "A"}
              </div>

              <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", gap: 4, alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  padding: "10px 14px",
                  borderRadius: msg.role === "ai" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                  background: msg.role === "ai"
                    ? "rgba(108,138,255,0.1)"
                    : "rgba(0,245,196,0.08)",
                  border: msg.role === "ai"
                    ? "1px solid rgba(108,138,255,0.18)"
                    : "1px solid rgba(0,245,196,0.18)",
                  fontFamily: "Syne, sans-serif",
                  fontSize: 13,
                  color: "#e8eaf0",
                  lineHeight: 1.55,
                }}>
                  {msg.text}
                </div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4" }}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "linear-gradient(135deg, #6c8aff, #00f5c4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 11, color: "#080c14",
                flexShrink: 0,
              }}>D</div>
              <div style={{
                padding: "10px 16px",
                borderRadius: "4px 12px 12px 12px",
                background: "rgba(108,138,255,0.1)",
                border: "1px solid rgba(108,138,255,0.18)",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: "#6c8aff",
                      animation: `pulse 1.2s ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggestions */}
        <div style={{
          padding: "8px 16px",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}>
          {suggestedQueries.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid rgba(108,138,255,0.2)",
                background: "rgba(108,138,255,0.06)",
                fontFamily: "DM Mono, monospace",
                fontSize: 10,
                color: "#6c8aff",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(108,138,255,0.12)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(108,138,255,0.06)"; }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          gap: 10,
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Спроси Dola что угодно..."
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#e8eaf0",
              fontFamily: "Syne, sans-serif",
              fontSize: 13,
              outline: "none",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: input.trim() ? "linear-gradient(135deg, #00f5c4, #6c8aff)" : "rgba(255,255,255,0.06)",
              border: "none",
              cursor: input.trim() ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>
        {/* Analytics */}
        <div style={cardStyle({ padding: "20px" })}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            AI Аналитика · Эта неделя
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {analyticsData.map((item) => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, color: "#e8eaf0" }}>{item.label}</span>
                  <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: item.color }}>{item.value}%</span>
                </div>
                <div style={{
                  height: 5,
                  borderRadius: 3,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${item.value}%`,
                    borderRadius: 3,
                    background: `linear-gradient(90deg, ${item.color}99, ${item.color})`,
                    boxShadow: `0 0 8px ${item.color}40`,
                    transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Notetaker */}
        <div style={{ ...cardStyle({ padding: "20px" }), flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 13, color: "#8892a4", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
            AI Notetaker
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1 }}>
            {meetings.map((m) => {
              const sc = statusConfig[m.status as keyof typeof statusConfig];
              return (
                <div
                  key={m.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: m.status === "active" ? "rgba(0,245,196,0.05)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${m.status === "active" ? "rgba(0,245,196,0.2)" : "rgba(255,255,255,0.06)"}`,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 600, fontSize: 13, color: "#e8eaf0", flex: 1, marginRight: 8 }}>
                      {m.title}
                    </div>
                    <div style={{
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: sc.bg,
                      fontFamily: "DM Mono, monospace",
                      fontSize: 9,
                      color: sc.color,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}>
                      {sc.label}
                    </div>
                  </div>
                  <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginBottom: m.summary ? 6 : 0 }}>
                    {m.time} · {m.attendees} участников
                  </div>
                  {m.summary && (
                    <div style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "rgba(0,245,196,0.07)",
                      border: "1px solid rgba(0,245,196,0.12)",
                      fontFamily: "DM Mono, monospace",
                      fontSize: 10,
                      color: "#00f5c4",
                    }}>
                      📝 {m.summary}
                    </div>
                  )}
                  {m.status === "upcoming" && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      marginTop: 4,
                      fontFamily: "DM Mono, monospace",
                      fontSize: 10,
                      color: "#8892a4",
                    }}>
                      <span style={{ color: "#6c8aff" }}>◈</span> Dola подключится автоматически
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
