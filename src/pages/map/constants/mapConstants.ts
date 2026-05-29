import type { MapPointType } from '@/shared/types';

export const POINT_TYPE_LABEL_KEYS: Record<string, string> = {
  desk: 'common.resourceType.desk',
  meeting_room: 'common.resourceType.meeting_room',
  parking: 'common.resourceType.parking',
  capsule: 'common.resourceType.capsule',
  office: 'map.pointType.office',
};

export const POINT_TYPES: MapPointType[] = ['desk', 'meeting_room', 'parking', 'capsule', 'office'];
