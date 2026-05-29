import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  CAPSULE_ZONES,
  PARKING_TYPES,
  RESOURCE_EQUIPMENT_KEYS,
  RESOURCE_TYPES,
  type ResourceEquipmentKey,
  type ResourceType,
} from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { equipmentFromDetail, localIsoDate } from '@/pages/resources/utils';
import type {
  BookingResourceDetail,
  Company,
  PaginatedResponse,
  ResourceBlock,
  ResourcePhoto,
  ResourceScheduleSlot,
} from '@/shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type EquipmentState = Record<ResourceEquipmentKey, boolean>;

export type BlockFormState = {
  start_date: string;
  start_clock: string;
  end_date: string;
  end_clock: string;
  reason: string;
};

function defaultBlockForm(): BlockFormState {
  return {
    start_date: localIsoDate(new Date()),
    start_clock: '09:00',
    end_date: localIsoDate(new Date()),
    end_clock: '18:00',
    reason: '',
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useResourceDetail() {
  const { t } = useTranslation();
  const user = useUser();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const resourceId = id ? Number(id) : NaN;

  // ── modal / banner state ──────────────────────────────────────────────────
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [activateModal, setActivateModal] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState(false);

  // ── schedule state ────────────────────────────────────────────────────────
  const [scheduleDay, setScheduleDay] = useState(() => localIsoDate(new Date()));

  // ── block form state ──────────────────────────────────────────────────────
  const [blockForm, setBlockForm] = useState<BlockFormState>(defaultBlockForm);
  const [blockFormError, setBlockFormError] = useState<string | null>(null);

  // ── edit form fields ──────────────────────────────────────────────────────
  const [type, setType] = useState<ResourceType>(RESOURCE_TYPES.DESK);
  const [name, setName] = useState('');
  const [floor, setFloor] = useState(1);
  const [zone, setZone] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [hasMonitor, setHasMonitor] = useState(false);
  const [hasDock, setHasDock] = useState(false);
  const [hasPowerOutlet, setHasPowerOutlet] = useState(true);
  const [isHotDesk, setIsHotDesk] = useState(true);
  const [assignedCompanyId, setAssignedCompanyId] = useState<string>('');
  const [equipment, setEquipment] = useState<EquipmentState>(() =>
    equipmentFromDetail(null),
  );
  const [minDuration, setMinDuration] = useState(30);
  const [maxDuration, setMaxDuration] = useState(480);
  const [advanceBookingDays, setAdvanceBookingDays] = useState(14);
  const [minCancelMinutes, setMinCancelMinutes] = useState(30);
  const [parkingType, setParkingType] = useState<'regular' | 'vip'>(PARKING_TYPES.REGULAR);
  const [capsuleZone, setCapsuleZone] = useState<'quiet' | 'regular'>(CAPSULE_ZONES.QUIET);

  // ── queries ───────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ['booking-resource', resourceId],
    enabled: Number.isFinite(resourceId),
    queryFn: async () => {
      const { data: res } = await apiClient.get<BookingResourceDetail>(
        API.bookings.resources.detail(String(resourceId)),
      );
      return res;
    },
  });

  const { data: scheduleSlots = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ['booking-resource-schedule', resourceId, scheduleDay],
    enabled: Number.isFinite(resourceId),
    queryFn: async () => {
      const { data: res } = await apiClient.get<ResourceScheduleSlot[]>(
        API.bookings.resources.schedule(String(resourceId)),
        { params: { date: scheduleDay } },
      );
      return res;
    },
  });

  const { data: blocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ['booking-resource-blocks', resourceId],
    enabled: Number.isFinite(resourceId),
    queryFn: async () => {
      const { data: res } = await apiClient.get<ResourceBlock[]>(
        API.bookings.resources.blocks(String(resourceId)),
      );
      return res;
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'resource-form'],
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<Company>>(API.companies.list, {
        params: { page_size: 100 },
      });
      return res.results;
    },
  });

  // ── derived ───────────────────────────────────────────────────────────────

  const activeBlock = useMemo(() => {
    const now = Date.now();
    return (
      blocks.find((block) => {
        const start = new Date(block.start_time).getTime();
        const end = new Date(block.end_time).getTime();
        return start <= now && end > now;
      }) ?? null
    );
  }, [blocks]);

  const weekAnchors = useMemo(() => {
    const [y, m, d] = scheduleDay.split('-').map(Number);
    const mid = new Date(y, m - 1, d);
    const monday = new Date(mid);
    monday.setDate(mid.getDate() - ((mid.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(monday);
      x.setDate(monday.getDate() + i);
      return localIsoDate(x);
    });
  }, [scheduleDay]);

  // ── sync form from loaded data ────────────────────────────────────────────

  useEffect(() => {
    if (!data) return;
    setType(data.type);
    setName(data.name);
    setFloor(data.floor);
    setZone(data.zone);
    setDescription(data.description);
    setCapacity(data.capacity);
    setIsActive(data.is_active);
    setHasMonitor(data.has_monitor);
    setHasDock(data.has_dock);
    setHasPowerOutlet(data.has_power_outlet);
    setIsHotDesk(data.is_hot_desk);
    setAssignedCompanyId(data.assigned_company != null ? String(data.assigned_company) : '');
    setEquipment(equipmentFromDetail(data.equipment));
    setMinDuration(data.min_duration_minutes);
    setMaxDuration(data.max_duration_minutes);
    setAdvanceBookingDays(data.advance_booking_days ?? 14);
    setMinCancelMinutes(data.min_cancel_minutes ?? 30);
    setParkingType(data.parking_type === PARKING_TYPES.VIP ? PARKING_TYPES.VIP : PARKING_TYPES.REGULAR);
    setCapsuleZone(
      data.capsule_zone === CAPSULE_ZONES.REGULAR ? CAPSULE_ZONES.REGULAR : CAPSULE_ZONES.QUIET,
    );
  }, [data]);

  // ── payload builder ───────────────────────────────────────────────────────

  function buildPayload(): Record<string, unknown> {
    const base: Record<string, unknown> = {
      type,
      name: name.trim(),
      floor,
      zone: zone.trim(),
      description: description.trim(),
      capacity,
      is_active: isActive,
    };

    if (type === RESOURCE_TYPES.DESK) {
      base.has_monitor = hasMonitor;
      base.has_dock = hasDock;
      base.has_power_outlet = hasPowerOutlet;
      base.is_hot_desk = isHotDesk;
      base.assigned_company = assignedCompanyId ? Number(assignedCompanyId) : null;
    }

    if (type === RESOURCE_TYPES.MEETING_ROOM) {
      base.equipment = { ...equipment };
      base.min_duration_minutes = minDuration;
      base.max_duration_minutes = maxDuration;
    }

    base.advance_booking_days = advanceBookingDays;
    base.min_cancel_minutes = minCancelMinutes;

    if (type === RESOURCE_TYPES.PARKING) {
      base.parking_type = parkingType;
      base.assigned_company = assignedCompanyId ? Number(assignedCompanyId) : null;
    }

    if (type === RESOURCE_TYPES.CAPSULE) {
      base.capsule_zone = capsuleZone;
    }

    return base;
  }

  // ── mutations ─────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.patch<BookingResourceDetail>(
        API.bookings.resources.detail(String(resourceId)),
        buildPayload(),
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resource', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['booking-resource-schedule', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(getApiError(e).message),
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.post<BookingResourceDetail>(
        API.bookings.resources.activate(String(resourceId)),
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resource', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      setActivateModal(false);
      setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(getApiError(e).message),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.post<BookingResourceDetail>(
        API.bookings.resources.deactivate(String(resourceId)),
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resource', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['booking-resource-schedule', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      setDeactivateModal(false);
      setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(getApiError(e).message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(API.bookings.resources.detail(String(resourceId)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      navigate('/resources');
    },
    onError: (e) => {
      setErrorMsg(getApiError(e).message);
      setDeleteModal(false);
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (payload: { start_time: string; end_time: string; reason: string }) => {
      const { data: res } = await apiClient.post(
        API.bookings.resources.block(String(resourceId)),
        payload,
      );
      return res;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-resource', resourceId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-resource-schedule', resourceId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-resource-blocks', resourceId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-resources'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
      ]);
      setBlockForm(defaultBlockForm());
      setBlockFormError(null);
      setErrorMsg(null);
    },
    onError: (e) => {
      const message = getApiError(e).message;
      setBlockFormError(message);
      setErrorMsg(message);
    },
  });

  const unblockMutation = useMutation({
    mutationFn: async (blockId: number) => {
      await apiClient.delete(
        API.bookings.resources.unblock(String(resourceId), String(blockId)),
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['booking-resource', resourceId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-resource-schedule', resourceId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-resource-blocks', resourceId] }),
        queryClient.invalidateQueries({ queryKey: ['booking-resources'] }),
      ]);
      setErrorMsg(null);
    },
    onError: (e) => setErrorMsg(getApiError(e).message),
  });

  const addPhotosMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        await apiClient.post<ResourcePhoto>(
          API.bookings.resources.uploadPhoto(String(resourceId)),
          fd,
          { headers: { 'Content-Type': undefined } },
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resource', resourceId] });
      setNewPhotoFiles([]);
    },
    onError: (e) => setErrorMsg(getApiError(e).message),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) =>
      apiClient.delete(
        API.bookings.resources.deletePhoto(String(resourceId), String(photoId)),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resource', resourceId] });
    },
    onError: (e) => setErrorMsg(getApiError(e).message),
  });

  // ── block form helpers ────────────────────────────────────────────────────

  function updateBlockForm(patch: Partial<BlockFormState>) {
    setBlockForm((prev) => ({ ...prev, ...patch }));
    if (blockFormError) setBlockFormError(null);
  }

  function submitBlockForm() {
    const startIso = blockForm.start_date && blockForm.start_clock
      ? (() => {
          const d = new Date(`${blockForm.start_date}T${blockForm.start_clock}`);
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        })()
      : null;
    const endIso = blockForm.end_date && blockForm.end_clock
      ? (() => {
          const d = new Date(`${blockForm.end_date}T${blockForm.end_clock}`);
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        })()
      : null;

    if (!startIso || !endIso) {
      setBlockFormError(t('resources.detail.blockFormError_startEnd'));
      return;
    }
    if (!blockForm.reason.trim()) {
      setBlockFormError(t('resources.detail.blockFormError_reason'));
      return;
    }
    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      setBlockFormError(t('resources.detail.blockFormError_order'));
      return;
    }
    setBlockFormError(null);
    setErrorMsg(null);
    blockMutation.mutate({
      start_time: startIso,
      end_time: endIso,
      reason: blockForm.reason.trim(),
    });
  }

  // ── equipment toggle ──────────────────────────────────────────────────────

  function toggleEquipment(key: ResourceEquipmentKey) {
    setEquipment((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return {
    // query status
    resourceId,
    isLoading,
    isError,
    data,
    // schedule
    scheduleDay,
    setScheduleDay,
    scheduleSlots,
    scheduleLoading,
    weekAnchors,
    // blocks
    blocks,
    blocksLoading,
    activeBlock,
    // block form
    blockForm,
    blockFormError,
    updateBlockForm,
    submitBlockForm,
    blockMutationPending: blockMutation.isPending,
    unblockMutation,
    // edit form
    type,
    setType,
    name,
    setName,
    floor,
    setFloor,
    zone,
    setZone,
    description,
    setDescription,
    capacity,
    setCapacity,
    isActive,
    setIsActive,
    newPhotoFiles,
    setNewPhotoFiles,
    hasMonitor,
    setHasMonitor,
    hasDock,
    setHasDock,
    hasPowerOutlet,
    setHasPowerOutlet,
    isHotDesk,
    setIsHotDesk,
    assignedCompanyId,
    setAssignedCompanyId,
    equipment,
    toggleEquipment,
    minDuration,
    setMinDuration,
    maxDuration,
    setMaxDuration,
    advanceBookingDays,
    setAdvanceBookingDays,
    minCancelMinutes,
    setMinCancelMinutes,
    parkingType,
    setParkingType,
    capsuleZone,
    setCapsuleZone,
    // data
    companies,
    // mutations
    saveMutation,
    activateMutation,
    deactivateMutation,
    deleteMutation,
    addPhotosMutation,
    deletePhotoMutation,
    // modals
    errorMsg,
    setErrorMsg,
    deleteModal,
    setDeleteModal,
    activateModal,
    setActivateModal,
    deactivateModal,
    setDeactivateModal,
    // equipment keys (for iteration)
    RESOURCE_EQUIPMENT_KEYS,
  };
}
