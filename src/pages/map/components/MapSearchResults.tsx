import { memo } from 'react';
import { MapPin } from 'lucide-react';

import type { MapPointSearchResult } from '@/shared/types';

import { POINT_TYPE_LABELS } from '@/pages/map/constants/mapConstants';

export interface MapSearchResultsProps {
  results: MapPointSearchResult[];
  onSelect: (result: MapPointSearchResult) => void;
}

export const MapSearchResults = memo<MapSearchResultsProps>(({ results, onSelect }) => {
  if (results.length === 0) {
    return (
      <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-xl border border-gray-200 bg-white p-4 text-center shadow-xl">
        <p className="text-sm text-gray-500">Ничего не найдено</p>
      </div>
    );
  }

  return (
    <ul
      className="absolute top-full left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl"
      role="listbox"
      aria-label="Результаты поиска"
    >
      {results.map((result) => (
        <li key={result.id} role="option" aria-selected={false}>
          <button
            type="button"
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            onClick={() => onSelect(result)}
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{result.label}</p>
              {result.resource_name && (
                <p className="truncate text-xs text-gray-500">{result.resource_name}</p>
              )}
              <p className="text-xs text-gray-400">
                {result.floor_name} · {POINT_TYPE_LABELS[result.point_type] ?? result.point_type}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
});

MapSearchResults.displayName = 'MapSearchResults';
