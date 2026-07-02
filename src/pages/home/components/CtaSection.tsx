import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

const C = {
  border: 'rgba(5,150,105,0.18)',
  text: '#e8f5ee',
  textSub: '#8bbfa0',
};

export function CtaSection() {
  const { t } = useTranslation();

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .cta-section { padding: 60px 20px !important; }
          .cta-section h2 { font-size: 24px !important; }
          .cta-section a { width: 100% !important; display: block !important; box-sizing: border-box !important; }
        }
      `}</style>
      <section
        className="cta-section"
        style={{
          padding: '80px 48px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(5,150,105,0.14) 0%, rgba(16,185,129,0.08) 100%)',
          borderTop: `1px solid ${C.border}`,
        }}
      >
      <h2 style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-0.025em', marginBottom: 12 }}>
        {t('home.cta.title')}
      </h2>
      <p style={{ fontSize: 15, color: C.textSub, marginBottom: 28 }}>
        {t('home.cta.subtitle')}
      </p>
      <Link
        to="/login"
        style={{
          display: 'inline-block',
          padding: '14px 36px',
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(135deg,#059669,#10b981)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          letterSpacing: '-0.01em',
          boxShadow: '0 10px 28px rgba(5,150,105,0.4)',
          textDecoration: 'none',
        }}
      >
        {t('home.cta.btn')}
      </Link>
      </section>
    </>
  );
}
