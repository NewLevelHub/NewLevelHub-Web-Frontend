export function daysUntilPurge(deletedAt: string): number {
  const purgeDue = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeDue - Date.now()) / (24 * 60 * 60 * 1000)));
}
