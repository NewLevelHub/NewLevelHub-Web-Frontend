import { useTranslation } from 'react-i18next';

const C = {
  brand: '#059669',
  brandL: '#34d399',
  violet: '#10b981',
  bgCard: '#0c2615',
  border: 'rgba(5,150,105,0.18)',
  bg: '#051a0d',
  text: '#e8f5ee',
  textMut: '#4d7a60',
  success: '#34d399',
  warning: '#fbbf24',
};

type GuestStatus = 'inside' | 'waiting' | 'scheduled';

interface Guest {
  n: string;
  co: string;
  time: string;
  st: GuestStatus;
}

const guests: Guest[] = [
  { n: 'Айгерим Бекова', co: 'Lumen Labs', time: '10:30', st: 'inside' },
  { n: 'Нурлан Сейткали', co: 'Octant', time: '11:00', st: 'waiting' },
  { n: 'Арман Жаксыбеков', co: 'Nimbus Media', time: '14:00', st: 'scheduled' },
];

const statusColor: Record<GuestStatus, string> = {
  inside: C.success,
  waiting: C.warning,
  scheduled: C.brandL,
};

export function MockGuest() {
  const { t } = useTranslation();

  const statusLabel: Record<GuestStatus, string> = {
    inside: t('home.mock.guest.inside'),
    waiting: t('home.mock.guest.waiting'),
    scheduled: t('home.mock.guest.scheduled'),
  };

  return (
    <div style={{ padding: 16, background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{t('home.mock.guest.title')}</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: C.success,
              animation: 'pulse 2s infinite',
            }}
          />
          <span style={{ fontSize: 9, color: C.success }}>{t('home.mock.guest.todayCount')}</span>
        </div>
      </div>
      {guests.map((g, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 0',
            borderBottom: i < guests.length - 1 ? `1px solid ${C.border}` : 'none',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              flexShrink: 0,
              background: `linear-gradient(135deg,${C.brand},${C.violet})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {g.n
              .split(' ')
              .map((s) => s[0])
              .join('')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{g.n}</div>
            <div style={{ fontSize: 9, color: C.textMut }}>
              {g.co} · {g.time}
            </div>
          </div>
          <span
            style={{
              fontSize: 8,
              padding: '2px 6px',
              borderRadius: 4,
              background: `${statusColor[g.st]}18`,
              color: statusColor[g.st],
            }}
          >
            {statusLabel[g.st]}
          </span>
        </div>
      ))}
      <div
        style={{
          marginTop: 12,
          padding: '10px',
          background: C.bg,
          borderRadius: 8,
          border: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            background: 'rgba(99,102,241,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="2" y="2" width="9" height="9" rx="1.5" fill={C.brand} />
            <rect x="17" y="2" width="9" height="9" rx="1.5" fill={C.brand} />
            <rect x="2" y="17" width="9" height="9" rx="1.5" fill={C.brand} />
            <rect x="17" y="17" width="5" height="5" rx="1" fill={C.brandL} />
            <rect x="4" y="4" width="5" height="5" rx="0.5" fill="#fff" />
            <rect x="19" y="4" width="5" height="5" rx="0.5" fill="#fff" />
            <rect x="4" y="19" width="5" height="5" rx="0.5" fill="#fff" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text }}>{t('home.mock.guest.qrPass')}</div>
          <div style={{ fontSize: 9, color: C.textMut }}>{t('home.mock.guest.qrValid')}</div>
        </div>
      </div>
    </div>
  );
}
