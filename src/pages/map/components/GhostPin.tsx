import { memo } from 'react';

export interface GhostPinProps {
  x: number;
  y: number;
  w?: number;
  h?: number;
}

export const GhostPin = memo<GhostPinProps>(({ x, y, w = 12, h = 8 }) => (
  <div
    className="absolute pointer-events-none z-20"
    style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
    aria-hidden="true"
  >
    <div className="h-full w-full rounded-[4px] border-2 border-dashed border-indigo-400 bg-indigo-50/60 flex items-end justify-start px-2 py-1.5 shadow-lg">
      <span className="text-[10px] font-semibold text-brand opacity-70">Новая область</span>
    </div>
  </div>
));

GhostPin.displayName = 'GhostPin';
