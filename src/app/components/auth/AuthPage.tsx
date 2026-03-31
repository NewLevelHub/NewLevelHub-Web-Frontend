import React, { useMemo, useState } from "react";
import type { LoginInput, RegisterInput, UserRoleDefinition } from "../../lib/api";

const FALLBACK_ROLES: UserRoleDefinition[] = [
  { code: "supermentor", label: "Supermentor", description: "Полный доступ ко всему" },
  { code: "admin", label: "Administrator", description: "Администратор бизнес-центра" },
  { code: "tenant", label: "Tenant", description: "Арендатор офиса" },
  { code: "employee", label: "Employee", description: "Рядовой сотрудник" },
  { code: "guest", label: "Guest", description: "Гость (временный доступ)" },
];

const DEPARTMENTS = ["Product", "Engineering", "Design", "Marketing", "HR", "Sales", "Analytics", "Operations"];

interface AuthPageProps {
  roles: UserRoleDefinition[];
  isBusy: boolean;
  error: string | null;
  onLogin: (payload: LoginInput) => Promise<void>;
  onRegister: (payload: RegisterInput) => Promise<void>;
}

export function AuthPage({ roles, isBusy, error, onLogin, onRegister }: AuthPageProps) {
  const availableRoles = roles.length > 0 ? roles : FALLBACK_ROLES;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [registerFocusedField, setRegisterFocusedField] = useState<string | null>(null);
  const [registerShowPass, setRegisterShowPass] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [floor, setFloor] = useState("");
  const registerRole = "employee";

  const submitDisabled = useMemo(() => !email || !password || isBusy, [email, password, isBusy]);
  const canProceedStep1 = !!(firstName && lastName && email);
  const canProceedStep2 = !!(company && department);
  const canProceedStep3 = !!(password && passwordConfirm && password === passwordConfirm && agreed);

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onLogin({ email, password });
  };

  const handleRegisterSubmit = async () => {
    await onRegister({
      email,
      password,
      password_confirm: passwordConfirm,
      first_name: firstName,
      last_name: lastName,
      phone,
      role: registerRole,
    });
  };

  const handleRegisterNext = async (event: React.FormEvent) => {
    event.preventDefault();
    if (registerStep < 3) {
      setRegisterStep((current) => current + 1);
      return;
    }
    await handleRegisterSubmit();
  };

  if (mode === "register") {
    const stepLabels = ["Личные данные", "Рабочие данные", "Безопасность"];

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#080c14",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Syne, sans-serif",
          padding: 24,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(180deg, transparent 0px, transparent 59px, rgba(255,255,255,0.02) 59px, rgba(255,255,255,0.02) 60px), repeating-linear-gradient(90deg, transparent 0px, transparent 59px, rgba(255,255,255,0.015) 59px, rgba(255,255,255,0.015) 60px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "15%",
            width: 500,
            height: 400,
            background: "radial-gradient(ellipse, rgba(0,245,196,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            left: "10%",
            width: 400,
            height: 350,
            background: "radial-gradient(ellipse, rgba(108,138,255,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", gap: 0, width: 860, position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: 280,
              flexShrink: 0,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRight: "none",
              borderRadius: "20px 0 0 20px",
              padding: "40px 32px",
              display: "flex",
              flexDirection: "column",
              backdropFilter: "blur(24px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #00f5c4, #6c8aff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 18,
                  color: "#080c14",
                }}
              >
                N
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#e8eaf0" }}>New Level Hub</div>
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 10,
                  color: "#8892a4",
                  letterSpacing: "0.08em",
                  marginBottom: 20,
                }}
              >
                РЕГИСТРАЦИЯ - ШАГ {registerStep}/3
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {stepLabels.map((label, index) => {
                  const step = index + 1;
                  const done = step < registerStep;
                  const active = step === registerStep;
                  return (
                    <div key={step} style={{ display: "flex", gap: 14, paddingBottom: step < 3 ? 24 : 0, position: "relative" }}>
                      {step < 3 && (
                        <div
                          style={{
                            position: "absolute",
                            left: 14,
                            top: 28,
                            bottom: 0,
                            width: 1,
                            background: done ? "#00f5c4" : "rgba(255,255,255,0.08)",
                          }}
                        />
                      )}
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          flexShrink: 0,
                          background: done ? "#00f5c4" : active ? "rgba(108,138,255,0.2)" : "rgba(255,255,255,0.06)",
                          border: `1.5px solid ${done ? "#00f5c4" : active ? "#6c8aff" : "rgba(255,255,255,0.1)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "DM Mono, monospace",
                          fontSize: 11,
                          color: done ? "#080c14" : active ? "#6c8aff" : "#8892a4",
                          fontWeight: 700,
                          zIndex: 1,
                        }}
                      >
                        {done ? "V" : step}
                      </div>
                      <div style={{ paddingTop: 4 }}>
                        <div
                          style={{
                            fontFamily: "Syne, sans-serif",
                            fontWeight: active ? 600 : 400,
                            fontSize: 13,
                            color: active ? "#e8eaf0" : done ? "#00f5c4" : "#8892a4",
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", marginTop: 2 }}>
                          {step === 1
                            ? "Имя, email, телефон"
                            : step === 2
                              ? "Компания, отдел, роль"
                              : "Пароль и подтверждение"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "0 20px 20px 0",
              padding: "40px 40px 36px",
              backdropFilter: "blur(24px)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "5%",
                right: "5%",
                height: 1,
                background: "linear-gradient(90deg, transparent, rgba(0,245,196,0.5), rgba(108,138,255,0.4), transparent)",
              }}
            />
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontWeight: 800, fontSize: 24, color: "#e8eaf0", margin: "0 0 6px", letterSpacing: "-0.04em" }}>
                {registerStep === 1 ? "Личные данные" : registerStep === 2 ? "Рабочая информация" : "Защита аккаунта"}
              </h2>
              <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8892a4", margin: 0 }}>
                {registerStep === 1
                  ? "Как к вам обращаться в системе"
                  : registerStep === 2
                    ? "Ваше место в организации"
                    : "Создайте надежный пароль"}
              </p>
            </div>

            <form onSubmit={handleRegisterNext} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {registerStep === 1 && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <FieldLabel>Имя</FieldLabel>
                      <input
                        placeholder="Alexei"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        onFocus={() => setRegisterFocusedField("firstName")}
                        onBlur={() => setRegisterFocusedField(null)}
                        style={registerInputStyle(registerFocusedField === "firstName")}
                      />
                    </div>
                    <div>
                      <FieldLabel>Фамилия</FieldLabel>
                      <input
                        placeholder="Kovalev"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        onFocus={() => setRegisterFocusedField("lastName")}
                        onBlur={() => setRegisterFocusedField(null)}
                        style={registerInputStyle(registerFocusedField === "lastName")}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Корпоративный Email</FieldLabel>
                    <input
                      type="email"
                      placeholder="alex@company.ru"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setRegisterFocusedField("email")}
                      onBlur={() => setRegisterFocusedField(null)}
                      style={registerInputStyle(registerFocusedField === "email")}
                    />
                  </div>
                  <div>
                    <FieldLabel>Телефон</FieldLabel>
                    <input
                      placeholder="+7 (999) 000-00-00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onFocus={() => setRegisterFocusedField("phone")}
                      onBlur={() => setRegisterFocusedField(null)}
                      style={registerInputStyle(registerFocusedField === "phone")}
                    />
                  </div>
                </>
              )}

              {registerStep === 2 && (
                <>
                  <div>
                    <FieldLabel>Компания / Организация</FieldLabel>
                    <input
                      placeholder="New Level Corp."
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      onFocus={() => setRegisterFocusedField("company")}
                      onBlur={() => setRegisterFocusedField(null)}
                      style={registerInputStyle(registerFocusedField === "company")}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <FieldLabel>Отдел</FieldLabel>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        onFocus={() => setRegisterFocusedField("department")}
                        onBlur={() => setRegisterFocusedField(null)}
                        style={{ ...registerInputStyle(registerFocusedField === "department"), appearance: "none", cursor: "pointer" }}
                      >
                        <option value="">Выберите отдел</option>
                        {DEPARTMENTS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Роль в системе</FieldLabel>
                      <input value="employee" readOnly style={registerInputStyle(false)} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Предпочтительный этаж</FieldLabel>
                    <input
                      placeholder="12"
                      value={floor}
                      onChange={(e) => setFloor(e.target.value)}
                      onFocus={() => setRegisterFocusedField("floor")}
                      onBlur={() => setRegisterFocusedField(null)}
                      style={registerInputStyle(registerFocusedField === "floor")}
                    />
                  </div>
                </>
              )}

              {registerStep === 3 && (
                <>
                  <div>
                    <FieldLabel>Пароль</FieldLabel>
                    <div style={{ position: "relative" }}>
                      <input
                        type={registerShowPass ? "text" : "password"}
                        placeholder="Не менее 8 символов"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setRegisterFocusedField("password")}
                        onBlur={() => setRegisterFocusedField(null)}
                        style={{ ...registerInputStyle(registerFocusedField === "password"), paddingRight: 52 }}
                      />
                      <button
                        type="button"
                        onClick={() => setRegisterShowPass((value) => !value)}
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 12,
                          color: "#8892a4",
                        }}
                      >
                        {registerShowPass ? "Hide" : "Show"}
                      </button>
                    </div>
                    <PasswordStrength password={password} />
                  </div>
                  <div>
                    <FieldLabel>Подтверждение пароля</FieldLabel>
                    <input
                      type="password"
                      placeholder="Повторите пароль"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      onFocus={() => setRegisterFocusedField("passwordConfirm")}
                      onBlur={() => setRegisterFocusedField(null)}
                      style={registerInputStyle(
                        registerFocusedField === "passwordConfirm",
                        !!(passwordConfirm && passwordConfirm !== password),
                      )}
                    />
                    {passwordConfirm && passwordConfirm !== password && (
                      <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#ff6464", marginTop: 5 }}>
                        Пароли не совпадают
                      </div>
                    )}
                  </div>
                  <div
                    onClick={() => setAgreed((value) => !value)}
                    style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        flexShrink: 0,
                        marginTop: 1,
                        background: agreed ? "#00f5c4" : "rgba(255,255,255,0.06)",
                        border: `1.5px solid ${agreed ? "#00f5c4" : "rgba(255,255,255,0.15)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        color: "#080c14",
                        transition: "all 0.15s",
                      }}
                    >
                      {agreed ? "V" : ""}
                    </div>
                    <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", lineHeight: 1.5 }}>
                      Я согласен с Условиями использования и Политикой конфиденциальности New Level Hub
                    </span>
                  </div>
                </>
              )}

              {error && <div style={{ color: "#ff8a65", fontSize: 12 }}>{error}</div>}
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                {registerStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setRegisterStep((current) => current - 1)}
                    style={{
                      padding: "12px 20px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      cursor: "pointer",
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "#8892a4",
                    }}
                  >
                    Назад
                  </button>
                )}
                <button
                  type="submit"
                  disabled={
                    isBusy ||
                    (registerStep === 1 && !canProceedStep1) ||
                    (registerStep === 2 && !canProceedStep2) ||
                    (registerStep === 3 && !canProceedStep3)
                  }
                  style={{
                    flex: 1,
                    padding: "13px",
                    borderRadius: 10,
                    border: "none",
                    background: isBusy ? "rgba(108,138,255,0.3)" : "linear-gradient(135deg, #6c8aff, #00f5c4)",
                    cursor: isBusy ? "not-allowed" : "pointer",
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#080c14",
                    opacity:
                      (registerStep === 1 && !canProceedStep1) ||
                      (registerStep === 2 && !canProceedStep2) ||
                      (registerStep === 3 && !canProceedStep3)
                        ? 0.45
                        : 1,
                  }}
                >
                  {isBusy ? "Создание аккаунта..." : registerStep < 3 ? "Далее ->" : "Создать аккаунт ->"}
                </button>
              </div>
            </form>

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8892a4" }}>Уже есть аккаунт? </span>
              <button
                onClick={() => setMode("login")}
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "DM Mono, monospace",
                  fontSize: 11,
                  color: "#6c8aff",
                  padding: 0,
                }}
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080c14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Syne, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(180deg, transparent 0px, transparent 59px, rgba(255,255,255,0.02) 59px, rgba(255,255,255,0.02) 60px), repeating-linear-gradient(90deg, transparent 0px, transparent 59px, rgba(255,255,255,0.015) 59px, rgba(255,255,255,0.015) 60px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "20%",
          width: 500,
          height: 400,
          background: "radial-gradient(ellipse, rgba(108,138,255,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "15%",
          width: 400,
          height: 350,
          background: "radial-gradient(ellipse, rgba(0,245,196,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: 440,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 20,
          backdropFilter: "blur(24px)",
          padding: "40px 40px 36px",
          position: "relative",
          zIndex: 1,
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "10%",
            right: "10%",
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(108,138,255,0.6), rgba(0,245,196,0.4), transparent)",
            borderRadius: "0 0 4px 4px",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #00f5c4 0%, #6c8aff 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 20,
              color: "#080c14",
              boxShadow: "0 0 20px rgba(0,245,196,0.3)",
            }}
          >
            N
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#e8eaf0", letterSpacing: "-0.02em" }}>New Level Hub</div>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#8892a4", letterSpacing: "0.08em" }}>
              OS v2.4 - SECURE ACCESS
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontWeight: 800, fontSize: 26, color: "#e8eaf0", margin: "0 0 6px", letterSpacing: "-0.04em" }}>
            Добро пожаловать
          </h1>
          <p style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8892a4", margin: 0 }}>
            Войдите в свою рабочую среду
          </p>
        </div>
        <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "DM Mono, monospace",
                fontSize: 10,
                color: "#8892a4",
                marginBottom: 7,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Корпоративный Email
            </label>
            <input
              type="email"
              placeholder="alex@newlevel.hub"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
              style={inputStyle(focusedField === "email")}
            />
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <label
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 10,
                  color: "#8892a4",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Пароль
              </label>
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "DM Mono, monospace",
                  fontSize: 10,
                  color: "#6c8aff",
                  padding: 0,
                }}
              >
                Забыли пароль?
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                placeholder="............."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle(focusedField === "password"), paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass((value) => !value)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#8892a4",
                  fontSize: 14,
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          {error && (
            <div
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                background: "rgba(255,100,100,0.08)",
                border: "1px solid rgba(255,100,100,0.2)",
                fontFamily: "DM Mono, monospace",
                fontSize: 11,
                color: "#ff6464",
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitDisabled}
            style={{
              marginTop: 4,
              padding: "13px",
              borderRadius: 11,
              border: "none",
              background: isBusy ? "rgba(108,138,255,0.3)" : "linear-gradient(135deg, #6c8aff 0%, #00f5c4 100%)",
              cursor: isBusy ? "not-allowed" : "pointer",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: isBusy ? "#8892a4" : "#080c14",
              transition: "all 0.2s ease",
              letterSpacing: "0.01em",
              boxShadow: isBusy ? "none" : "0 4px 20px rgba(108,138,255,0.3)",
            }}
          >
            {isBusy ? "Проверка доступа..." : "Войти в Hub ->"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8892a4" }}>Нет аккаунта? </span>
          <button
            type="button"
            onClick={() => setMode("register")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "DM Mono, monospace",
              fontSize: 11,
              color: "#6c8aff",
              padding: 0,
            }}
          >
            Запросить доступ
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 20,
            padding: "8px 14px",
            borderRadius: 8,
            background: "rgba(0,245,196,0.04)",
            border: "1px solid rgba(0,245,196,0.1)",
          }}
        >
          <span style={{ fontSize: 11 }}>Lock</span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: "#8892a4", letterSpacing: "0.04em" }}>
            256-bit TLS - SOC 2 Type II - ISO 27001
          </span>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(136,146,164,0.5); }
      `}</style>
    </div>
  );
}

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 10,
    background: focused ? "rgba(108,138,255,0.07)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${focused ? "rgba(108,138,255,0.45)" : "rgba(255,255,255,0.1)"}`,
    color: "#e8eaf0",
    fontFamily: "Syne, sans-serif",
    fontSize: 14,
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    boxShadow: focused ? "0 0 0 3px rgba(108,138,255,0.08)" : "none",
  };
}

