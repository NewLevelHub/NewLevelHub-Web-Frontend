import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

export interface StatCardProps {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value: number | string;
  iconClass?: string;
  to?: string;
}

export function StatCard({ icon: Icon, label, value, iconClass = 'text-brand', to }: StatCardProps) {
  const inner = (
    <div className="flex items-center gap-4 rounded-xl border border-default bg-surface p-5 transition-colors hover:bg-hover">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-raised">
        <Icon size={20} className={iconClass} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted">{label}</p>
        <p className="text-2xl font-bold text-primary">{value}</p>
      </div>
      {to && <ArrowRight size={14} className="ml-auto shrink-0 text-subtle" />}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <>{inner}</>;
}
