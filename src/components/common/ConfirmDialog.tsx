import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md bg-white border border-[#E5E7EB] rounded-[12px] shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${
                destructive ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#DBEAFE] text-[#2563EB]'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <h2 id="confirm-dialog-title" className="text-[15px] font-semibold text-[#0F172A]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
            aria-label="Close confirmation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-[14px] text-[#475569] leading-relaxed">{description}</p>
        </div>

        <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E5E7EB] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-[8px] bg-white border border-[#E5E7EB] text-[13px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-9 px-4 rounded-[8px] text-[13px] font-semibold text-white transition-colors ${
              destructive
                ? 'bg-[#DC2626] hover:bg-[#B91C1C]'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
