import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useOrchestratorStore } from '../../store/useOrchestratorStore';

export function ToastContainer() {
  const toasts = useOrchestratorStore((s) => s.toasts);
  const dismissToast = useOrchestratorStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const styles =
          toast.type === 'success'
            ? { icon: CheckCircle2, accent: 'text-[#16A34A]', bg: 'bg-[#DCFCE7]' }
            : toast.type === 'error'
              ? { icon: AlertCircle, accent: 'text-[#DC2626]', bg: 'bg-[#FEE2E2]' }
              : toast.type === 'warning'
                ? { icon: AlertTriangle, accent: 'text-[#D97706]', bg: 'bg-[#FEF3C7]' }
                : { icon: Info, accent: 'text-[#2563EB]', bg: 'bg-[#DBEAFE]' };
        const Icon = styles.icon;

        return (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white border border-[#E5E7EB] rounded-[12px] shadow-md p-3.5 flex items-start gap-3"
          >
            <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${styles.bg} ${styles.accent}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#0F172A]">{toast.title}</p>
              {toast.description && (
                <p className="text-[12px] text-[#64748B] mt-0.5 leading-snug">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-[6px] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
