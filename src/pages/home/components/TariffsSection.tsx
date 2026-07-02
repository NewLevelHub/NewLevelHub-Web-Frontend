import { useTranslation } from 'react-i18next';

const C = {
  brand: '#059669',
  brandL: '#34d399',
  bg: '#051a0d',
  bgCard: '#0c2615',
  border: 'rgba(5,150,105,0.18)',
  borderMd: 'rgba(5,150,105,0.35)',
  text: '#e8f5ee',
  textSub: '#8bbfa0',
  textMut: '#4d7a60',
  success: '#34d399',
};

interface TariffPlan {
  nameKey: string;
  descKey: string;
  features: string[];
  locked: string[];
  ctaKey: string;
  featured: boolean;
}

const PLANS: TariffPlan[] = [
  {
    nameKey: 'home.tariffs.basic.name',
    descKey: 'home.tariffs.basic.desc',
    ctaKey: 'home.tariffs.basic.cta',
    featured: false,
    features: [
      'home.tariffs.features.booking',
      'home.tariffs.features.catalog',
      'home.tariffs.features.map',
      'home.tariffs.features.dashboard',
      'home.tariffs.features.email',
    ],
    locked: [
      'home.tariffs.locked.storage',
      'home.tariffs.locked.crm',
      'home.tariffs.locked.guests',
      'home.tariffs.locked.analytics',
      'home.tariffs.locked.export',
    ],
  },
  {
    nameKey: 'home.tariffs.standard.name',
    descKey: 'home.tariffs.standard.desc',
    ctaKey: 'home.tariffs.standard.cta',
    featured: true,
    features: [
      'home.tariffs.features.allBasic',
      'home.tariffs.features.storage50',
      'home.tariffs.features.crmBoards',
      'home.tariffs.features.analyticsCompany',
      'home.tariffs.features.csvExport',
      'home.tariffs.features.guestPasses',
    ],
    locked: [
      'home.tariffs.locked.guestAnalytics',
      'home.tariffs.locked.employeeExport',
    ],
  },
  {
    nameKey: 'home.tariffs.premium.name',
    descKey: 'home.tariffs.premium.desc',
    ctaKey: 'home.tariffs.premium.cta',
    featured: false,
    features: [
      'home.tariffs.features.allStandard',
      'home.tariffs.features.guestAnalytics',
      'home.tariffs.features.unlimitedStorage',
      'home.tariffs.features.employeeExport',
      'home.tariffs.features.pdfReports',
      'home.tariffs.features.slaSupport',
    ],
    locked: [],
  },
];

function IconCheck({ size = 9, col = 'currentColor' }: { size?: number; col?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function IconLock({ size = 8, col = 'currentColor' }: { size?: number; col?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function TariffsSection() {
  const { t } = useTranslation();

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .tar-section { padding: 60px 20px !important; }
          .tar-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
        }
      `}</style>
      <section
        id="tariffs"
        className="tar-section"
        style={{ padding: '100px 48px', background: C.bg, borderTop: `1px solid ${C.border}` }}
      >
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: C.brand,
              marginBottom: 10,
            }}
          >
            {t('home.tariffs.title')}
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', color: '#fff', marginBottom: 12 }}>
            {t('home.tariffs.title')}
          </h2>
          <p style={{ fontSize: 15, color: C.textSub }}>
            {t('home.tariffs.subtitle')}
          </p>
        </div>

        <div className="tar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {PLANS.map((plan) => (
            <div
              key={plan.nameKey}
              style={{
                padding: '28px 24px',
                borderRadius: 16,
                border: `1px solid ${plan.featured ? C.brand : C.border}`,
                background: plan.featured ? 'rgba(99,102,241,0.08)' : C.bgCard,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: plan.featured
                  ? '0 0 0 1px rgba(5,150,105,0.25),0 12px 40px rgba(5,150,105,0.18)'
                  : 'none',
              }}
            >
              {plan.featured && (
                <div
                  style={{
                    position: 'absolute',
                    top: -13,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '4px 14px',
                    borderRadius: 20,
                    background: 'linear-gradient(90deg,#059669,#10b981)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(5,150,105,0.4)',
                  }}
                >
                  {t('home.tariffs.popular')}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: plan.featured ? C.brandL : C.textMut,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  {t(plan.nameKey)}
                </div>
                <div style={{ fontSize: 13, color: C.textSub, marginTop: 4, lineHeight: 1.6 }}>{t(plan.descKey)}</div>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginBottom: 20, flex: 1 }}>
                {plan.features.map((featureKey) => (
                  <div key={featureKey} style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 9 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        flexShrink: 0,
                        background: 'rgba(52,211,153,0.12)',
                        border: '1px solid rgba(52,211,153,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconCheck size={9} col={C.success} />
                    </div>
                    <span style={{ fontSize: 12, color: C.textSub }}>{t(featureKey)}</span>
                  </div>
                ))}
                {plan.locked.map((lockedKey) => (
                  <div key={lockedKey} style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 9, opacity: 0.35 }}>
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        flexShrink: 0,
                        background: C.bgCard,
                        border: `1px solid ${C.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconLock size={8} col={C.textMut} />
                    </div>
                    <span style={{ fontSize: 12, color: C.textMut, textDecoration: 'line-through' }}>{t(lockedKey)}</span>
                  </div>
                ))}
              </div>

              <button
                style={{
                  padding: '11px 20px',
                  borderRadius: 9,
                  cursor: 'pointer',
                  background: plan.featured ? 'linear-gradient(135deg,#059669,#10b981)' : 'transparent',
                  border: plan.featured ? 'none' : `1px solid ${C.borderMd}`,
                  color: plan.featured ? '#fff' : C.textSub,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  boxShadow: plan.featured ? '0 6px 20px rgba(5,150,105,0.35)' : 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.85')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
              >
                {t(plan.ctaKey)}
              </button>
            </div>
          ))}
        </div>
      </div>
      </section>
    </>
  );
}
