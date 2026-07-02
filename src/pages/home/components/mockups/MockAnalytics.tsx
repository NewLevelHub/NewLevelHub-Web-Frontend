import { useTranslation } from 'react-i18next';

const C = {
  brand: '#059669',
  brandL: '#34d399',
  violet: '#10b981',
  bg: '#051a0d',
  bgCard: '#0c2615',
  border: 'rgba(5,150,105,0.18)',
  text: '#e8f5ee',
  textMut: '#4d7a60',
  success: '#34d399',
  warning: '#fbbf24',
};

const bars = [62, 79, 55, 88, 71, 94, 48];

export function MockAnalytics() {
  const { t } = useTranslation();

  const kpis = [
    { l: t('home.mock.analytics.companies'), v: '47', c: C.brandL },
    { l: t('home.mock.analytics.users'), v: '1 284', c: C.violet },
    { l: t('home.mock.analytics.bookingsToday'), v: '128', c: C.success },
    { l: t('home.mock.analytics.requests'), v: '12', c: C.warning },
  ];

  const days = t('home.mock.analytics.days', { returnObjects: true }) as string[];

  return (
    <div style={{ padding: 16, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 12 }}>{t('home.mock.analytics.title')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ padding: '8px', borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 9, color: C.textMut, marginBottom: 3 }}>{k.l}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.bg, borderRadius: 8, padding: '10px', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 9, color: C.textMut, marginBottom: 8 }}>{t('home.mock.analytics.loadByDay')}</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 44 }}>
          {bars.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div
                style={{
                  width: '100%',
                  height: v * 0.44 + 'px',
                  borderRadius: 3,
                  background: `linear-gradient(to top,${C.brand},${C.violet})`,
                  opacity: 0.85,
                }}
              />
              <span style={{ fontSize: 7, color: C.textMut }}>{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
