import { useTranslation } from 'react-i18next';

const C = {
  bgCard: '#0c2615',
  border: 'rgba(5,150,105,0.18)',
  bg: '#051a0d',
  text: '#e8f5ee',
  textSub: '#8bbfa0',
};

const colColors = ['#6366f1', '#8b5cf6', '#34d399'];

export function MockCRM() {
  const { t } = useTranslation();

  const cols = [
    {
      title: t('home.mock.crm.new'),
      col: colColors[0],
      items: t('home.mock.crm.items0', { returnObjects: true }) as string[],
    },
    {
      title: t('home.mock.crm.inProgress'),
      col: colColors[1],
      items: t('home.mock.crm.items1', { returnObjects: true }) as string[],
    },
    {
      title: t('home.mock.crm.done'),
      col: colColors[2],
      items: t('home.mock.crm.items2', { returnObjects: true }) as string[],
    },
  ];

  return (
    <div style={{ padding: 16, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 12 }}>{t('home.mock.crm.title')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
        {cols.map((col, ci) => (
          <div key={ci}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.col }} />
              <span style={{ fontSize: 9, fontWeight: 600, color: C.textSub }}>{col.title}</span>
            </div>
            {col.items.map((item, ii) => (
              <div
                key={ii}
                style={{
                  padding: '7px 8px',
                  background: C.bg,
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                  marginBottom: 4,
                  borderLeft: `2px solid ${col.col}`,
                }}
              >
                <div style={{ fontSize: 9, color: C.text, lineHeight: 1.3 }}>{item}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
