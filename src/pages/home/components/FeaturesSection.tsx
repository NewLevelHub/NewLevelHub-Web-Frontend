import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MockBooking } from './mockups/MockBooking';
import { MockAnalytics } from './mockups/MockAnalytics';
import { MockGuest } from './mockups/MockGuest';
import { MockCRM } from './mockups/MockCRM';

const C = {
  brand: '#059669',
  brandL: '#34d399',
  bgS: '#081f10',
  border: 'rgba(5,150,105,0.18)',
  borderMd: 'rgba(5,150,105,0.35)',
  text: '#e8f5ee',
  textSub: '#8bbfa0',
  textMut: '#4d7a60',
};

type FeatureId = 'booking' | 'analytics' | 'guests' | 'crm';

interface Feature {
  id: FeatureId;
  labelKey: string;
  titleKey: string;
  descKey: string;
  pointKeys: string[];
  MockComponent: React.FC;
  Icon: React.FC<{ size?: number; col?: string }>;
}

function IconCalendar({ size = 18, col = 'currentColor' }: { size?: number; col?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function IconChart({ size = 18, col = 'currentColor' }: { size?: number; col?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18M6 17v-5M10 17V8M14 17v-7M18 17v-4" />
    </svg>
  );
}

function IconQR({ size = 18, col = 'currentColor' }: { size?: number; col?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 19h2" />
    </svg>
  );
}

function IconGrid({ size = 18, col = 'currentColor' }: { size?: number; col?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconCheck({ size = 10, col = 'currentColor' }: { size?: number; col?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

const FEATURES: Feature[] = [
  {
    id: 'booking',
    labelKey: 'home.features.tabs.booking',
    titleKey: 'home.features.booking.title',
    descKey: 'home.features.booking.desc',
    pointKeys: [
      'home.features.booking.points.0',
      'home.features.booking.points.1',
      'home.features.booking.points.2',
      'home.features.booking.points.3',
    ],
    MockComponent: MockBooking,
    Icon: IconCalendar,
  },
  {
    id: 'analytics',
    labelKey: 'home.features.tabs.analytics',
    titleKey: 'home.features.analytics.title',
    descKey: 'home.features.analytics.desc',
    pointKeys: [
      'home.features.analytics.points.0',
      'home.features.analytics.points.1',
      'home.features.analytics.points.2',
      'home.features.analytics.points.3',
    ],
    MockComponent: MockAnalytics,
    Icon: IconChart,
  },
  {
    id: 'guests',
    labelKey: 'home.features.tabs.guests',
    titleKey: 'home.features.guests.title',
    descKey: 'home.features.guests.desc',
    pointKeys: [
      'home.features.guests.points.0',
      'home.features.guests.points.1',
      'home.features.guests.points.2',
      'home.features.guests.points.3',
    ],
    MockComponent: MockGuest,
    Icon: IconQR,
  },
  {
    id: 'crm',
    labelKey: 'home.features.tabs.crm',
    titleKey: 'home.features.crm.title',
    descKey: 'home.features.crm.desc',
    pointKeys: [
      'home.features.crm.points.0',
      'home.features.crm.points.1',
      'home.features.crm.points.2',
      'home.features.crm.points.3',
    ],
    MockComponent: MockCRM,
    Icon: IconGrid,
  },
];

export function FeaturesSection() {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % FEATURES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeIndex]);

  const active = FEATURES[activeIndex];
  const MockComp = active.MockComponent;

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .feat-section { padding: 60px 20px !important; }
          .feat-tabs { flex-wrap: wrap !important; gap: 6px !important; justify-content: flex-start !important; overflow-x: auto !important; }
          .feat-tabs button { font-size: 12px !important; padding: 7px 12px !important; }
          .feat-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .feat-mockup { order: -1; }
        }
      `}</style>
      <section
        id="features"
        className="feat-section"
        style={{ padding: '100px 48px', background: C.bgS, borderTop: `1px solid ${C.border}` }}
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
            {t('home.features.tabs.booking')}
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.025em', color: '#fff', marginBottom: 12 }}>
            {t('home.features.title')}
          </h2>
          <p style={{ fontSize: 15, color: C.textSub, maxWidth: 480, margin: '0 auto' }}>
            {t('home.features.subtitle')}
          </p>
        </div>

        {/* tab strip */}
        <div className="feat-tabs" style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 48 }}>
          {FEATURES.map((feat, i) => {
            const isActive = i === activeIndex;
            const Icon = feat.Icon;
            return (
              <button
                key={feat.id}
                onClick={() => setActiveIndex(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 18px',
                  borderRadius: 9,
                  border: `1px solid ${isActive ? C.brand : C.border}`,
                  background: isActive ? 'rgba(5,150,105,0.12)' : 'transparent',
                  color: isActive ? C.brandL : C.textMut,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={15} col={isActive ? C.brandL : C.textMut} />
                {t(feat.labelKey)}
              </button>
            );
          })}
        </div>

        {/* content */}
        <div
          key={activeIndex}
          className="feat-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}
        >
          <div>
            <h3
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#fff',
                marginBottom: 14,
                lineHeight: 1.2,
              }}
            >
              {t(active.titleKey)}
            </h3>
            <p style={{ fontSize: 15, color: C.textSub, lineHeight: 1.75, marginBottom: 28 }}>
              {t(active.descKey)}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {active.pointKeys.map((key) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      background: 'rgba(5,150,105,0.15)',
                      border: `1px solid ${C.borderMd}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconCheck size={10} col={C.brandL} />
                  </div>
                  <span style={{ fontSize: 13, color: C.textSub }}>{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="feat-mockup">
            <MockComp />
          </div>
        </div>
      </div>
      </section>
    </>
  );
}
