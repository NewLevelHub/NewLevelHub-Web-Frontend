import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { MockAnalytics } from './mockups/MockAnalytics';
import { MockGuest } from './mockups/MockGuest';

function smoothScrollTo(targetY: number, duration = 900) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  let startTime: number | null = null;
  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function step(timestamp: number) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    window.scrollTo(0, startY + diff * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  smoothScrollTo(el.getBoundingClientRect().top + window.scrollY - 60, 900);
}

const C = {
  bg: '#051a0d',
  brand: '#059669',
  borderMd: 'rgba(5,150,105,0.35)',
  text: '#e8f5ee',
  textSub: '#8bbfa0',
  textMut: '#4d7a60',
};

const STATS = [
  { value: '47+', labelKey: 'home.statCompanies' },
  { value: '1 200+', labelKey: 'home.statUsers' },
  { value: '12 000+', labelKey: 'home.statBookings' },
];

export function HeroSection() {
  const { t } = useTranslation();
  const words = t('home.heroWords', { returnObjects: true }) as string[];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes gradShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          padding: '100px 48px 80px',
          background: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(5,150,105,0.22) 0%, transparent 70%),
                       radial-gradient(ellipse 50% 50% at 90% 50%, rgba(16,185,129,0.1) 0%, transparent 60%),
                       ${C.bg}`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* grid overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.03,
            backgroundImage: `linear-gradient(${C.brand} 1px,transparent 1px),linear-gradient(90deg,${C.brand} 1px,transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div
          style={{
            maxWidth: 1240,
            margin: '0 auto',
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 64,
            alignItems: 'center',
          }}
        >
          {/* left copy */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 12px',
                borderRadius: 20,
                background: 'rgba(99,102,241,0.1)',
                border: `1px solid ${C.borderMd}`,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: C.brand,
                  animation: 'pulse 2s infinite',
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#34d399',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {t('home.badge')}
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(36px,4.5vw,58px)',
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                color: '#fff',
                marginBottom: 16,
              }}
            >
              {t('home.heroTitle')}
              <br />
              <span
                style={{
                  background: 'linear-gradient(90deg,#34d399,#10b981,#6ee7b7,#34d399)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'gradShift 4s linear infinite',
                  display: 'inline-block',
                  minWidth: '280px',
                }}
              >
                {words[wordIndex]}
              </span>
            </h1>

            <p style={{ fontSize: 17, lineHeight: 1.7, color: C.textSub, marginBottom: 36, maxWidth: 460 }}>
              {t('home.heroSubtitle')}
            </p>

            <div style={{ display: 'flex', gap: 12, marginBottom: 44, flexWrap: 'wrap' }}>
              <Link
                to="/login"
                style={{
                  padding: '13px 28px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  letterSpacing: '-0.01em',
                  boxShadow: '0 8px 24px rgba(5,150,105,0.4)',
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'transform 0.15s,box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 32px rgba(5,150,105,0.5)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 24px rgba(5,150,105,0.4)';
                }}
              >
                {t('home.openPlatform')}
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                style={{
                  padding: '13px 24px',
                  borderRadius: 10,
                  border: `1px solid ${C.borderMd}`,
                  background: 'transparent',
                  color: C.textSub,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  transition: 'color 0.15s,border-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = C.text;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.brand;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = C.textSub;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderMd;
                }}
              >
                {t('home.createAccount')}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* stats row */}
            <div style={{ display: 'flex', gap: 32 }}>
              {STATS.map(({ value, labelKey }) => (
                <div key={labelKey}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{value}</div>
                  <div style={{ fontSize: 11, color: C.textMut, marginTop: 1 }}>{t(labelKey)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* right: stacked mockups */}
          <div style={{ position: 'relative', height: 420 }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100%',
                animation: 'float 5s ease-in-out infinite',
              }}
            >
              <MockAnalytics />
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '5%',
                width: '70%',
                animation: 'float 5s 1.2s ease-in-out infinite',
                zIndex: 2,
              }}
            >
              <MockGuest />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
