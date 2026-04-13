import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
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
import {
  resBackLink,
  resCheckboxLabel,
  resFieldset,
  resFileInput,
  resFormCard,
  resGhostLinkBtn,
  resHint,
  resInput,
  resLabel,
  resLegend,
  resPrimaryBtn,
  resSelect,
  resSubtitle,
  resourcePageNarrow,
  resTitle,
  resErrorBanner,
} from '@/shared/ui/resourcePageStyles';
import type { Company, PaginatedResponse } from '@/shared/types';

type EquipmentState = Record<ResourceEquipmentKey, boolean>;

function defaultEquipment(): EquipmentState {
  return {
    projector: false,
    tv: false,
    whiteboard: false,
    video_conf: false,
    monitor: false,
    dock: false,
    power_outlet: true,
  };
}

export default function ResourceCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const [equipment, setEquipment] = useState<EquipmentState>(() => defaultEquipment());
  const [minDuration, setMinDuration] = useState(30);
  const [maxDuration, setMaxDuration] = useState(480);

  const [parkingType, setParkingType] = useState<'regular' | 'vip'>(PARKING_TYPES.REGULAR);
  const [capsuleZone, setCapsuleZone] = useState<'quiet' | 'regular'>(CAPSULE_ZONES.QUIET);

  const { data: companies = [] } = useQuery({
    queryKey: ['companies', 'resource-form'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Company>>(API.companies.list, {
        params: { page_size: 100 },
      });
      return data.results;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
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
        if (assignedCompanyId) base.assigned_company = Number(assignedCompanyId);
      }

      if (type === RESOURCE_TYPES.MEETING_ROOM) {
        base.equipment = { ...equipment };
        base.min_duration_minutes = minDuration;
        base.max_duration_minutes = maxDuration;
      }

      if (type === RESOURCE_TYPES.PARKING) {
        base.parking_type = parkingType;
        if (assignedCompanyId) base.assigned_company = Number(assignedCompanyId);
      }

      if (type === RESOURCE_TYPES.CAPSULE) {
        base.capsule_zone = capsuleZone;
      }

      if (photoFile) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(base)) {
          if (v === undefined || v === null) continue;
          if (k === 'equipment' && typeof v === 'object') {
            fd.append(k, JSON.stringify(v));
          } else if (typeof v === 'boolean') {
            fd.append(k, v ? 'true' : 'false');
          } else {
            fd.append(k, String(v));
          }
        }
        fd.append('photo', photoFile);
        const res = await apiClient.post(API.bookings.resources.create, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data as { id: number };
      }

      const res = await apiClient.post(API.bookings.resources.create, base);
      return res.data as { id: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['booking-resources'] });
      navigate(`/resources/${data.id}`);
    },
    onError: (e) => setErrorMsg(getApiErrorMessage(e)),
  });

  function toggleEquipment(key: ResourceEquipmentKey) {
    setEquipment((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <main className={resourcePageNarrow}>
      <Link to="/resources" className={resBackLink}>
        <ArrowLeft className="h-4 w-4" />
        К списку ресурсов
      </Link>

      <div>
        <h1 className={resTitle}>Новый ресурс</h1>
        <p className={resSubtitle}>
          Поля зависят от типа (как на бэкенде). Фото — необязательно.
        </p>
      </div>

      {errorMsg && (
        <div role="alert" className={resErrorBanner}>
          {errorMsg}
        </div>
      )}

      <form
        className={resFormCard}
        onSubmit={(e) => {
          e.preventDefault();
          setErrorMsg(null);
          createMutation.mutate();
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
            {type === RESOURCE_TYPES.MEETING_ROOM && (
              <p className={resHint}>Обязательно для переговорки</p>
            )}
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
          <label className={resLabel}>Фото</label>
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
          Активен (в каталоге)
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
              <label className={resLabel}>Закрепить за компанией (необязательно)</label>
              <select
                value={assignedCompanyId}
                onChange={(e) => setAssignedCompanyId(e.target.value)}
                className={resSelect}
              >
                <option value="">— Не закреплять —</option>
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
            <p className={resHint}>Оборудование (JSON на бэкенде)</p>
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
                <label className={resLabel}>Мин. длительность (мин)</label>
                <input
                  type="number"
                  min={1}
                  value={minDuration}
                  onChange={(e) => setMinDuration(Number(e.target.value))}
                  className={resInput}
                />
              </div>
              <div>
                <label className={resLabel}>Макс. длительность (мин)</label>
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
            <div>
              <label className={resLabel}>Тип</label>
              <select
                value={parkingType}
                onChange={(e) => setParkingType(e.target.value as 'regular' | 'vip')}
                className={resSelect}
              >
                <option value={PARKING_TYPES.REGULAR}>Обычная</option>
                <option value={PARKING_TYPES.VIP}>VIP</option>
              </select>
            </div>
            <div>
              <label className={resLabel}>Закрепить за компанией</label>
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

        {type === RESOURCE_TYPES.CAPSULE && (
          <fieldset className={resFieldset}>
            <legend className={resLegend}>Капсула</legend>
            <div>
              <label className={resLabel}>Зона</label>
              <select
                value={capsuleZone}
                onChange={(e) => setCapsuleZone(e.target.value as 'quiet' | 'regular')}
                className={resSelect}
              >
                <option value={CAPSULE_ZONES.QUIET}>Тихая</option>
                <option value={CAPSULE_ZONES.REGULAR}>Обычная</option>
              </select>
            </div>
          </fieldset>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className={resPrimaryBtn}
          >
            {createMutation.isPending ? 'Сохранение…' : 'Создать'}
          </button>
          <Link to="/resources" className={resGhostLinkBtn}>
            Отмена
          </Link>
        </div>
      </form>
    </main>
  );
}
