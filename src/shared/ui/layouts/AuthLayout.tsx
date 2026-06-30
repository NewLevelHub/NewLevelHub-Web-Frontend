import { useEffect } from 'react';
import { Link, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';

const C = {
  bg: '#051a0d',
  brand: '#059669',
  brandL: '#34d399',
  border: 'rgba(5,150,105,0.18)',
  borderMd: 'rgba(5,150,105,0.35)',
  text: '#e8f5ee',
  textSub: '#8bbfa0',
  textMut: '#4d7a60',
} as const;

function FeatureIcon({ type, color }: { type: string; color: string }) {
  const s = {
    stroke: color,
    strokeWidth: '1.6',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (type === 'calendar') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="16" rx="2" {...s} />
        <path d="M3 10h18M8 3v4M16 3v4" {...s} />
      </svg>
    );
  }
  if (type === 'chart') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M3 20h18M6 17v-5M10 17V8M14 17v-7M18 17v-4" {...s} />
      </svg>
    );
  }
  if (type === 'qr') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="7" height="7" rx="1" {...s} />
        <rect x="14" y="3" width="7" height="7" rx="1" {...s} />
        <rect x="3" y="14" width="7" height="7" rx="1" {...s} />
        <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 19h2" {...s} />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 3 4 7v5c0 5 4 9 8 10 4-1 8-5 8-10V7Z" {...s} />
    </svg>
  );
}

const features: { icon: string; key: string }[] = [
  { icon: 'calendar', key: 'auth.feature1' },
  { icon: 'chart', key: 'auth.feature2' },
  { icon: 'qr', key: 'auth.feature3' },
  { icon: 'shield', key: 'auth.feature4' },
];

export function AuthLayout() {
  const { t } = useTranslation();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.background;
    const prevBody = body.style.background;
    html.style.background = C.bg;
    body.style.background = C.bg;
    return () => {
      html.style.background = prevHtml;
      body.style.background = prevBody;
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: C.bg,
        fontFamily: 'Inter, system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Left brand panel */}
      <div
        style={{
          background: `radial-gradient(ellipse 100% 80% at 20% 50%, rgba(5,150,105,0.28) 0%, transparent 70%),
                       linear-gradient(160deg,#081f12 0%,#051a0d 100%)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '52px 56px',
          borderRight: `1px solid ${C.border}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.04,
            backgroundImage: `linear-gradient(${C.brand} 1px,transparent 1px),linear-gradient(90deg,${C.brand} 1px,transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Back link */}
        <Link
          to="/"
          style={{
            color: C.textMut,
            fontSize: 12,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            position: 'relative',
            transition: 'color 0.15s',
            width: 'fit-content',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = C.text;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = C.textMut;
          }}
        >
          ← {t('auth.backToHome')}
        </Link>

        {/* Center content */}
        <div style={{ position: 'relative' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 36 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg,#059669,#10b981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(5,150,105,0.4)',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 20V9l8-5 8 5v11"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M9 20v-6h6v6"
                  stroke="#fff"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: C.text,
              }}
            >
              New Level Hub
            </span>
          </div>

          <h2
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: '#fff',
              marginBottom: 12,
              lineHeight: 1.25,
            }}
          >
            {t('auth.brandHeadline')}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: C.textSub,
              lineHeight: 1.7,
              maxWidth: 320,
              marginBottom: 36,
            }}
          >
            {t('auth.brandSubtitle')}
          </p>

          {/* Feature list */}
          {features.map(({ icon, key }) => (
            <div
              key={key}
              style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(5,150,105,0.12)',
                  border: `1px solid ${C.borderMd}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FeatureIcon type={icon} color={C.brandL} />
              </div>
              <span style={{ fontSize: 13, color: C.textSub }}>{t(key)}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: C.textMut, position: 'relative' }}>
          © 2026 New Level Hub
        </div>
      </div>

      {/* Right form panel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '52px 56px',
          background: C.bg,
        }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
