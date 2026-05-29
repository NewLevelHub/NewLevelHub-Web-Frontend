import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  CAPSULE_ZONES,
  COMPANY_TIERS,
  PARKING_TYPES,
  RESOURCE_TYPES,
  type CapsuleZone,
  type ParkingType,
  type ResourceEquipmentKey,
} from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { defaultEquipment } from '@/pages/resources/utils';
import type { Company, PaginatedResponse, Resource, ServiceFloor } from '@/shared/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResourceTypeValue = (typeof RESOURCE_TYPES)[keyof typeof RESOURCE_TYPES];
export type EquipmentState = Record<ResourceEquipmentKey, boolean>;

export type ResourceCreatePayload = {
  type: ResourceTypeValue;
  name: string;
  floor: number;
  zone?: string;
  description?: string;
  capacity?: number;
  availability_start: string;
  availability_end: string;
  availability_days: number[];
  is_active: boolean;
  has_monitor?: boolean;
  has_dock?: boolean;
  has_power_outlet?: boolean;
  is_hot_desk?: boolean;
  assigned_company?: number | null;
  equipment?: EquipmentState;
  min_duration_minutes?: number;
  max_duration_minutes?: number;
  advance_booking_days?: number;
  min_cancel_minutes?: number;
  parking_type?: ParkingType;
  capsule_zone?: CapsuleZone;
};

type BulkCreatePayload = {
  template: Omit<ResourceCreatePayload, 'name'>;
  count: number;
  name_prefix: string;
};

type CreateMutationInput = {
  payload: ResourceCreatePayload;
  photoFiles: File[];
};

export type FormState = {
  type: ResourceTypeValue;
  name: string;
  floor: string;
  zone: string;
  description: string;
  capacity: string;
  availability_start: string;
  availability_end: string;
  availability_days: number[];
  is_active: boolean;
  has_monitor: boolean;
  has_dock: boolean;
  has_power_outlet: boolean;
  is_hot_desk: boolean;
  assigned_company_id: string;
  equipment: EquipmentState;
  min_duration_minutes: string;
  max_duration_minutes: string;
  advance_booking_days: string;
  min_cancel_minutes: string;
  parking_type: ParkingType;
  capsule_zone: CapsuleZone;
};

