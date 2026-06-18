// ─── Shared avatar helpers for service requests ──────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

interface AvatarCircleProps {
  avatar?: string | null;
  name: string;
  size?: number;
}

export function AvatarCircle({ avatar, name, size = 20 }: AvatarCircleProps) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 600,
        background: 'var(--bg-raised)',
        color: 'var(--text-secondary)',
      }}
    >
      {getInitials(name)}
    </span>
  );
}
