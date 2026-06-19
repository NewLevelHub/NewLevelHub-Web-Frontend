import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, List, RefreshCw } from 'lucide-react';

type ScopeOption = 'this_only' | 'this_and_following' | 'all';

interface RecurringScopeModalProps {
  mode: 'cancel' | 'edit';
  bookingLabel: string;
  onConfirm: (scope: ScopeOption) => void;
  onClose: () => void;
}

export function RecurringScopeModal({ mode, bookingLabel, onConfirm, onClose }: RecurringScopeModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ScopeOption | null>(null);

  const actionWord = mode === 'cancel'
    ? t('recurring.cancelledAction')
    : t('recurring.editedAction');

  const scopeAreaWord = mode === 'cancel'
    ? t('recurring.scopeCancel')
    : t('recurring.scopeEdit');

  const options: Array<{ value: ScopeOption; icon: React.ReactNode; label: string; sub: string }> = [
    {
      value: 'this_only',
      icon: <CalendarDays style={{ width: 16, height: 16 }} aria-hidden="true" />,
      label: t('recurring.thisOnly'),
      sub: t('recurring.thisOnlySub'),
    },
    {
      value: 'this_and_following',
      icon: <List style={{ width: 16, height: 16 }} aria-hidden="true" />,
      label: t('recurring.thisAndFollowing'),
      sub: t('recurring.thisAndFollowingSub', { action: actionWord }),
    },
    {
      value: 'all',
      icon: <RefreshCw style={{ width: 16, height: 16 }} aria-hidden="true" />,
      label: t('recurring.all'),
      sub: t('recurring.allSub', { action: actionWord }),
    },
  ];

  const modal = (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-label={t('recurring.scopeModalTitle')}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '20px 20px 0' }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('recurring.scopeModalTitle')}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {bookingLabel} &mdash; {t('recurring.scopeSelectArea', { action: scopeAreaWord })}
            </p>
          </div>

          {/* Options */}
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {options.map((opt) => {
              const isSelected = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelected(opt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: isSelected
                      ? '1.5px solid var(--brand)'
                      : '1.5px solid var(--border)',
                    background: isSelected ? 'var(--brand-subtle)' : 'var(--bg-raised)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s, background 0.15s',
                    width: '100%',
                  }}
                >
                  {/* Radio indicator */}
                  <span
                    style={{
                      flexShrink: 0,
                      marginTop: 1,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: isSelected ? '5px solid var(--brand)' : '2px solid var(--border-strong)',
                      background: 'transparent',
                      transition: 'border 0.15s',
                    }}
                    aria-hidden="true"
                  />
                  <span style={{ color: isSelected ? 'var(--brand-text)' : 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>
                    {opt.icon}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {opt.label}
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                      {opt.sub}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              padding: '12px 20px 20px',
              borderTop: '1px solid var(--border-faint)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={selected === null}
              onClick={() => { if (selected) onConfirm(selected); }}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                background: mode === 'cancel' ? 'var(--danger)' : 'var(--brand)',
                color: 'var(--text-on-brand)',
                fontSize: 13,
                fontWeight: 600,
                cursor: selected === null ? 'not-allowed' : 'pointer',
                opacity: selected === null ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {mode === 'cancel' ? t('recurring.confirmCancel') : t('recurring.confirmEdit')}
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modal, document.body);
}
