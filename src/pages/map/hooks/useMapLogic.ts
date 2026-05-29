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
import { normalizePointStatus, type PointUiStatus } from '@/pages/map/lib/status';

import { EMPTY_FORM, type MapPointFormState } from '@/pages/map/types/mapPage.types';

export interface UseMapLogicReturn {
  searchRef: React.RefObject<HTMLDivElement | null>;
  isSuperadmin: boolean;
  viewMode: '2D' | '3D';
  setViewMode: React.Dispatch<React.SetStateAction<'2D' | '3D'>>;
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
  draggingPointId: number | null;
  resolvedImageUrl: string | null;
  highlightedPointId: number | null;
  ghostPin: { x: number; y: number; w: number; h: number } | null;
  handleMapMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMapMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMapMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleEditPoint: (point: MapPoint) => void;
  handleDeletePoint: (point: MapPoint) => void;
  handleMovePoint: (point: MapPoint) => void;
  handlePointDragStart: (point: MapPoint, clientX: number, clientY: number) => void;
  selectedPointId: number | null;
  handleRoomClick: (point: MapPoint) => void;
  handleCloseRoomPopup: () => void;
  handleBookPoint: (point: MapPoint) => void;
  handleDetailsPoint: (point: MapPoint) => void;
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
  editFloorOpen: boolean;
  editingFloor: ServiceFloor | null;
  onOpenEditFloor: (floor: ServiceFloor) => void;
  onCloseEditFloor: () => void;
  onFloorUpdated: (floor: ServiceFloor) => void;
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
  const [draggingPointId, setDraggingPointId] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{
    pointOriginX: number;
    pointOriginY: number;
    pointW: number;
    pointH: number;
    mouseOriginClientX: number;
    mouseOriginClientY: number;
  } | null>(null);

  const [ghostPin, setGhostPin] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
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

