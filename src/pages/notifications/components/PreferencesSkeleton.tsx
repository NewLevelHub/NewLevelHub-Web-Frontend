export function PreferencesSkeleton() {
  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
        marginTop: 16,
      }}
      aria-busy="true"
      aria-label="Loading notification settings"
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 90px 90px',
          background: 'var(--bg-raised)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 16px',
          gap: 8,
        }}
      >
        <div style={{ height: 14, width: 120, borderRadius: 6, background: 'var(--bg-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 14, width: 40, borderRadius: 6, background: 'var(--bg-hover)', animation: 'pulse 1.5s ease-in-out infinite', margin: '0 auto' }} />
        <div style={{ height: 14, width: 40, borderRadius: 6, background: 'var(--bg-hover)', animation: 'pulse 1.5s ease-in-out infinite', margin: '0 auto' }} />
      </div>

      {/* Skeleton rows */}
      {Array.from({ length: 14 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 90px',
            padding: i % 4 === 0 ? '10px 16px' : '9px 16px',
            paddingLeft: i % 4 === 0 ? 16 : 50,
            borderBottom: '1px solid var(--border-faint)',
            alignItems: 'center',
            background: i % 4 === 0 ? 'var(--bg-raised)' : undefined,
          }}
        >
          <div
            style={{
              height: 12,
              width: i % 4 === 0 ? 100 : `${60 + (i % 3) * 30}%`,
              maxWidth: 240,
              borderRadius: 6,
              background: 'var(--bg-hover)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: 'var(--bg-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: 'var(--bg-hover)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
