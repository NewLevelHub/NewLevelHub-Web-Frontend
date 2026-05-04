import type { ServiceFloor } from '@/shared/types';

export function formatFloorTabLabel(floor: ServiceFloor): string {
  const trimmed = floor.name?.trim() ?? '';
  return trimmed || `Этаж ${floor.number}`;
}
