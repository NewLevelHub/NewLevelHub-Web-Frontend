import type { MapPointType } from '@/shared/types';

export const POINT_TYPE_LABELS: Record<string, string> = {
  desk: 'Рабочее место',
  meeting_room: 'Переговорная',
  parking: 'Парковка',
  capsule: 'Капсула',
  office: 'Офис',
};

export const POINT_TYPES: MapPointType[] = ['desk', 'meeting_room', 'parking', 'capsule', 'office'];
