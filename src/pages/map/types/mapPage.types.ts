import type { MapPointType } from '@/shared/types';

export interface MapPointFormState {
  point_type: MapPointType;
  label: string;
  x: string;
  y: string;
  width: string;
  height: string;
  resource: string;
  company: string;
}

export const EMPTY_FORM: MapPointFormState = {
  point_type: 'desk',
  label: '',
  x: '',
  y: '',
  width: '',
  height: '',
  resource: '',
  company: '',
};
