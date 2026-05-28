import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  CAPSULE_ZONES,
  PARKING_TYPES,
  RESOURCE_EQUIPMENT_KEYS,
  RESOURCE_EQUIPMENT_LABEL_KEYS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABEL_KEYS,
  type ResourceEquipmentKey,
  type ResourceType,
} from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiError } from '@/shared/lib/getApiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import {
  resActivateBtn,
  resBackLink,
  resCheckboxLabel,
  resDeleteBtn,
  resDeactivateBtn,
  resErrorBanner,
  resFieldset,

  resFormCard,
  resInput,
  resLabel,
  resLegend,
  resLink,
  resPhotoHeader,
  resPrimaryBtn,
  resSelect,
  resSubtitle,
  resourcePageNarrow,
  resTitle,
} from '@/shared/ui/resourcePageStyles';
import type {
  BookingResourceDetail,
  Company,
  PaginatedResponse,
  ResourceBlock,
  ResourcePhoto,
  ResourceScheduleSlot,
} from '@/shared/types';
import { ResourceDayTimeline } from '@/pages/bookings/components/ResourceDayTimeline';
import { cn } from '@/shared/lib/cn';

function fmtDT(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const HH = String(d.getHours()).padStart(2, '0');
  const MM = String(d.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yyyy}, ${HH}:${MM}`;
}

function fmtBlockRange(start: string, end: string): string {
  const ds = new Date(start);
  const de = new Date(end);
  const sameDay =
    ds.getFullYear() === de.getFullYear() &&
    ds.getMonth() === de.getMonth() &&
    ds.getDate() === de.getDate();
  const timeOf = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay) {
    const dd = String(ds.getDate()).padStart(2, '0');
    const mm = String(ds.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${ds.getFullYear()}, ${timeOf(ds)} – ${timeOf(de)}`;
  }
  return `${fmtDT(start)} – ${fmtDT(end)}`;
}

type EquipmentState = Record<ResourceEquipmentKey, boolean>;
type BlockFormState = {
  start_date: string;
  start_clock: string;
  end_date: string;
  end_clock: string;
  reason: string;
};

