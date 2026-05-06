interface AnnouncementEmptyStateProps {
  isError: boolean;
  errorMessage: string | null;
}

export function AnnouncementEmptyState({ isError, errorMessage }: AnnouncementEmptyStateProps) {
  if (isError) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-sm text-red-200"
      >
        {errorMessage}
      </p>
    );
  }
  return <p className="text-sm text-gray-500">Объявлений пока нет.</p>;
}
