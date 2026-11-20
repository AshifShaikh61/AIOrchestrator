import { AlertCircle, CheckCircle2, Clock, Loader2, MinusCircle, PauseCircle } from 'lucide-react';

type StatusVariant =
  | 'completed'
  | 'active'
  | 'online'
  | 'running'
  | 'failed'
  | 'error'
  | 'pending'
  | 'idle'
  | 'draft'
  | 'skipped'
  | 'cancelled'
  | 'offline'
  | 'archived';

const VARIANT_STYLES: Record<
  StatusVariant,
  { bg: string; text: string; label: string; icon: 'check' | 'run' | 'err' | 'pending' | 'idle' }
> = {
  completed: { bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]', label: 'Completed', icon: 'check' },
  active: { bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]', label: 'Active', icon: 'check' },
  online: { bg: 'bg-[#DCFCE7]', text: 'text-[#16A34A]', label: 'Online', icon: 'check' },
  running: { bg: 'bg-[#DBEAFE]', text: 'text-[#2563EB]', label: 'Running', icon: 'run' },
  failed: { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]', label: 'Failed', icon: 'err' },
  error: { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]', label: 'Error', icon: 'err' },
  pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', label: 'Pending', icon: 'pending' },
  draft: { bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]', label: 'Draft', icon: 'pending' },
  idle: { bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', label: 'Idle', icon: 'idle' },
  skipped: { bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', label: 'Skipped', icon: 'idle' },
  cancelled: { bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', label: 'Cancelled', icon: 'idle' },
  offline: { bg: 'bg-[#FEE2E2]', text: 'text-[#DC2626]', label: 'Offline', icon: 'err' },
  archived: { bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', label: 'Archived', icon: 'idle' },
};

export function StatusBadge({
  status,
  labelOverride,
  compact = false,
}: {
  status: StatusVariant;
  labelOverride?: string;
  compact?: boolean;
}) {
  const cfg = VARIANT_STYLES[status] ?? VARIANT_STYLES.idle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[8px] font-mono font-medium whitespace-nowrap shrink-0 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[11px]'
      } ${cfg.bg} ${cfg.text}`}
    >
      {cfg.icon === 'run' && (
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
      )}
      {cfg.icon === 'check' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
      {cfg.icon === 'err' && <AlertCircle className="w-3 h-3 shrink-0" />}
      {cfg.icon === 'pending' && <Clock className="w-3 h-3 shrink-0" />}
      {cfg.icon === 'idle' &&
        (status === 'skipped' ? (
          <MinusCircle className="w-3 h-3 shrink-0" />
        ) : (
          <PauseCircle className="w-3 h-3 shrink-0" />
        ))}
      <span>{labelOverride ?? cfg.label}</span>
    </span>
  );
}
