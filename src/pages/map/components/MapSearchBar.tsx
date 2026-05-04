import { memo } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

import type { MapPointSearchResult } from '@/shared/types';

import { MapSearchResults } from '@/pages/map/components/MapSearchResults';

export interface MapSearchBarProps {
  searchRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchClear: () => void;
  onSearchFocusShowResults: () => void;
  showSearchResults: boolean;
  showSearch: boolean;
  searchFetching: boolean;
  searchResults: MapPointSearchResult[] | undefined;
  onSelectResult: (result: MapPointSearchResult) => void;
}

export const MapSearchBar = memo<MapSearchBarProps>(
  ({
    searchRef,
    searchQuery,
    onSearchChange,
    onSearchClear,
    onSearchFocusShowResults,
    showSearchResults,
    showSearch,
    searchFetching,
    searchResults,
    onSelectResult,
  }) => {
    return (
      <div ref={searchRef} className="relative w-full max-w-sm">
        <label htmlFor="map-search" className="sr-only">
          Поиск по карте
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            id="map-search"
            type="search"
            value={searchQuery}
            onChange={onSearchChange}
            onFocus={onSearchFocusShowResults}
            placeholder="Поиск по карте..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-9 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            aria-label="Поиск по карте"
            aria-autocomplete="list"
            aria-expanded={showSearchResults && showSearch}
            role="combobox"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={onSearchClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Очистить поиск"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {showSearchResults && showSearch ? (
          <div aria-live="polite">
            {searchFetching ? (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 flex items-center justify-center rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden="true" />
                <span className="ml-2 text-sm text-gray-500">Поиск...</span>
              </div>
            ) : (
              <MapSearchResults results={searchResults ?? []} onSelect={onSelectResult} />
            )}
          </div>
        ) : null}
      </div>
    );
  },
);

MapSearchBar.displayName = 'MapSearchBar';
