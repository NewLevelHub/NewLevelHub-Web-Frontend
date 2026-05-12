export function PreferencesSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Загрузка настроек">
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} className="h-10 rounded bg-raised animate-pulse" />
      ))}
    </div>
  );
}
