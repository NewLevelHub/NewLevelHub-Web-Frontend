export function TrashSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-default bg-surface px-4 py-3 animate-pulse"
        >
          <div className="h-8 w-8 shrink-0 rounded bg-[var(--bg-muted)]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/5 rounded bg-[var(--bg-muted)]" />
            <div className="h-2.5 w-1/4 rounded bg-[var(--bg-muted)]" />
          </div>
          <div className="h-6 w-16 rounded bg-[var(--bg-muted)]" />
          <div className="h-6 w-20 rounded bg-[var(--bg-muted)]" />
          <div className="h-7 w-7 rounded bg-[var(--bg-muted)]" />
          <div className="h-7 w-7 rounded bg-[var(--bg-muted)]" />
        </div>
      ))}
    </div>
  );
}
