import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { useAuth } from '@/shared/hooks/useAuth';
import { USER_ROLES } from '@/shared/config/constants';
import type {
  FloorMap,
  MapPoint,
  MapPointSearchResult,
  MapPointUpdatePayload,
  ServiceFloor,
} from '@/shared/types';
import { isBookablePoint, normalizePointStatus, type PointUiStatus } from '@/pages/map/lib/status';

import { EMPTY_FORM, type MapPointFormState } from '@/pages/map/types/mapPage.types';

export interface UseMapLogicReturn {
  searchRef: React.RefObject<HTMLDivElement | null>;
  isSuperadmin: boolean;
  searchQuery: string;
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearchClear: () => void;
  handleSearchFocusShowResults: () => void;
  showSearchResults: boolean;
  showSearch: boolean;
  searchFetching: boolean;
  searchResults: MapPointSearchResult[] | undefined;
  handleSearchSelect: (result: MapPointSearchResult) => void;
  statusCounts: Record<PointUiStatus, number> | null;
  floors: ServiceFloor[] | undefined;
  floorsLoading: boolean;
  floorsError: boolean;
  selectedFloorId: number | null;
  handleSelectFloor: (floorId: number) => void;
  onOpenCreateFloor: () => void;
  createFloorOpen: boolean;
  onCloseCreateFloor: () => void;
  onFloorCreated: (floor: ServiceFloor) => void;
  mapLoading: boolean;
  mapError: boolean;
  floorMap: FloorMap | undefined;
  editMode: boolean;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  movingPointId: number | null;
  resolvedImageUrl: string | null;
  highlightedPointId: number | null;
  ghostPin: { x: number; y: number } | null;
  handleMapClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleEditPoint: (point: MapPoint) => void;
  handleDeletePoint: (point: MapPoint) => void;
  handleMovePoint: (point: MapPoint) => void;
  handlePointClick: (point: MapPoint) => void;
  addPanelOpen: boolean;
  addPanelForm: MapPointFormState;
  handleAddPanelFormChange: (updates: Partial<MapPointFormState>) => void;
  handleAddPanelCancel: () => void;
  handleAddPanelSuccess: () => void;
  editModalOpen: boolean;
  editModalInitialData: MapPointFormState;
  editingPointId: number | null;
  handleCloseEditModal: () => void;
  handleEditModalSuccess: () => void;
  deleteDialogOpen: boolean;
  deletingPoint: MapPoint | null;
  handleCloseDeleteDialog: () => void;
  handleDeleteSuccess: () => void;
  deleteFloorDialogOpen: boolean;
  deletingFloor: ServiceFloor | null;
  handleDeleteFloor: (floor: ServiceFloor) => void;
  handleCloseDeleteFloorDialog: () => void;
  handleDeleteFloorSuccess: (deletedFloorId: number) => void;
}

