import { useCallback, useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'nlh_calendar_notes';
const EMPTY_NOTES: CalendarNote[] = [];

export type CalendarNote = {
  id: string;
  companyId: string;
  userId: number;
  date: string;
  hour: number;
  text: string;
  updatedAt: string;
};

type NoteInput = {
  companyId: string;
  userId: number;
  date: string;
  hour: number;
  text: string;
};

let listeners: Array<() => void> = [];
let cachedRaw: string | null | undefined;
let cachedSnapshot: CalendarNote[] = EMPTY_NOTES;

function emitChange() {
  for (const listener of listeners) listeners();
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

function getSnapshot(): CalendarNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedSnapshot;

    cachedRaw = raw;
    if (!raw) {
      cachedSnapshot = EMPTY_NOTES;
      return cachedSnapshot;
    }

    const parsed = JSON.parse(raw) as CalendarNote[];
    cachedSnapshot = Array.isArray(parsed) ? parsed : EMPTY_NOTES;
    return cachedSnapshot;
  } catch {
    cachedRaw = null;
    cachedSnapshot = EMPTY_NOTES;
    return cachedSnapshot;
  }
}

function writeAll(notes: CalendarNote[]) {
  const serialized = JSON.stringify(notes);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedRaw = serialized;
  cachedSnapshot = notes.length > 0 ? notes : EMPTY_NOTES;
  emitChange();
}

function noteStorageId(companyId: string, userId: number, date: string, hour: number) {
  return `${companyId}:${userId}:${date}:${hour}`;
}

export function useCalendarNotes(companyId: string | null, userId: number | undefined) {
  const notes = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const scopedNotes = useMemo(() => {
    if (!companyId || userId == null) return EMPTY_NOTES;
    return notes.filter((note) => note.companyId === companyId && note.userId === userId);
  }, [companyId, notes, userId]);

  const getNote = useCallback(
    (date: string, hour: number) => {
      if (!companyId || userId == null) return null;
      const id = noteStorageId(companyId, userId, date, hour);
      return scopedNotes.find((note) => note.id === id) ?? null;
    },
    [companyId, scopedNotes, userId],
  );

  const saveNote = useCallback(
    ({ date, hour, text }: Omit<NoteInput, 'companyId' | 'userId'>) => {
      if (!companyId || userId == null) return null;

      const trimmed = text.trim();
      const id = noteStorageId(companyId, userId, date, hour);
      const all = getSnapshot();

      if (!trimmed) {
        writeAll(all.filter((note) => note.id !== id));
        return null;
      }

      const next: CalendarNote = {
        id,
        companyId,
        userId,
        date,
        hour,
        text: trimmed,
        updatedAt: new Date().toISOString(),
      };

      const withoutCurrent = all.filter((note) => note.id !== id);
      writeAll([...withoutCurrent, next]);
      return next;
    },
    [companyId, userId],
  );

  const deleteNote = useCallback(
    (date: string, hour: number) => {
      if (!companyId || userId == null) return;
      const id = noteStorageId(companyId, userId, date, hour);
      writeAll(getSnapshot().filter((note) => note.id !== id));
    },
    [companyId, userId],
  );

  return {
    notes: scopedNotes,
    getNote,
    saveNote,
    deleteNote,
  };
}