function localDateTimeToIso(datePart: string, timePart: string): string | null {
  if (!datePart || !timePart) return null;
  const date = new Date(`${datePart}T${timePart}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function equipmentFromDetail(eq: BookingResourceDetail['equipment']): EquipmentState {
  const d = eq ?? {
    projector: false,
    tv: false,
    whiteboard: false,
    video_conf: false,
    monitor: false,
    dock: false,
    power_outlet: false,
  };
  return { ...d };
}

export default function ResourceDetailPage() {
  const { t } = useTranslation();
  const user = useUser();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [activateModal, setActivateModal] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [scheduleDay, setScheduleDay] = useState(() => localIsoDate(new Date()));
  const [blockForm, setBlockForm] = useState<BlockFormState>({
    start_date: localIsoDate(new Date()),
    start_clock: '09:00',
    end_date: localIsoDate(new Date()),
    end_clock: '18:00',
    reason: '',
  });
  const [blockFormError, setBlockFormError] = useState<string | null>(null);

  const resourceId = id ? Number(id) : NaN;

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
  const activeBlock = useMemo(() => {
    const now = Date.now();
    return blocks.find((block) => {
      const start = new Date(block.start_time).getTime();
      const end = new Date(block.end_time).getTime();
      return start <= now && end > now;
    }) ?? null;
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

  const { data: companies = [] } = useQuery({
    queryKey: [...companiesCacheRoot(user?.id), 'resource-form'],
    queryFn: async () => {
      const { data: res } = await apiClient.get<PaginatedResponse<Company>>(API.companies.list, {
        params: { page_size: 100 },
      });
      return res.results;
    },
  });

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
      setBlockForm({
        start_date: localIsoDate(new Date()),
        start_clock: '09:00',
        end_date: localIsoDate(new Date()),
        end_clock: '18:00',
        reason: '',
      });
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
      await apiClient.delete(API.bookings.resources.unblock(String(resourceId), String(blockId)));
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
      apiClient.delete(API.bookings.resources.deletePhoto(String(resourceId), String(photoId))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resource', resourceId] });
    },
    onError: (e) => setErrorMsg(getApiError(e).message),
  });

  function toggleEquipment(key: ResourceEquipmentKey) {
    setEquipment((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function submitBlockForm() {
    const startIso = localDateTimeToIso(blockForm.start_date, blockForm.start_clock);
    const endIso = localDateTimeToIso(blockForm.end_date, blockForm.end_clock);
    const payload = {
      start_time: startIso ?? '',
      end_time: endIso ?? '',
      reason: blockForm.reason.trim(),
    };
    if (!startIso || !endIso) {
      setBlockFormError(t('resources.detail.blockFormError_startEnd'));
      return;
    }
    if (!payload.reason) {
      setBlockFormError(t('resources.detail.blockFormError_reason'));
      return;
    }
    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      setBlockFormError(t('resources.detail.blockFormError_order'));
      return;
    }
    setBlockFormError(null);
    setErrorMsg(null);
    blockMutation.mutate(payload);
  }

  if (!Number.isFinite(resourceId)) {
    return (
      <main className={resourcePageNarrow}>
        <p className="text-sm text-red-400">{t('resources.detail.invalidId')}</p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className={resourcePageNarrow}>
        <p className="text-sm text-secondary">{t('common.loading')}</p>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className={resourcePageNarrow}>
        <p className="text-sm text-red-400">{t('resources.detail.notFound')}</p>
        <Link to="/resources" className={`${resLink} underline`}>
          {t('resources.detail.toList')}
        </Link>
      </main>
    );
  }

  return (
    <main className={resourcePageNarrow}>
      <Link to="/resources" className={resBackLink}>
        <ArrowLeft className="h-4 w-4" />
        {t('resources.detail.backToList')}
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={resTitle}>{data.name}</h1>
          <p className={resSubtitle}>
            {t(RESOURCE_TYPE_LABEL_KEYS[data.type])} · {t('resources.detail.floorLabel', { floor: data.floor })}
          </p>
          {activeBlock ? (
            <div className="mt-2 rounded-lg border border-default bg-raised px-3 py-2 text-sm text-secondary">
              {t('resources.detail.activeBlock', { range: fmtBlockRange(activeBlock.start_time, activeBlock.end_time) })}
              {activeBlock.reason ? ` · ${activeBlock.reason}` : ''}
            </div>
          ) : null}
        </div>
        {(data.photos ?? []).length > 0 && (
          <div className="flex gap-2">
            {(data.photos ?? []).slice(0, 3).map((p) => (
              <img
                key={p.id}
                src={p.image_url ?? resolveMediaUrl(p.image) ?? p.image}
                alt=""
                className={resPhotoHeader}
              />
            ))}
          </div>
        )}
      </div>

      {errorMsg && (
        <div role="alert" className={resErrorBanner}>
          {errorMsg}
        </div>
      )}

      <section className={`${resFormCard} space-y-3`}>
        <h2 className="text-base font-semibold text-primary">{t('resources.detail.scheduleSection')}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={scheduleDay}
            onChange={(e) => setScheduleDay(e.target.value)}
            className="rounded-lg border border-default bg-raised px-2 py-1.5 text-sm text-primary"
          />
          <div className="flex flex-wrap gap-1">
            {weekAnchors.map((iso) => {
              const [, mm, dd] = iso.split('-');
              const active = iso === scheduleDay;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setScheduleDay(iso)}
                  className={`rounded px-2 py-0.5 text-xs font-medium border ${
                    active
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-default text-secondary hover:bg-hover'
                  }`}
                >
                  {dd}.{mm}
                </button>
              );
            })}
          </div>
        </div>
        {scheduleLoading ? (
          <p className="text-sm text-secondary">{t('resources.detail.loadingSchedule')}</p>
        ) : (
          <ResourceDayTimeline dayDate={scheduleDay} slots={scheduleSlots} />
        )}
      </section>

      <section className={`${resFormCard} space-y-4`}>
        <div>
          <h2 className="text-base font-semibold text-primary">{t('resources.detail.blocksSection')}</h2>
          <p className="mt-1 text-sm text-muted">
            {t('resources.detail.blocksDesc')}
          </p>
        </div>

        {activeBlock && (
          <div className="rounded-lg border border-default bg-raised px-4 py-3 text-sm text-secondary">
            {activeBlock.reason
              ? t('resources.detail.currentlyBlockedReason', { reason: activeBlock.reason })
              : t('resources.detail.currentlyBlocked')}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <span className={resLabel}>{t('resources.detail.blockStartLabel')}</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">{t('resources.detail.blockDateLabel')}</span>
                <input
                  type="date"
                  value={blockForm.start_date}
                  onChange={(e) => {
                    setBlockForm((prev) => ({ ...prev, start_date: e.target.value }));
                    if (blockFormError) setBlockFormError(null);
                  }}
                  className={resInput}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">{t('resources.detail.blockTimeLabel')}</span>
                <input
                  type="time"
                  step={300}
                  value={blockForm.start_clock}
                  onChange={(e) => {
                    setBlockForm((prev) => ({ ...prev, start_clock: e.target.value }));
                    if (blockFormError) setBlockFormError(null);
                  }}
                  className={resInput}
                />
              </label>
            </div>
          </div>
          <div className="space-y-3">
            <span className={resLabel}>{t('resources.detail.blockEndLabel')}</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">{t('resources.detail.blockDateLabel')}</span>
                <input
                  type="date"
                  value={blockForm.end_date}
                  onChange={(e) => {
                    setBlockForm((prev) => ({ ...prev, end_date: e.target.value }));
                    if (blockFormError) setBlockFormError(null);
                  }}
                  className={resInput}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">{t('resources.detail.blockTimeLabel')}</span>
                <input
                  type="time"
                  step={300}
                  value={blockForm.end_clock}
                  onChange={(e) => {
                    setBlockForm((prev) => ({ ...prev, end_clock: e.target.value }));
                    if (blockFormError) setBlockFormError(null);
                  }}
                  className={resInput}
                />
              </label>
            </div>
          </div>
        </div>

        <label className="block">
          <span className={resLabel}>{t('resources.detail.blockReasonLabel')}</span>
          <textarea
            rows={3}
            value={blockForm.reason}
            onChange={(e) => {
              setBlockForm((prev) => ({ ...prev, reason: e.target.value }));
              if (blockFormError) setBlockFormError(null);
            }}
            placeholder={t('resources.detail.blockReasonPlaceholder')}
            className={resInput}
          />
        </label>

        {blockFormError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {blockFormError}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={submitBlockForm}
            disabled={blockMutation.isPending}
            className={cn(
              'rounded-lg border border-default bg-raised px-4 py-2 text-sm font-medium text-primary hover:bg-hover transition-colors disabled:opacity-50',
            )}
          >
            {blockMutation.isPending ? t('resources.detail.blockSubmitPending') : t('resources.detail.blockSubmit')}
          </button>
        </div>

        <div className="space-y-3 border-t border-default pt-4">
          <h3 className="text-sm font-semibold text-primary">{t('resources.detail.blockListTitle')}</h3>
          {blocksLoading ? (
            <p className="text-sm text-muted">{t('resources.detail.loadingBlocks')}</p>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-muted">{t('resources.detail.noBlocks')}</p>
          ) : (
            <ul className="space-y-3">
              {blocks.map((block) => (
                <li
                  key={block.id}
                  className="flex flex-col gap-3 rounded-xl border border-default bg-raised px-4 py-3 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">
                      {fmtBlockRange(block.start_time, block.end_time)}
                    </p>
                    <p className="mt-1 text-sm text-muted">{block.reason || t('resources.detail.blockNoReason')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unblockMutation.mutate(block.id)}
                    disabled={unblockMutation.isPending}
                    className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {unblockMutation.isPending ? t('resources.detail.unblockPending') : t('resources.detail.unblockBtn')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <form
        className={resFormCard}
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMsg(null);
          saveMutation.mutate();
        }}
      >
        <div>
          <label className={resLabel}>{t('resources.detail.typeLabel')}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
            className={resSelect}
          >
            {Object.values(RESOURCE_TYPES).map((resourceType) => (
              <option key={resourceType} value={resourceType}>
                {t(RESOURCE_TYPE_LABEL_KEYS[resourceType])}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={resLabel}>{t('resources.detail.nameLabel')}</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={resInput}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={resLabel}>{t('resources.detail.floorFieldLabel')}</label>
            <input
              type="number"
              required
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              className={resInput}
            />
          </div>
          <div>
            <label className={resLabel}>{t('resources.detail.capacityLabel')}</label>
            <input
              type="number"
              min={1}
              required={type === RESOURCE_TYPES.MEETING_ROOM}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className={resInput}
            />
          </div>
        </div>

        <div>
          <label className={resLabel}>{t('resources.detail.zoneLabel')}</label>
          <input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className={resInput}
          />
        </div>

        <div>
          <label className={resLabel}>{t('resources.detail.descriptionLabel')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={resInput}
          />
        </div>

        <div className="space-y-3">
          <label className={resLabel}>{t('resources.detail.photosLabel')}</label>
          {(data.photos ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(data.photos ?? []).map((p) => (
                <div key={p.id} className="group relative">
                  <img
                    src={p.image_url ?? p.image}
                    alt=""
                    className="h-20 w-28 rounded-lg border border-default object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => deletePhotoMutation.mutate(p.id)}
                    disabled={deletePhotoMutation.isPending}
                    className="absolute right-1 top-1 hidden rounded bg-black/60 px-1.5 py-0.5 text-xs text-white group-hover:block"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <label
            htmlFor="new-photos"
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-default bg-raised px-4 py-3 text-sm text-secondary transition-colors hover:bg-hover"
          >
            <span className="font-medium text-blue-600">{t('resources.detail.addPhoto')}</span>
            <span className="text-muted">{t('resources.detail.addPhotoHint')}</span>
            <input
              id="new-photos"
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setNewPhotoFiles((prev) => [...prev, ...files]);
              }}
            />
          </label>
          {newPhotoFiles.length > 0 && (
            <div className="space-y-1.5">
              {newPhotoFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-default bg-raised px-3 py-1.5 text-sm text-secondary">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setNewPhotoFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="ml-3 shrink-0 text-red-500 hover:text-red-700"
                  >{t('common.delete')}</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addPhotosMutation.mutate(newPhotoFiles)}
                disabled={addPhotosMutation.isPending}
                className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {addPhotosMutation.isPending ? t('common.loading') : t('resources.detail.uploadSelected')}
              </button>
            </div>
          )}
        </div>

        <label className={resCheckboxLabel}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          {t('resources.detail.activeLabel')}
        </label>

        {type === RESOURCE_TYPES.DESK && (
          <fieldset className={resFieldset}>
            <legend className={resLegend}>{t('resources.detail.deskSettings')}</legend>
            <label className={resCheckboxLabel}>
              <input type="checkbox" checked={hasMonitor} onChange={(e) => setHasMonitor(e.target.checked)} />
              {t('resources.detail.monitorLabel')}
            </label>
            <label className={resCheckboxLabel}>
              <input type="checkbox" checked={hasDock} onChange={(e) => setHasDock(e.target.checked)} />
              {t('resources.detail.dockLabel')}
            </label>
            <label className={resCheckboxLabel}>
              <input
                type="checkbox"
                checked={hasPowerOutlet}
                onChange={(e) => setHasPowerOutlet(e.target.checked)}
              />
              {t('resources.detail.outletLabel')}
            </label>
            <label className={resCheckboxLabel}>
              <input type="checkbox" checked={isHotDesk} onChange={(e) => setIsHotDesk(e.target.checked)} />
              {t('resources.detail.hotDeskLabel')}
            </label>
            <div>
              <label className={resLabel}>{t('common.company')}</label>
              <select
                value={assignedCompanyId}
                onChange={(e) => setAssignedCompanyId(e.target.value)}
                className={resSelect}
              >
                <option value="">{t('resources.detail.companyNone')}</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
        )}

        {type === RESOURCE_TYPES.MEETING_ROOM && (
          <fieldset className={`${resFieldset} space-y-4`}>
            <legend className={resLegend}>{t('resources.detail.meetingRoomSettings')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {RESOURCE_EQUIPMENT_KEYS.map((key) => (
                <label key={key} className={resCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={equipment[key]}
                    onChange={() => toggleEquipment(key)}
                  />
                  {t(RESOURCE_EQUIPMENT_LABEL_KEYS[key])}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={resLabel}>{t('resources.detail.minMinutesLabel')}</label>
                <input
                  type="number"
                  min={1}
                  value={minDuration}
                  onChange={(e) => setMinDuration(Number(e.target.value))}
                  className={resInput}
                />
              </div>
              <div>
                <label className={resLabel}>{t('resources.detail.maxMinutesLabel')}</label>
                <input
                  type="number"
                  min={1}
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(Number(e.target.value))}
                  className={resInput}
                />
              </div>
            </div>
          </fieldset>
        )}

        {type === RESOURCE_TYPES.PARKING && (
          <fieldset className={resFieldset}>
            <legend className={resLegend}>{t('resources.detail.parkingSettings')}</legend>
            <select
              value={parkingType}
              onChange={(e) => setParkingType(e.target.value as 'regular' | 'vip')}
              className={resSelect}
            >
              <option value={PARKING_TYPES.REGULAR}>{t('resources.detail.parkingRegular')}</option>
              <option value={PARKING_TYPES.VIP}>VIP</option>
            </select>
            <select
              value={assignedCompanyId}
              onChange={(e) => setAssignedCompanyId(e.target.value)}
              className={resSelect}
            >
              <option value="">{t('resources.detail.companyNotAssigned')}</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </fieldset>
        )}

        {type === RESOURCE_TYPES.CAPSULE && (
          <fieldset className={resFieldset}>
            <legend className={resLegend}>{t('resources.detail.capsuleSettings')}</legend>
            <select
              value={capsuleZone}
              onChange={(e) => setCapsuleZone(e.target.value as 'quiet' | 'regular')}
              className={`${resSelect} mt-2`}
            >
              <option value={CAPSULE_ZONES.QUIET}>{t('resources.detail.capsuleQuiet')}</option>
              <option value={CAPSULE_ZONES.REGULAR}>{t('resources.detail.capsuleRegular')}</option>
            </select>
          </fieldset>
        )}

        <fieldset className={resFieldset}>
          <legend className={resLegend}>{t('resources.detail.bookingPolicyLabel')}</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="advance_booking_days" className={resLabel}>
                {t('resources.detail.advanceDaysLabel')}
              </label>
              <input
                type="number"
                id="advance_booking_days"
                min={1}
                value={advanceBookingDays}
                onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
                className={resInput}
              />
            </div>
            <div>
              <label htmlFor="min_cancel_minutes" className={resLabel}>
                {t('resources.detail.minCancelLabel')}
              </label>
              <input
                type="number"
                id="min_cancel_minutes"
                min={1}
                value={minCancelMinutes}
                onChange={(e) => setMinCancelMinutes(Number(e.target.value))}
                className={resInput}
              />
            </div>
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className={resPrimaryBtn}
          >
            {saveMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
          {!isActive && (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setActivateModal(true);
              }}
              className={resActivateBtn}
            >{t('common.activate')}</button>
          )}
          {isActive && (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setDeactivateModal(true);
              }}
              className={resDeactivateBtn}
            >{t('common.deactivate')}</button>
          )}
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setDeleteModal(true);
            }}
            className={resDeleteBtn}
          >{t('common.delete')}</button>
        </div>
      </form>

      <ConfirmModal
        isOpen={activateModal}
        onClose={() => !activateMutation.isPending && setActivateModal(false)}
        onConfirm={() => activateMutation.mutate()}
        title={t('resources.detail.activateModalTitle')}
        description={t('resources.detail.activateModalDesc')}
        variant="warning"
        confirmLabel={t('common.activate')}
        isLoading={activateMutation.isPending}
      />

      <ConfirmModal
        isOpen={deactivateModal}
        onClose={() => !deactivateMutation.isPending && setDeactivateModal(false)}
        onConfirm={() => deactivateMutation.mutate()}
        title={t('resources.detail.deactivateModalTitle')}
        description={t('resources.detail.deactivateModalDesc')}
        variant="warning"
        confirmLabel={t('common.deactivate')}
        isLoading={deactivateMutation.isPending}
      />

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => !deleteMutation.isPending && setDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate()}
        title={t('resources.detail.deleteModalTitle')}
        description={t('resources.detail.deleteModalDesc')}
        variant="danger"
        confirmLabel={t('common.delete')}
        isLoading={deleteMutation.isPending}
      />
    </main>
  );
}