export function useMapLogic(): UseMapLogicReturn {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperadmin = user?.role === USER_ROLES.SUPERADMIN;

  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null);
  const [highlightedPointId, setHighlightedPointId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [movingPointId, setMovingPointId] = useState<number | null>(null);

  const [ghostPin, setGhostPin] = useState<{ x: number; y: number } | null>(null);
  const [addPanelForm, setAddPanelForm] = useState<MapPointFormState>(EMPTY_FORM);
  const [addPanelOpen, setAddPanelOpen] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalInitialData, setEditModalInitialData] = useState<MapPointFormState>(EMPTY_FORM);
  const [editingPointId, setEditingPointId] = useState<number | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPoint, setDeletingPoint] = useState<MapPoint | null>(null);

  const [createFloorOpen, setCreateFloorOpen] = useState(false);

  const [deleteFloorDialogOpen, setDeleteFloorDialogOpen] = useState(false);
  const [deletingFloor, setDeletingFloor] = useState<ServiceFloor | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const repositionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: MapPointUpdatePayload }) =>
      apiClient.patch(API.map.mapPoints.detail(id), payload).then((r) => r.data),
    onSuccess: () => {
      if (selectedFloorId !== null) {
        void queryClient.invalidateQueries({ queryKey: ['floor-map', selectedFloorId] });
      }
    },
  });

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!editMode) {
      setAddPanelOpen(false);
      setGhostPin(null);
      setAddPanelForm(EMPTY_FORM);
      setMovingPointId(null);
    }
  }, [editMode]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (movingPointId !== null) {
        setMovingPointId(null);
      } else if (addPanelOpen) {
        setAddPanelOpen(false);
        setGhostPin(null);
        setAddPanelForm(EMPTY_FORM);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [movingPointId, addPanelOpen]);

  const {
    data: floors,
    isLoading: floorsLoading,
    isError: floorsError,
  } = useQuery({
    queryKey: ['map-floors'],
    queryFn: () =>
      apiClient.get<{ results: ServiceFloor[] }>(API.map.floors).then((r) => r.data.results),
  });

  useEffect(() => {
    if (floors && floors.length > 0 && selectedFloorId === null) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  const atDatetime = new Date().toISOString();

  const {
    data: floorMap,
    isLoading: mapLoading,
    isError: mapError,
  } = useQuery({
    queryKey: ['floor-map', selectedFloorId, atDatetime.slice(0, 16)],
    queryFn: () =>
      apiClient
        .get<FloorMap>(API.map.floorMap(selectedFloorId!), {
          params: { datetime: atDatetime },
        })
        .then((r) => r.data),
    enabled: selectedFloorId !== null,
  });

  const {
    data: searchResults,
    isFetching: searchFetching,
  } = useQuery({
    queryKey: ['map-search', debouncedQuery],
    queryFn: () =>
      apiClient
        .get<MapPointSearchResult[]>(API.map.search, { params: { q: debouncedQuery } })
        .then((r) => r.data),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const handlePointClick = useCallback(
    (point: MapPoint) => {
      if (!isBookablePoint(point)) return;
      const pointWithFallback = point as MapPoint & { resource?: number | null };
      const resourceId = pointWithFallback.resource_id ?? pointWithFallback.resource ?? null;
      if (resourceId === null) return;
      navigate(`/bookings/catalog?resource=${resourceId}`);
    },
    [navigate],
  );

  const handleSearchSelect = useCallback((result: MapPointSearchResult) => {
    setSelectedFloorId(result.floor_id);
    setHighlightedPointId(result.id);
    setSearchQuery('');
    setDebouncedQuery('');
    setShowSearchResults(false);
    setTimeout(() => setHighlightedPointId(null), 3000);
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchResults(true);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
    setShowSearchResults(false);
  }, []);

  const handleSearchFocusShowResults = useCallback(() => {
    if (searchQuery.length >= 2) setShowSearchResults(true);
  }, [searchQuery.length]);

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isSuperadmin || !editMode) return;
      if (editModalOpen) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

      const clampedX = Math.min(100, Math.max(0, x));
      const clampedY = Math.min(100, Math.max(0, y));

      if (movingPointId !== null) {
        repositionMutation.mutate({ id: movingPointId, payload: { x: clampedX, y: clampedY } });
        setMovingPointId(null);
        return;
      }

      setGhostPin({ x: clampedX, y: clampedY });
      setAddPanelForm({ ...EMPTY_FORM, x: String(clampedX), y: String(clampedY) });
      setAddPanelOpen(true);
    },
    [isSuperadmin, editMode, editModalOpen, movingPointId, repositionMutation],
  );

  const handleMovePoint = useCallback((point: MapPoint) => {
    setAddPanelOpen(false);
    setGhostPin(null);
    setAddPanelForm(EMPTY_FORM);
    setMovingPointId(point.id);
  }, []);

  const handleAddPanelFormChange = useCallback((updates: Partial<MapPointFormState>) => {
    setAddPanelForm((prev) => {
      const next = { ...prev, ...updates };
      const xNum = parseFloat(next.x);
      const yNum = parseFloat(next.y);
      if (!isNaN(xNum) && !isNaN(yNum)) {
        setGhostPin({
          x: Math.min(100, Math.max(0, xNum)),
          y: Math.min(100, Math.max(0, yNum)),
        });
      }
      return next;
    });
  }, []);

  const handleAddPanelCancel = useCallback(() => {
    setAddPanelOpen(false);
    setGhostPin(null);
    setAddPanelForm(EMPTY_FORM);
  }, []);

  const handleAddPanelSuccess = useCallback(() => {
    setAddPanelOpen(false);
    setGhostPin(null);
    setAddPanelForm(EMPTY_FORM);
  }, []);

  const handleEditPoint = useCallback((point: MapPoint) => {
    setEditingPointId(point.id);
    setEditModalInitialData({
      point_type: point.point_type,
      label: point.label,
      x: String(point.x),
      y: String(point.y),
      resource: point.resource_id != null ? String(point.resource_id) : '',
      company: '',
    });
    setEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditingPointId(null);
  }, []);

  const handleEditModalSuccess = useCallback(() => {
    setEditModalOpen(false);
    setEditingPointId(null);
  }, []);

  const handleDeletePoint = useCallback((point: MapPoint) => {
    setDeletingPoint(point);
    setDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeletingPoint(null);
  }, []);

  const handleDeleteSuccess = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeletingPoint(null);
  }, []);

  const handleDeleteFloor = useCallback((floor: ServiceFloor) => {
    setAddPanelOpen(false);
    setGhostPin(null);
    setAddPanelForm(EMPTY_FORM);
    setMovingPointId(null);
    setDeletingFloor(floor);
    setDeleteFloorDialogOpen(true);
  }, []);

  const handleCloseDeleteFloorDialog = useCallback(() => {
    setDeleteFloorDialogOpen(false);
    setDeletingFloor(null);
  }, []);

  const handleDeleteFloorSuccess = useCallback(
    (deletedFloorId: number) => {
      // Optimistically remove the deleted floor from the cache so the
      // auto-select useEffect doesn't re-select the just-deleted floor
      // before the background refetch completes.
      queryClient.setQueryData<ServiceFloor[]>(['map-floors'], (old) =>
        old ? old.filter((f) => f.id !== deletedFloorId) : old,
      );
      setDeleteFloorDialogOpen(false);
      setDeletingFloor(null);
      setAddPanelOpen(false);
      setGhostPin(null);
      setAddPanelForm(EMPTY_FORM);
      setMovingPointId(null);
      setEditMode(false);
      if (selectedFloorId === deletedFloorId) {
        const remaining = floors?.filter((f) => f.id !== deletedFloorId) ?? [];
        setSelectedFloorId(remaining.length > 0 ? remaining[0].id : null);
      }
    },
    [selectedFloorId, floors, queryClient],
  );

  const selectedFloor = floors?.find((f) => f.id === selectedFloorId);
  const resolvedImageUrl = selectedFloor
    ? resolveMediaUrl(selectedFloor.plan_image_url ?? selectedFloor.plan_image)
    : null;
  const showSearch = debouncedQuery.length >= 2;
  const statusCounts = floorMap?.points.reduce<Record<PointUiStatus, number>>(
    (acc, point) => {
      const status = normalizePointStatus(point.resource_status);
      acc[status] += 1;
      return acc;
    },
    { free: 0, occupied: 0, soon_available: 0, none: 0 },
  ) ?? null;

  const handleSelectFloor = useCallback((floorId: number) => {
    setSelectedFloorId(floorId);
    setHighlightedPointId(null);
    setAddPanelOpen(false);
    setGhostPin(null);
    setAddPanelForm(EMPTY_FORM);
  }, []);

  return {
    searchRef,
    isSuperadmin,
    searchQuery,
    handleSearchChange,
    handleSearchClear,
    handleSearchFocusShowResults,
    showSearchResults,
    showSearch,
    searchFetching,
    searchResults,
    handleSearchSelect,
    statusCounts,
    floors,
    floorsLoading,
    floorsError,
    selectedFloorId,
    handleSelectFloor,
    onOpenCreateFloor: () => setCreateFloorOpen(true),
    createFloorOpen,
    onCloseCreateFloor: () => setCreateFloorOpen(false),
    onFloorCreated: (floor) => setSelectedFloorId(floor.id),
    mapLoading,
    mapError,
    floorMap,
    editMode,
    setEditMode,
    movingPointId,
    resolvedImageUrl,
    highlightedPointId,
    ghostPin,
    handleMapClick,
    handleEditPoint,
    handleDeletePoint,
    handleMovePoint,
    handlePointClick,
    addPanelOpen,
    addPanelForm,
    handleAddPanelFormChange,
    handleAddPanelCancel,
    handleAddPanelSuccess,
    editModalOpen,
    editModalInitialData,
    editingPointId,
    handleCloseEditModal,
    handleEditModalSuccess,
    deleteDialogOpen,
    deletingPoint,
    handleCloseDeleteDialog,
    handleDeleteSuccess,
    deleteFloorDialogOpen,
    deletingFloor,
    handleDeleteFloor,
    handleCloseDeleteFloorDialog,
    handleDeleteFloorSuccess,
  };
}
