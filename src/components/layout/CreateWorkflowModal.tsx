import { zodResolver } from '@hookform/resolvers/zod';
import { GitBranch, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useOrchestratorStore } from '../../store/useOrchestratorStore';

const workflowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Workflow name must be at least 3 characters')
    .max(80, 'Workflow name must be under 80 characters'),
  description: z
    .string()
    .trim()
    .min(5, 'Provide a brief description (min 5 characters)')
    .max(240, 'Description must be under 240 characters'),
});

type WorkflowFormValues = z.infer<typeof workflowSchema>;

export function CreateWorkflowModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createWorkflow = useOrchestratorStore((s) => s.createWorkflow);
  const pushToast = useOrchestratorStore((s) => s.pushToast);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  if (!open) return null;

  const onSubmit = (values: WorkflowFormValues) => {
    const wf = createWorkflow(values);
    pushToast({
      type: 'success',
      title: 'Workflow created',
      description: `Opened "${wf.name}" in the visual flow builder.`,
    });
    reset();
    onClose();
    navigate(`/builder/${wf.id}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workflow-title"
    >
      <div className="w-full max-w-lg bg-white border border-[#E5E7EB] rounded-[12px] shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h2 id="create-workflow-title" className="text-[15px] font-semibold text-[#0F172A]">
                Create New Workflow
              </h2>
              <p className="text-[12px] text-[#64748B]">Initialize an orchestrated multi-agent pipeline</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="wf-name" className="block text-[13px] font-medium text-[#0F172A]">
              Workflow Name
            </label>
            <input
              id="wf-name"
              {...register('name')}
              placeholder="e.g., Customer Escalation Router"
              className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
            />
            {errors.name && (
              <p className="text-[12px] text-[#DC2626]">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="wf-desc" className="block text-[13px] font-medium text-[#0F172A]">
              Description
            </label>
            <textarea
              id="wf-desc"
              rows={3}
              {...register('description')}
              placeholder="Describe the inputs, agents, and downstream targets..."
              className="w-full p-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE] resize-none"
            />
            {errors.description && (
              <p className="text-[12px] text-[#DC2626]">{errors.description.message}</p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-[8px] bg-white border border-[#E5E7EB] text-[13px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              Create & Open Builder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
