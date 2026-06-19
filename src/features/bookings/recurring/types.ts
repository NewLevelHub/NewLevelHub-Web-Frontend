export type RecurringSeriesStatus = 'active' | 'completed';

export interface PreviewDateEntry {
  date: string;
  st: 'will_create' | 'conflict' | 'skipped';
}

export interface ScopeModalState {
  mode: 'cancel' | 'edit';
  bookingLabel: string;
  seriesId: number;
}
