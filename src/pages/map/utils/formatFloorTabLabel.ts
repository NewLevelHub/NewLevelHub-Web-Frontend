import i18n from '@/shared/lib/i18n';
import type { ServiceFloor } from '@/shared/types';

export function formatFloorTabLabel(floor: ServiceFloor): string {
  const trimmed = floor.name?.trim() ?? '';
  return trimmed || i18n.t('common.floor', { floor: floor.number });
}
