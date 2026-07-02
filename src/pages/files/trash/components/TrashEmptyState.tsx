import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';

export function TrashEmptyState() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--bg-raised)',
            marginBottom: 16,
          }}
        >
          <Trash2 size={24} style={{ color: 'var(--text-muted)' }} />
        </div>
        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
          {t('trash.empty')}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {t('trash.emptyHint')}
        </p>
      </div>
    </div>
  );
}