export type BulkState = {
  name_prefix: string;
  count: string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useResourceCreate() {
  const { t } = useTranslation();
  const user = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>({
    type: RESOURCE_TYPES.DESK,
    name: '',
    floor: '',
    zone: '',
    description: '',
    capacity: '',
    availability_start: '09:00',
    availability_end: '18:00',
    availability_days: [0, 1, 2, 3, 4],
    is_active: true,
    has_monitor: false,
    has_dock: false,
    has_power_outlet: true,
    is_hot_desk: true,
    assigned_company_id: '',
    equipment: defaultEquipment(),
    min_duration_minutes: '30',
    max_duration_minutes: '480',
    advance_booking_days: '14',
    min_cancel_minutes: '30',
    parking_type: PARKING_TYPES.REGULAR,
    capsule_zone: CAPSULE_ZONES.QUIET,
  });

  const [bulk, setBulk] = useState<BulkState>({
    name_prefix: t('resources.create.deskPrefix'),
    count: '10',
  });

  const dayOptions = useMemo(() => {
    const labels = t('common.weekdaysShort', { returnObjects: true }) as string[];
    return [0, 1, 2, 3, 4, 5, 6].map((value) => ({
      value,
      label: labels[value] ?? String(value),
    }));
  }, [t]);

  const { data: companies = [] } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'resource-create', COMPANY_TIERS.PREMIUM],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Company>>(API.companies.list, {
        params: { page_size: 100, plan: COMPANY_TIERS.PREMIUM },
      });
      return data.results;
    },
  });

  const { data: floors = [], isLoading: floorsLoading } = useQuery({
    queryKey: ['map-floors'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ results: ServiceFloor[] }>(API.map.floors);
      return data.results;
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ payload, photoFiles: files }: CreateMutationInput) => {
      const { data: resource } = await apiClient.post<Resource>(
        API.bookings.resources.create,
        payload,
      );
      for (const file of files) {
        const fd = new FormData();
        fd.append('image', file);
        await apiClient.post(
          API.bookings.resources.uploadPhoto(String(resource.id)),
          fd,
          { headers: { 'Content-Type': undefined } },
        );
      }
      return resource;
    },
    onSuccess: async (resource) => {
      await queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      navigate('/resources', {
        state: {
          successMessage: t('resources.create.createdOne', { name: resource.name }),
        },
      });
    },
    onError: (error) => {
      const parsed = parseCreateError(error);
      setFieldErrors(parsed.fieldErrors);
      setGeneralError(parsed.message);
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: (payload: BulkCreatePayload) =>
      apiClient
        .post<Resource[]>(API.bookings.resources.bulkCreate, payload)
        .then((res) => res.data),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      navigate('/resources', {
        state: {
          successMessage: t('resources.create.createdMany', { count: variables.count }),
        },
      });
    },
    onError: (error) => {
      const parsed = parseCreateError(error);
      setFieldErrors(parsed.fieldErrors);
      setGeneralError(parsed.message);
    },
  });

  const isPending = createMutation.isPending || bulkCreateMutation.isPending;
  const requiresCapacity = form.type === RESOURCE_TYPES.MEETING_ROOM;
  const isDesk = form.type === RESOURCE_TYPES.DESK;
  const isParking = form.type === RESOURCE_TYPES.PARKING;
  const isCapsule = form.type === RESOURCE_TYPES.CAPSULE;

  const availabilityRangeInvalid =
    !!form.availability_start &&
    !!form.availability_end &&
    form.availability_start >= form.availability_end;

  function clearError(key: string) {
    if (!fieldErrors[key]) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearError(key);
    setGeneralError(null);
  }

  function toggleDay(day: number) {
    const exists = form.availability_days.includes(day);
    const nextDays = exists
      ? form.availability_days.filter((item) => item !== day)
      : [...form.availability_days, day].sort((a, b) => a - b);
    updateForm('availability_days', nextDays);
  }

  function toggleEquipment(key: ResourceEquipmentKey) {
    updateForm('equipment', {
      ...form.equipment,
      [key]: !form.equipment[key],
    });
  }

  function addPhotos(files: File[]) {
    setPhotoFiles((prev) => {
      const next = [...prev, ...files];
      if (primaryPhotoIndex === null && next.length > 0) setPrimaryPhotoIndex(0);
      return next;
    });
  }

  function removePhoto(idx: number) {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
    setPrimaryPhotoIndex((prev) => {
      if (prev === null) return null;
      if (prev === idx) return 0;
      if (idx < prev) return prev - 1;
      return prev;
    });
  }

  function buildTemplate(): Omit<ResourceCreatePayload, 'name'> {
    const payload: Omit<ResourceCreatePayload, 'name'> = {
      type: form.type,
      floor: Number(form.floor),
      availability_start: form.availability_start,
      availability_end: form.availability_end,
      availability_days: form.availability_days,
      is_active: form.is_active,
    };

    if (form.zone.trim()) payload.zone = form.zone.trim();
    if (form.description.trim()) payload.description = form.description.trim();

    if (requiresCapacity) {
      payload.capacity = Number(form.capacity);
      payload.equipment = { ...form.equipment };
      payload.min_duration_minutes = Number(form.min_duration_minutes);
      payload.max_duration_minutes = Number(form.max_duration_minutes);
    }
    if (form.advance_booking_days) payload.advance_booking_days = Number(form.advance_booking_days);
    if (form.min_cancel_minutes) payload.min_cancel_minutes = Number(form.min_cancel_minutes);

    if (isDesk) {
      payload.has_monitor = form.has_monitor;
      payload.has_dock = form.has_dock;
      payload.has_power_outlet = form.has_power_outlet;
      payload.is_hot_desk = form.is_hot_desk;
    }

    if (isParking) {
      payload.parking_type = form.parking_type;
    }

    if (isCapsule) {
      payload.capsule_zone = form.capsule_zone;
    }

    if (form.assigned_company_id) {
      payload.assigned_company = Number(form.assigned_company_id);
    }

    return payload;
  }

  function validateTypeSpecificFields(): boolean {
    if (requiresCapacity && (!form.capacity || Number(form.capacity) < 1)) {
      setFieldErrors({ capacity: t('resources.create.capacityRequired') });
      return false;
    }

    if (requiresCapacity) {
      const minDuration = Number(form.min_duration_minutes);
      const maxDuration = Number(form.max_duration_minutes);
      if (!Number.isInteger(minDuration) || minDuration < 1) {
        setFieldErrors({ min_duration_minutes: t('resources.create.minDuration') });
        return false;
      }
      if (!Number.isInteger(maxDuration) || maxDuration < 1) {
        setFieldErrors({ max_duration_minutes: t('resources.create.maxDuration') });
        return false;
      }
      if (minDuration > maxDuration) {
        setFieldErrors({ min_duration_minutes: t('resources.create.minMaxOrder') });
        return false;
      }
    }

    if (isParking && !form.parking_type) {
      setFieldErrors({ parking_type: t('resources.create.parkingTypeRequired') });
      return false;
    }

    if (isCapsule && !form.capsule_zone) {
      setFieldErrors({ capsule_zone: t('resources.create.capsuleZoneRequired') });
      return false;
    }

    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    if (!form.floor) {
      setFieldErrors({ floor: t('resources.create.floorRequired') });
      return;
    }

    if (!validateTypeSpecificFields()) return;

    if (availabilityRangeInvalid) {
      setFieldErrors({ availability_start: t('resources.create.availabilityOrder') });
      return;
    }

    if (form.availability_days.length === 0) {
      setFieldErrors({ availability_days: t('resources.create.availabilityDays') });
      return;
    }

    if (isBulkMode) {
      if (!bulk.name_prefix.trim()) {
        setFieldErrors({ name_prefix: t('resources.create.namePrefixRequired') });
        return;
      }
      const count = Number(bulk.count);
      if (!bulk.count || Number.isNaN(count) || count < 1) {
        setFieldErrors({ count: t('resources.create.countRequired') });
        return;
      }
      bulkCreateMutation.mutate({
        template: buildTemplate(),
        count,
        name_prefix: bulk.name_prefix.trim(),
      });
      return;
    }

    if (!form.name.trim()) {
      setFieldErrors({ name: t('resources.create.nameRequired') });
      return;
    }

    const orderedFiles =
      primaryPhotoIndex !== null && photoFiles.length > 1
        ? [photoFiles[primaryPhotoIndex], ...photoFiles.filter((_, i) => i !== primaryPhotoIndex)]
        : photoFiles;

    createMutation.mutate({
      payload: {
        ...buildTemplate(),
        name: form.name.trim(),
      },
      photoFiles: orderedFiles,
    });
  }

  return {
    // mode
    isBulkMode,
    setIsBulkMode,
    // form state
    form,
    updateForm,
    bulk,
    setBulk,
    // derived flags
    isDesk,
    isParking,
    isCapsule,
    requiresCapacity,
    availabilityRangeInvalid,
    // errors
    generalError,
    fieldErrors,
    clearError,
    // photos
    photoFiles,
    primaryPhotoIndex,
    setPrimaryPhotoIndex,
    addPhotos,
    removePhoto,
    // data
    companies,
    floors,
    floorsLoading,
    // day options
    dayOptions,
    // actions
    toggleDay,
    toggleEquipment,
    handleSubmit,
    // mutation state
    isPending,
  };
}

// ─── Local error parser (create-specific, preserves fieldErrors shape) ────────

function parseCreateError(
  error: unknown,
): { fieldErrors: Record<string, string>; message: string | null } {
  const fallback = { fieldErrors: {}, message: null };

  const raw = (error as { response?: { data?: unknown } })?.response?.data;
  if (!raw || typeof raw !== 'object') return fallback;

  const payload = raw as Record<string, unknown>;
  const detail = (payload.detail as Record<string, unknown> | undefined) ?? payload;
  if (!detail || typeof detail !== 'object') return fallback;

  const fieldErrors: Record<string, string> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (Array.isArray(value)) {
      fieldErrors[key] = String(value[0] ?? '');
    } else if (typeof value === 'string') {
      fieldErrors[key] = value;
    }
  }

  return {
    fieldErrors,
    message: Object.keys(fieldErrors).length > 0 ? null : null,
  };
}
