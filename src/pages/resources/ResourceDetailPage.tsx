import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { apiClient } from '@/shared/api/client';
import { API } from '@/shared/api/endpoints';
import {
  CAPSULE_ZONES,
  PARKING_TYPES,
  RESOURCE_EQUIPMENT_KEYS,
  RESOURCE_EQUIPMENT_LABELS,
  RESOURCE_TYPES,
  RESOURCE_TYPE_LABELS,
  type ResourceEquipmentKey,
  type ResourceType,
} from '@/shared/config/constants';
import { useUser } from '@/shared/hooks/useAuth';
import { getApiErrorMessage } from '@/shared/lib/apiError';
import { companiesCacheRoot } from '@/shared/lib/companyQueryKeys';
import { resolveMediaUrl } from '@/shared/lib/mediaUrl';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import {
  resBackLink,
  resCheckboxLabel,
  resDeleteBtn,
  resDeactivateBtn,
  resErrorBanner,
  resFieldset,
  resFileInput,
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
  ResourceScheduleSlot,
} from '@/shared/types';
import { ResourceDayTimeline } from '@/pages/bookings/components/ResourceDayTimeline';
import { cn } from '@/shared/lib/cn';

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
  const user = useUser();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);

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
    setParkingType(data.parking_type === PARKING_TYPES.VIP ? PARKING_TYPES.VIP : PARKING_TYPES.REGULAR);
    setCapsuleZone(
      data.capsule_zone === CAPSULE_ZONES.REGULAR ? CAPSULE_ZONES.REGULAR : CAPSULE_ZONES.QUIET,
    );
    setPhotoFile(null);
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
      const base = buildPayload();
      if (photoFile) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(base)) {
          if (v === undefined) continue;
          if (k === 'equipment' && typeof v === 'object' && v !== null) {
            fd.append(k, JSON.stringify(v));
          } else if (v === null) {
            fd.append(k, '');
          } else if (typeof v === 'boolean') {
            fd.append(k, v ? 'true' : 'false');
          } else {
            fd.append(k, String(v));
          }
        }
        fd.append('photo', photoFile);
        const { data: res } = await apiClient.patch<BookingResourceDetail>(
          API.bookings.resources.detail(String(resourceId)),
          fd,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        return res;
      }
      const { data: res } = await apiClient.patch<BookingResourceDetail>(
        API.bookings.resources.detail(String(resourceId)),
        base,
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-resource', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['booking-resource-schedule', resourceId] });
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      setErrorMsg(null);
      setPhotoFile(null);
    },
    onError: (e) => setErrorMsg(getApiErrorMessage(e)),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.patch<BookingResourceDetail>(
        API.bookings.resources.detail(String(resourceId)),
        { is_active: false },
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
    onError: (e) => setErrorMsg(getApiErrorMessage(e)),
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
      setErrorMsg(getApiErrorMessage(e));
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
      const message = getApiErrorMessage(e);
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
    onError: (e) => setErrorMsg(getApiErrorMessage(e)),
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
      setBlockFormError('Укажите дату и время начала и конца блокировки.');
      return;
    }
    if (!payload.reason) {
      setBlockFormError('Укажите причину блокировки.');
      return;
    }
    if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
      setBlockFormError('Окончание блокировки должно быть позже начала.');
      return;
    }
    setBlockFormError(null);
    setErrorMsg(null);
    blockMutation.mutate(payload);
  }

  if (!Number.isFinite(resourceId)) {
    return (
      <main className={resourcePageNarrow}>
        <p className="text-sm text-red-400">Некорректный идентификатор.</p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className={resourcePageNarrow}>
        <p className="text-sm text-secondary">Загрузка…</p>
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className={resourcePageNarrow}>
        <p className="text-sm text-red-400">Ресурс не найден или нет доступа.</p>
        <Link to="/resources" className={`${resLink} underline`}>
          К списку
        </Link>
      </main>
    );
  }

  return (
    <main className={resourcePageNarrow}>
      <Link to="/resources" className={resBackLink}>
        <ArrowLeft className="h-4 w-4" />
        К списку ресурсов
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className={resTitle}>{data.name}</h1>
          <p className={resSubtitle}>
            {RESOURCE_TYPE_LABELS[data.type]} · этаж {data.floor}
          </p>
          {activeBlock ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Текущая активная блокировка: {new Date(activeBlock.start_time).toLocaleString()} -{' '}
              {new Date(activeBlock.end_time).toLocaleString()}
              {activeBlock.reason ? ` · ${activeBlock.reason}` : ''}
            </div>
          ) : null}
        </div>
        {data.photo && (
          <img
            src={resolveMediaUrl(data.photo) ?? data.photo}
            alt=""
            className={resPhotoHeader}
          />
        )}
      </div>

      {errorMsg && (
        <div role="alert" className={resErrorBanner}>
          {errorMsg}
        </div>
      )}

      <section className={`${resFormCard} space-y-3`}>
        <h2 className="text-base font-semibold text-primary">Занятость по дням</h2>
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
          <p className="text-sm text-secondary">Загрузка расписания…</p>
        ) : (
          <ResourceDayTimeline dayDate={scheduleDay} slots={scheduleSlots} />
        )}
      </section>

      <section className={`${resFormCard} space-y-4`}>
        <div>
          <h2 className="text-base font-semibold text-primary">Блокировки ресурса</h2>
          <p className="mt-1 text-sm text-muted">
            Суперадмин может заблокировать ресурс на период ремонта или мероприятия. Пересекающиеся бронирования будут автоматически отменены.
          </p>
        </div>

        {activeBlock && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Ресурс сейчас заблокирован{activeBlock.reason ? `: ${activeBlock.reason}` : '.'}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <span className={resLabel}>Начало блокировки</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Дата</span>
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
                <span className="mb-1 block text-xs text-muted">Время</span>
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
            <span className={resLabel}>Конец блокировки</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Дата</span>
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
                <span className="mb-1 block text-xs text-muted">Время</span>
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
          <span className={resLabel}>Причина</span>
          <textarea
            rows={3}
            value={blockForm.reason}
            onChange={(e) => {
              setBlockForm((prev) => ({ ...prev, reason: e.target.value }));
              if (blockFormError) setBlockFormError(null);
            }}
            placeholder="Например: ремонт кондиционера"
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
              'rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-primary hover:bg-slate-900 disabled:opacity-50',
            )}
          >
            {blockMutation.isPending ? 'Блокировка...' : 'Заблокировать ресурс'}
          </button>
        </div>

        <div className="space-y-3 border-t border-default pt-4">
          <h3 className="text-sm font-semibold text-primary">Список блокировок</h3>
          {blocksLoading ? (
            <p className="text-sm text-muted">Загрузка блокировок...</p>
          ) : blocks.length === 0 ? (
            <p className="text-sm text-muted">Для ресурса пока нет блокировок.</p>
          ) : (
            <ul className="space-y-3">
              {blocks.map((block) => (
                <li
                  key={block.id}
                  className="flex flex-col gap-3 rounded-xl border border-default bg-gray-50 px-4 py-3 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary">
                      {new Date(block.start_time).toLocaleString()} - {new Date(block.end_time).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-muted">{block.reason || 'Без причины'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unblockMutation.mutate(block.id)}
                    disabled={unblockMutation.isPending}
                    className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    {unblockMutation.isPending ? 'Снятие...' : 'Снять досрочно'}
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
          <label className={resLabel}>Тип</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
            className={resSelect}
          >
            {Object.values(RESOURCE_TYPES).map((t) => (
              <option key={t} value={t}>
                {RESOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={resLabel}>Название</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={resInput}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={resLabel}>Этаж</label>
            <input
              type="number"
              required
              value={floor}
              onChange={(e) => setFloor(Number(e.target.value))}
              className={resInput}
            />
          </div>
          <div>
            <label className={resLabel}>Вместимость</label>
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
          <label className={resLabel}>Зона</label>
          <input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className={resInput}
          />
        </div>

        <div>
          <label className={resLabel}>Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={resInput}
          />
        </div>

        <div>
          <label className={resLabel}>Новое фото</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className={resFileInput}
          />
        </div>

        <label className={resCheckboxLabel}>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Активен
        </label>

        {type === RESOURCE_TYPES.DESK && (
          <fieldset className={resFieldset}>
            <legend className={resLegend}>Стол</legend>
            <label className={resCheckboxLabel}>
              <input type="checkbox" checked={hasMonitor} onChange={(e) => setHasMonitor(e.target.checked)} />
              Монитор
            </label>
            <label className={resCheckboxLabel}>
              <input type="checkbox" checked={hasDock} onChange={(e) => setHasDock(e.target.checked)} />
              Док-станция
            </label>
            <label className={resCheckboxLabel}>
              <input
                type="checkbox"
                checked={hasPowerOutlet}
                onChange={(e) => setHasPowerOutlet(e.target.checked)}
              />
              Розетка
            </label>
            <label className={resCheckboxLabel}>
              <input type="checkbox" checked={isHotDesk} onChange={(e) => setIsHotDesk(e.target.checked)} />
              Hot desk
            </label>
            <div>
              <label className={resLabel}>Компания</label>
              <select
                value={assignedCompanyId}
                onChange={(e) => setAssignedCompanyId(e.target.value)}
                className={resSelect}
              >
                <option value="">— Нет —</option>
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
            <legend className={resLegend}>Переговорка</legend>
            <div className="grid grid-cols-2 gap-2">
              {RESOURCE_EQUIPMENT_KEYS.map((key) => (
                <label key={key} className={resCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={equipment[key]}
                    onChange={() => toggleEquipment(key)}
                  />
                  {RESOURCE_EQUIPMENT_LABELS[key]}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={resLabel}>Мин. (мин)</label>
                <input
                  type="number"
                  min={1}
                  value={minDuration}
                  onChange={(e) => setMinDuration(Number(e.target.value))}
                  className={resInput}
                />
              </div>
              <div>
                <label className={resLabel}>Макс. (мин)</label>
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
            <legend className={resLegend}>Парковка</legend>
            <select
              value={parkingType}
              onChange={(e) => setParkingType(e.target.value as 'regular' | 'vip')}
              className={resSelect}
            >
              <option value={PARKING_TYPES.REGULAR}>Обычная</option>
              <option value={PARKING_TYPES.VIP}>VIP</option>
            </select>
            <select
              value={assignedCompanyId}
              onChange={(e) => setAssignedCompanyId(e.target.value)}
              className={resSelect}
            >
              <option value="">— Компания не закреплена —</option>
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
            <legend className={resLegend}>Капсула</legend>
            <select
              value={capsuleZone}
              onChange={(e) => setCapsuleZone(e.target.value as 'quiet' | 'regular')}
              className={`${resSelect} mt-2`}
            >
              <option value={CAPSULE_ZONES.QUIET}>Тихая</option>
              <option value={CAPSULE_ZONES.REGULAR}>Обычная</option>
            </select>
          </fieldset>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className={resPrimaryBtn}
          >
            {saveMutation.isPending ? 'Сохранение…' : 'Сохранить'}
          </button>
          {isActive && (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setDeactivateModal(true);
              }}
              className={resDeactivateBtn}
            >
              Деактивировать
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setDeleteModal(true);
            }}
            className={resDeleteBtn}
          >
            Удалить
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={deactivateModal}
        onClose={() => !deactivateMutation.isPending && setDeactivateModal(false)}
        onConfirm={() => deactivateMutation.mutate()}
        title="Деактивировать ресурс?"
        description="Будущие подтверждённые бронирования будут отменены, пользователи получат уведомления."
        variant="warning"
        confirmLabel="Деактивировать"
        isLoading={deactivateMutation.isPending}
      />

      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => !deleteMutation.isPending && setDeleteModal(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Удалить ресурс?"
        description="Удаление возможно только если нет будущих подтверждённых бронирований. Иначе API вернёт ошибку."
        variant="danger"
        confirmLabel="Удалить"
        isLoading={deleteMutation.isPending}
      />
    </main>
  );
}