function registerInputStyle(focused: boolean, hasError?: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    background: hasError
      ? "rgba(255,100,100,0.05)"
      : focused
        ? "rgba(108,138,255,0.07)"
        : "rgba(255,255,255,0.05)",
    border: `1px solid ${
      hasError ? "rgba(255,100,100,0.4)" : focused ? "rgba(108,138,255,0.45)" : "rgba(255,255,255,0.1)"
    }`,
    color: "#e8eaf0",
    fontFamily: "Syne, sans-serif",
    fontSize: 13,
    outline: "none",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    boxShadow: focused ? "0 0 0 3px rgba(108,138,255,0.08)" : "none",
  };
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ символов", ok: password.length >= 8 },
    { label: "Заглавная буква", ok: /[A-ZА-Я]/.test(password) },
    { label: "Цифра", ok: /\d/.test(password) },
    { label: "Спецсимвол", ok: /[!@#$%^&*]/.test(password) },
  ];
  const score = checks.filter((item) => item.ok).length;
  const colors = ["#ff6464", "#ff8a65", "#ffd700", "#00f5c4"];
  const labels = ["Слабый", "Слабый", "Средний", "Надежный"];

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: index < score ? colors[score - 1] : "rgba(255,255,255,0.08)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {checks.map((item) => (
            <span
              key={item.label}
              style={{ fontFamily: "DM Mono, monospace", fontSize: 9, color: item.ok ? "#00f5c4" : "#8892a4" }}
            >
              {item.ok ? "V" : "o"} {item.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: colors[score - 1] }}>
            {labels[score - 1]}
          </span>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontFamily: "DM Mono, monospace",
        fontSize: 10,
        color: "#8892a4",
        marginBottom: 6,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </label>
  );
}
