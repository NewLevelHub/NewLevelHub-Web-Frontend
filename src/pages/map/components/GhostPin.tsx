import { memo } from 'react';

export interface GhostPinProps {
  x: number;
  y: number;
}

export const GhostPin = memo<GhostPinProps>(({ x, y }) => (
  <div
    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
    style={{ left: `${x}%`, top: `${y}%` }}
    aria-hidden="true"
  >
    <div className="relative flex items-center justify-center">
      <span className="absolute inline-flex h-6 w-6 rounded-full bg-indigo-400 opacity-40 animate-ping" />
      <div className="relative h-5 w-5 rounded-full border-2 border-dashed border-indigo-400 bg-gray-700 flex items-center justify-center shadow-lg">
        <span className="text-[9px] font-bold text-indigo-300 leading-none">?</span>
      </div>
    </div>
  </div>
));

GhostPin.displayName = 'GhostPin';
