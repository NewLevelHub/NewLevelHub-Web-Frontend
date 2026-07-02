import { useTranslation } from 'react-i18next';

const C = {
  border: 'rgba(5,150,105,0.18)',
  text: '#e8f5ee',
  textMut: '#4d7a60',
};

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

export function WelcomeFooter() {
  const { t } = useTranslation();

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .wf-footer { flex-direction: column !important; align-items: center !important; gap: 16px !important; padding: 28px 20px !important; text-align: center !important; }
          .wf-links { flex-wrap: wrap !important; justify-content: center !important; gap: 16px !important; }
        }
      `}</style>
      <footer
        className="wf-footer"
        style={{
          padding: '28px 48px',
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Logo />
        <span style={{ fontSize: 11, color: C.textMut }}>{t('home.footer.rights')}</span>
        <div className="wf-links" style={{ display: 'flex', gap: 20 }}>
        {[
          { key: 'home.footer.policy' },
          { key: 'home.footer.terms' },
          { key: 'home.footer.support' },
        ].map(({ key }) => (
          <a
            key={key}
            href="#"
            style={{ fontSize: 11, color: C.textMut, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.text)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.textMut)}
          >
            {t(key)}
          </a>
        ))}
        </div>
      </footer>
    </>
  );
}
