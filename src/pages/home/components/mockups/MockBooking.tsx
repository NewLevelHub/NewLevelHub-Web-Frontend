import { useTranslation } from 'react-i18next';

const C = {
  brand: '#059669',
  brandL: '#34d399',
  bg: '#051a0d',
  bgCard: '#0c2615',
  border: 'rgba(5,150,105,0.18)',
  text: '#e8f5ee',
  textMut: '#4d7a60',
};

type RoomStatus = 'free' | 'busy' | 'soon';
type RoomType = 'room' | 'desk' | 'parking' | 'capsule';

interface Room {
  n: string;
  type: RoomType;
  st: RoomStatus;
  pct: number;
}

const rooms: Room[] = [
  { n: 'Эверест M-3', type: 'room', st: 'free', pct: 22 },
  { n: 'Hot Desk D-5', type: 'desk', st: 'busy', pct: 100 },
  { n: 'Гранит C-2', type: 'room', st: 'busy', pct: 88 },
  { n: 'Парковка №7', type: 'parking', st: 'free', pct: 45 },
  { n: 'Капсула B-1', type: 'capsule', st: 'soon', pct: 60 },
  { n: 'Hot Desk A-3', type: 'desk', st: 'free', pct: 12 },
];

const statusColor: Record<RoomStatus, string> = {
  free: '#34d399',
  busy: '#f87171',
  soon: '#fbbf24',
};
const statusBg: Record<RoomStatus, string> = {
  free: 'rgba(52,211,153,0.12)',
  busy: 'rgba(248,113,113,0.12)',
  soon: 'rgba(251,191,36,0.12)',
};

export function MockBooking() {
  const { t } = useTranslation();

  const tabs = t('home.mock.booking.tabs', { returnObjects: true }) as string[];

  const typeLabel: Record<RoomType, string> = {
    room: t('home.mock.booking.typeRoom'),
    desk: t('home.mock.booking.typeDesk'),
    parking: t('home.mock.booking.typeParking'),
    capsule: t('home.mock.booking.typeCapsule'),
  };

  const statusLabel: Record<RoomStatus, string> = {
    free: t('home.mock.booking.free'),
    busy: t('home.mock.booking.busy'),
    soon: t('home.mock.booking.soon'),
  };

  return (
    <div style={{ padding: 16, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{t('home.mock.booking.title')}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map((tab, i) => (
            <span
              key={tab}
              style={{
                fontSize: 9,
                padding: '2px 7px',
                borderRadius: 4,
                background: i === 0 ? C.brand : 'transparent',
                color: i === 0 ? '#fff' : C.textMut,
                border: `1px solid ${i === 0 ? C.brand : C.border}`,
              }}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {rooms.map((r, i) => (
          <div
            key={i}
            style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{r.n}</span>
              <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: statusBg[r.st], color: statusColor[r.st] }}>
                {statusLabel[r.st]}
              </span>
            </div>
            <div style={{ fontSize: 9, color: C.textMut, marginBottom: 5 }}>{typeLabel[r.type]}</div>
            <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
              <div
                style={{
                  height: '100%',
                  width: r.pct + '%',
                  borderRadius: 2,
                  background: r.st === 'free' ? C.brand : statusColor[r.st],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
