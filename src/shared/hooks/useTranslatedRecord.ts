import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/** Resolve enum value → i18n key map into translated labels (re-renders on language change). */
export function useTranslatedRecord<T extends string>(
  keyMap: Record<T, string>,
): Record<T, string> {
  const { t } = useTranslation();
  return useMemo(() => {
    const out = {} as Record<T, string>;
    for (const k of Object.keys(keyMap) as T[]) {
      out[k] = t(keyMap[k]);
    }
    return out;
  }, [t, keyMap]);
}
