import { zodResolver } from '@hookform/resolvers/zod';
import { Bot, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOrchestratorStore } from '../../store/useOrchestratorStore';
import type { AgentCategory, AgentDefinition, LlmProvider } from '../../types/orchestrator';

const agentSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters').max(80),
  description: z.string().trim().min(5, 'Description must be at least 5 characters').max(240),
  category: z.enum(['conversational', 'harness', 'tool-calling', 'orchestration']),
  provider: z.enum(['OpenAI', 'Azure OpenAI', 'Anthropic', 'Google Gemini', 'Ollama Local']),
  model: z.string().trim().min(2, 'Model identifier is required'),
  systemPrompt: z.string().trim().min(10, 'System instructions must be at least 10 characters'),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(128).max(32768),
});

type AgentFormValues = z.infer<typeof agentSchema>;

export function CreateAgentModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (agent: AgentDefinition) => void;
}) {
  const createAgent = useOrchestratorStore((s) => s.createAgent);
  const settings = useOrchestratorStore((s) => s.settings);
  const pushToast = useOrchestratorStore((s) => s.pushToast);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'tool-calling',
      provider: settings.defaultProvider,
      model: settings.defaultModel,
      systemPrompt:
        'You are a deterministic enterprise AI agent. Analyze the incoming payload, verify constraints, and output valid structured JSON.',
      temperature: 0.2,
      maxTokens: 2048,
    },
  });

  if (!open) return null;

  const onSubmit = (values: AgentFormValues) => {
    const created = createAgent({
      name: values.name,
      description: values.description,
      category: values.category as AgentCategory,
      status: 'online',
      systemPrompt: values.systemPrompt,
      provider: values.provider as LlmProvider,
      model: values.model,
      temperature: values.temperature,
      maxTokens: values.maxTokens,
      topP: 0.95,
      runtimeEngine: 'Semantic Kernel v1.14',
      tools: [
        {
          id: `tool_${Date.now()}`,
          name: 'SchemaRegistryMCP',
          description: 'Default JSON contract verification tool',
          type: 'mcp',
          enabled: true,
        },
      ],
      inputSchema: JSON.stringify({ type: 'object', properties: { input: { type: 'string' } } }, null, 2),
      outputSchema: JSON.stringify({ type: 'object', properties: { result: { type: 'string' } } }, null, 2),
      hitlRequireApproval: false,
      auditLogEnabled: true,
      timeoutSeconds: settings.defaultTimeoutSeconds,
      version: 'v1.0.0',
    });

    pushToast({
      type: 'success',
      title: 'Agent registered',
      description: `"${created.name}" is ready for workflow orchestration.`,
    });
    reset();
    onCreated?.(created);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white border border-[#E5E7EB] rounded-[12px] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-[#0F172A]">Create AI Agent</h2>
              <p className="text-[12px] text-[#64748B]">
                Configure model binding, system prompt, and execution parameters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#0F172A]">Agent Name</label>
              <input
                {...register('name')}
                placeholder="e.g., Contract Risk Reviewer"
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] text-[13px]"
              />
              {errors.name && <p className="text-[11px] text-[#DC2626]">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#0F172A]">Category</label>
              <select
                {...register('category')}
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px]"
              >
                <option value="tool-calling">Tool-Calling</option>
                <option value="conversational">Conversational</option>
                <option value="harness">Harness</option>
                <option value="orchestration">Orchestration</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[12px] font-medium text-[#0F172A]">Description</label>
            <input
              {...register('description')}
              placeholder="Concise summary of the agent's responsibilities..."
              className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] text-[13px]"
            />
            {errors.description && (
              <p className="text-[11px] text-[#DC2626]">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#0F172A]">LLM Provider</label>
              <select
                {...register('provider')}
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px]"
              >
                <option value="Azure OpenAI">Azure OpenAI</option>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Google Gemini">Google Gemini</option>
                <option value="Ollama Local">Ollama Local</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#0F172A]">Model</label>
              <input
                {...register('model')}
                placeholder="gpt-4o"
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[13px]"
              />
              {errors.model && <p className="text-[11px] text-[#DC2626]">{errors.model.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#0F172A]">Temperature</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                {...register('temperature', { valueAsNumber: true })}
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[13px]"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-[#0F172A]">Max Tokens</label>
              <input
                type="number"
                min="128"
                max="32768"
                {...register('maxTokens', { valueAsNumber: true })}
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[13px]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[12px] font-medium text-[#0F172A]">
              System Instructions
            </label>
            <textarea
              rows={4}
              {...register('systemPrompt')}
              className="w-full p-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#2563EB]"
            />
            {errors.systemPrompt && (
              <p className="text-[11px] text-[#DC2626]">{errors.systemPrompt.message}</p>
            )}
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-[8px] bg-white border border-[#E5E7EB] text-[13px] font-medium text-[#0F172A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold"
            >
              Create Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
