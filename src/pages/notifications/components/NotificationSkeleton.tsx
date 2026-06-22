function NotificationSkeletonRow() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-faint)',
      }}
    >
      <div
        className="animate-pulse"
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: 'var(--bg-raised)',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div
          className="animate-pulse"
          style={{
            height: 13,
            width: '55%',
            borderRadius: 4,
            background: 'var(--bg-raised)',
          }}
        />
        <div
          className="animate-pulse"
          style={{
            height: 11,
            width: '80%',
            borderRadius: 4,
            background: 'var(--bg-raised)',
            animationDelay: '0.2s',
          }}
        />
      </div>
      <div
        className="animate-pulse"
        style={{
          height: 11,
          width: 52,
          borderRadius: 4,
          background: 'var(--bg-raised)',
          flexShrink: 0,
        }}
      />
    </div>
  );
}

export function NotificationSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeletonRow key={i} />
      ))}
    </>
  );
}
