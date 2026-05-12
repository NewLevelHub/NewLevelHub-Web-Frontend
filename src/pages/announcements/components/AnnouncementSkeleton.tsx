export function AnnouncementSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-32 animate-pulse rounded-xl border border-default bg-surface"
        />
      ))}
    </div>
  );
}
