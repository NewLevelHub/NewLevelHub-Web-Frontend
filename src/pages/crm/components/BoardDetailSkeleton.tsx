export function BoardDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-28 rounded bg-raised" />
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-raised" />
        <div className="h-7 w-48 rounded-lg bg-raised" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 h-64 rounded-xl bg-raised" />
        ))}
      </div>
    </div>
  );
}
