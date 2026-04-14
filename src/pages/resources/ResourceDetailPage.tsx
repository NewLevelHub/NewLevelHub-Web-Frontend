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
import { getApiErrorMessage } from '@/shared/lib/apiError';
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
import type { BookingResourceDetail, Company, PaginatedResponse, ResourceScheduleSlot } from '@/shared/types';
import { ResourceDayTimeline } from '@/pages/bookings/components/ResourceDayTimeline';

type EquipmentState = Record<ResourceEquipmentKey, boolean>;

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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deactivateModal, setDeactivateModal] = useState(false);
  const [scheduleDay, setScheduleDay] = useState(() => localIsoDate(new Date()));

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
    queryKey: ['companies', 'resource-form'],
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

  function toggleEquipment(key: ResourceEquipmentKey) {
    setEquipment((prev) => ({ ...prev, [key]: !prev[key] }));
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
        <p className="text-sm text-gray-400">Загрузка…</p>
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
        <h2 className="text-base font-semibold text-gray-900">Занятость по дням</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={scheduleDay}
            onChange={(e) => setScheduleDay(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-900/40 px-2 py-1.5 text-sm text-gray-100"
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
                      : 'border-gray-600 text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  {dd}.{mm}
                </button>
              );
            })}
          </div>
        </div>
        {scheduleLoading ? (
          <p className="text-sm text-gray-400">Загрузка расписания…</p>
        ) : (
          <ResourceDayTimeline dayDate={scheduleDay} slots={scheduleSlots} />
        )}
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