  const [editFloorOpen, setEditFloorOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState<ServiceFloor | null>(null);

  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);

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
      setDrawStart(null);
      setDraggingPointId(null);
      setDragState(null);
    }
  }, [editMode]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (selectedPointId !== null) {
        setSelectedPointId(null);
      } else if (movingPointId !== null) {
        setMovingPointId(null);
      } else if (addPanelOpen) {
        setAddPanelOpen(false);
        setGhostPin(null);
        setAddPanelForm(EMPTY_FORM);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPointId, movingPointId, addPanelOpen]);

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

  const handleRoomClick = useCallback((point: MapPoint) => {
    setSelectedPointId(point.id);
  }, []);

  const handleCloseRoomPopup = useCallback(() => {
    setSelectedPointId(null);
  }, []);

  const handleBookPoint = useCallback(
    (point: MapPoint) => {
      const pointWithFallback = point as MapPoint & { resource?: number | null };
      const resourceId = pointWithFallback.resource_id ?? pointWithFallback.resource ?? null;
      if (resourceId === null) return;
      navigate(`/bookings/catalog?resource=${resourceId}`);
    },
    [navigate],
  );

  const handleDetailsPoint = useCallback(
    (point: MapPoint) => {
      const pointWithFallback = point as MapPoint & { resource?: number | null };
      const resourceId = pointWithFallback.resource_id ?? pointWithFallback.resource ?? null;
      if (resourceId === null) return;
      navigate(`/resources/${resourceId}`);
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

  function getRelativeCoords(e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10));
    const y = Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10));
    return { x, y };
  }

  const handleMapMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isSuperadmin || !editMode) return;
      if (editModalOpen) return;
      if (movingPointId !== null) return;
      if (draggingPointId !== null) return;
      e.preventDefault();
      const coords = getRelativeCoords(e);
      setDrawStart(coords);
      setGhostPin({ x: coords.x, y: coords.y, w: 0, h: 0 });
      setAddPanelOpen(false);
      setAddPanelForm(EMPTY_FORM);
    },
    [isSuperadmin, editMode, editModalOpen, movingPointId, draggingPointId],
  );

  const handleMapMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Drag-перемещение существующего прямоугольника
      if (draggingPointId !== null && dragState !== null) {
        const canvasRect = e.currentTarget.getBoundingClientRect();
        const dxPct = ((e.clientX - dragState.mouseOriginClientX) / canvasRect.width) * 100;
        const dyPct = ((e.clientY - dragState.mouseOriginClientY) / canvasRect.height) * 100;
        const newX = Math.min(100 - dragState.pointW, Math.max(0, dragState.pointOriginX + dxPct));
        const newY = Math.min(100 - dragState.pointH, Math.max(0, dragState.pointOriginY + dyPct));
        setGhostPin({
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          w: dragState.pointW,
          h: dragState.pointH,
        });
        return;
      }

      // Рисование нового прямоугольника (существующая логика)
      if (!drawStart) return;
      const coords = getRelativeCoords(e);
      const x = Math.min(drawStart.x, coords.x);
      const y = Math.min(drawStart.y, coords.y);
      const w = Math.abs(coords.x - drawStart.x);
      const h = Math.abs(coords.y - drawStart.y);
      setGhostPin({ x, y, w: Math.max(w, 0.5), h: Math.max(h, 0.5) });
    },
    [draggingPointId, dragState, drawStart],
  );

  const handleMapMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isSuperadmin || !editMode) return;

      // Завершение drag-перемещения
      if (draggingPointId !== null && dragState !== null) {
        if (ghostPin !== null) {
          repositionMutation.mutate({
            id: draggingPointId,
            payload: { x: ghostPin.x, y: ghostPin.y },
          });
        }
        setDraggingPointId(null);
        setDragState(null);
        setGhostPin(null);
        setDrawStart(null);
        return;
      }

      // Moving mode — treat as a single click to reposition
      if (movingPointId !== null) {
        const coords = getRelativeCoords(e);
        repositionMutation.mutate({ id: movingPointId, payload: { x: coords.x, y: coords.y } });
        setMovingPointId(null);
        setDrawStart(null);
        setGhostPin(null);
        return;
      }

      if (!drawStart) return;
      const coords = getRelativeCoords(e);

      const x = Math.min(drawStart.x, coords.x);
      const y = Math.min(drawStart.y, coords.y);
      const w = Math.abs(coords.x - drawStart.x);
      const h = Math.abs(coords.y - drawStart.y);

      setDrawStart(null);

      // Too small a drag — ignore
      if (w < 2 || h < 2) {
        setGhostPin(null);
        return;
      }

      setGhostPin({ x, y, w, h });
      setAddPanelForm({ ...EMPTY_FORM, x: String(x), y: String(y), width: String(w), height: String(h) });
      setAddPanelOpen(true);
    },
    [isSuperadmin, editMode, draggingPointId, dragState, ghostPin, movingPointId, drawStart, repositionMutation],
  );

  const handleMovePoint = useCallback((point: MapPoint) => {
    setAddPanelOpen(false);
    setGhostPin(null);
    setAddPanelForm(EMPTY_FORM);
    setMovingPointId(point.id);
  }, []);

  const handlePointDragStart = useCallback(
    (point: MapPoint, clientX: number, clientY: number) => {
      if (!isSuperadmin || !editMode) return;
      setDraggingPointId(point.id);
      setDragState({
        pointOriginX: point.x,
        pointOriginY: point.y,
        pointW: point.width ?? 12,
        pointH: point.height ?? 8,
        mouseOriginClientX: clientX,
        mouseOriginClientY: clientY,
      });
      setDrawStart(null);
      setGhostPin(null);
      setAddPanelOpen(false);
      setAddPanelForm(EMPTY_FORM);
    },
    [isSuperadmin, editMode],
  );

  const handleAddPanelFormChange = useCallback((updates: Partial<MapPointFormState>) => {
    setAddPanelForm((prev) => {
      const next = { ...prev, ...updates };
      const xNum = parseFloat(next.x);
      const yNum = parseFloat(next.y);
      const wNum = parseFloat(next.width);
      const hNum = parseFloat(next.height);
      if (!isNaN(xNum) && !isNaN(yNum)) {
        setGhostPin({
          x: Math.min(100, Math.max(0, xNum)),
          y: Math.min(100, Math.max(0, yNum)),
          w: !isNaN(wNum) ? Math.max(0.5, wNum) : 12,
          h: !isNaN(hNum) ? Math.max(0.5, hNum) : 8,
        });
      }
      return next;
    });
  }, []);

  const handleAddPanelCancel = useCallback(() => {
    setAddPanelOpen(false);
    setGhostPin(null);
    setAddPanelForm(EMPTY_FORM);
    setDrawStart(null);
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
      width: point.width != null ? String(point.width) : '',
      height: point.height != null ? String(point.height) : '',
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

  const onOpenEditFloor = useCallback((floor: ServiceFloor) => {
    setEditingFloor(floor);
    setEditFloorOpen(true);
  }, []);

  const onCloseEditFloor = useCallback(() => {
    setEditFloorOpen(false);
    setEditingFloor(null);
  }, []);

  const onFloorUpdated = useCallback(
    (updatedFloor: ServiceFloor) => {
      queryClient.setQueryData<ServiceFloor[]>(['map-floors'], (old) =>
        old ? old.map((f) => (f.id === updatedFloor.id ? updatedFloor : f)) : old,
      );
      setEditFloorOpen(false);
      setEditingFloor(null);
    },
    [queryClient],
  );

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
    setSelectedPointId(null);
  }, []);

  return {
    searchRef,
    isSuperadmin,
    viewMode,
    setViewMode,
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
    draggingPointId,
    resolvedImageUrl,
    highlightedPointId,
    ghostPin,
    handleMapMouseDown,
    handleMapMouseMove,
    handleMapMouseUp,
    handleEditPoint,
    handleDeletePoint,
    handleMovePoint,
    handlePointDragStart,
    selectedPointId,
    handleRoomClick,
    handleCloseRoomPopup,
    handleBookPoint,
    handleDetailsPoint,
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
    editFloorOpen,
    editingFloor,
    onOpenEditFloor,
    onCloseEditFloor,
    onFloorUpdated,
  };
}
