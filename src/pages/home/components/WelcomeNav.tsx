import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import i18n from '@/shared/lib/i18n';

const C = {
  border: 'rgba(5,150,105,0.18)',
  borderMd: 'rgba(5,150,105,0.35)',
  brand: '#059669',
  text: '#e8f5ee',
  textSub: '#8bbfa0',
};

function smoothScrollTo(targetY: number, duration = 900) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  let startTime: number | null = null;

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function step(timestamp: number) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + diff * easeInOutCubic(progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const navHeight = 60;
  const targetY = el.getBoundingClientRect().top + window.scrollY - navHeight;
  smoothScrollTo(targetY, 900);
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
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
          <path d="M4 20V9l8-5 8 5v11" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 20v-6h6v6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>New Level Hub</span>
    </div>
  );
}

export function WelcomeNav() {
  const { t, i18n: i18nInstance } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const currentLang = i18nInstance.language?.startsWith('en') ? 'en' : 'ru';

  function switchLang(lang: 'ru' | 'en') {
    void i18n.changeLanguage(lang);
    localStorage.setItem('nlh_locale', lang);
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '0 48px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: scrolled ? 'rgba(5,26,13,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        backgroundClip: 'padding-box',
        boxShadow: scrolled ? '0 1px 0 rgba(5,150,105,0.18), 0 4px 24px rgba(0,0,0,0.3)' : 'none',
        transition: 'all 0.3s',
      }}
    >
      <Logo />

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <button
          type="button"
          onClick={() => scrollToSection('features')}
          style={{ fontSize: 13, color: C.textSub, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.text)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.textSub)}
        >
          {t('home.nav.features')}
        </button>
        <button
          type="button"
          onClick={() => scrollToSection('tariffs')}
          style={{ fontSize: 13, color: C.textSub, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.text)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.textSub)}
        >
          {t('home.nav.tariffs')}
        </button>
        <button
          type="button"
          onClick={() => smoothScrollTo(0, 900)}
          style={{ fontSize: 13, color: C.textSub, fontWeight: 500, border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.text)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.textSub)}
        >
          {t('home.nav.about')}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Language switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(5,150,105,0.2)',
            borderRadius: 8,
            padding: 3,
          }}
        >
          {(['ru', 'en'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => switchLang(lang)}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'inherit',
                fontWeight: currentLang === lang ? 600 : 400,
                background: currentLang === lang ? 'rgba(5,150,105,0.25)' : 'transparent',
                color: currentLang === lang ? '#e8f5ee' : '#8bbfa0',
                transition: 'all 0.15s',
              }}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <Link
        to="/login"
        style={{
          padding: '8px 20px',
          borderRadius: 8,
          border: `1px solid ${C.borderMd}`,
          background: 'transparent',
          color: C.text,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'all 0.15s',
          display: 'inline-block',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = C.brand;
          (e.currentTarget as HTMLAnchorElement).style.borderColor = C.brand;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
          (e.currentTarget as HTMLAnchorElement).style.borderColor = C.borderMd;
        }}
      >
        {t('home.nav.signIn')}
        </Link>
      </div>
    </nav>
  );
}
