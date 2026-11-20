import { Copy, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { NODE_CATALOG_MAP } from '../../constants/nodeCatalog';
import { useOrchestratorStore } from '../../store/useOrchestratorStore';
import type {
  ComparisonOperator,
  HttpMethod,
  LlmProvider,
  WorkflowNode,
  WorkflowNodeConfig,
  WorkflowNodeData,
} from '../../types/orchestrator';
import { formatDuration } from '../../utils/formatters';
import { CodeEditor } from '../common/CodeEditor';
import { NodeIcon } from '../common/NodeIcon';
import { StatusBadge } from '../common/StatusBadge';

interface NodeInspectorPanelProps {
  node: WorkflowNode | null;
  onClose: () => void;
  onChangeNodeData: (nodeId: string, patch: Partial<WorkflowNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
}

const PROVIDERS: LlmProvider[] = [
  'Azure OpenAI',
  'OpenAI',
  'Anthropic',
  'Google Gemini',
  'Ollama Local',
];

const MODELS_BY_PROVIDER: Record<LlmProvider, string[]> = {
  'Azure OpenAI': ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
  OpenAI: ['gpt-4o', 'gpt-4.1', 'o3-mini'],
  Anthropic: ['claude-3-5-sonnet', 'claude-3-7-sonnet', 'claude-3-5-haiku'],
  'Google Gemini': ['gemini-2.5-pro', 'gemini-2.5-flash'],
  'Ollama Local': ['llama-3.3-70b', 'qwen-2.5-coder-32b'],
};

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const OPERATORS: Array<{ value: ComparisonOperator; label: string }> = [
  { value: 'equals', label: 'Equals (==)' },
  { value: 'not_equals', label: 'Not Equals (!=)' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'regex', label: 'Matches Regex' },
];

export function NodeInspectorPanel({
  node,
  onClose,
  onChangeNodeData,
  onDeleteNode,
  onDuplicateNode,
}: NodeInspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'execution'>('config');
  const agents = useOrchestratorStore((s) => s.agents);

  if (!node) return null;

  const { data } = node;
  const meta = NODE_CATALOG_MAP[data.nodeType];

  const updateConfig = (cfgPatch: Partial<WorkflowNodeConfig>) => {
    onChangeNodeData(node.id, {
      config: { ...data.config, ...cfgPatch },
    });
  };

  const handleLinkAgent = (agentId: string) => {
    const found = agents.find((a) => a.id === agentId);
    if (!found) {
      updateConfig({ agentId: '' });
      return;
    }
    onChangeNodeData(node.id, {
      label: found.name,
      description: found.description,
      config: {
        ...data.config,
        agentId: found.id,
        agentName: found.name,
        systemInstructions: found.systemPrompt,
        llmProvider: found.provider,
        model: found.model,
        temperature: found.temperature,
        maxTokens: found.maxTokens,
        availableTools: found.tools.filter((t) => t.enabled).map((t) => t.name),
        timeoutSeconds: found.timeoutSeconds,
      },
    });
  };

  const isAiNode =
    data.nodeType === 'ai_agent' ||
    data.nodeType === 'llm' ||
    data.nodeType === 'multi_agent' ||
    data.nodeType === 'supervisor_agent';

  const isHttpNode =
    data.nodeType === 'api_request' ||
    data.nodeType === 'http_request' ||
    data.nodeType === 'webhook';

  const isConditionNode =
    data.nodeType === 'condition' ||
    data.nodeType === 'switch' ||
    data.nodeType === 'router';

  const isCodeNode =
    data.nodeType === 'code_execution' ||
    data.nodeType === 'transform' ||
    data.nodeType === 'data_mapper' ||
    data.nodeType === 'json_parser';

  const currentProvider: LlmProvider = data.config.llmProvider ?? 'Azure OpenAI';
  const availableModels = MODELS_BY_PROVIDER[currentProvider] ?? ['gpt-4o'];

  return (
    <aside className="w-full sm:w-[380px] bg-white border-l border-[#E5E7EB] flex flex-col h-full shrink-0 z-20">
      {/* Inspector Header */}
      <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${meta?.accentColor ?? '#2563EB'}15`,
              color: meta?.accentColor ?? '#2563EB',
            }}
          >
            <NodeIcon name={meta?.iconName ?? 'Bot'} className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-[#0F172A] truncate">{data.label}</h3>
            <p className="text-[11px] font-mono text-[#64748B] truncate">
              {node.id} · {meta?.label ?? data.nodeType}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          aria-label="Close inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-2 border-b border-[#E5E7EB] flex items-center gap-4 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`pb-2 text-[12px] font-semibold border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Configuration
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('execution')}
          className={`pb-2 text-[12px] font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'execution'
              ? 'border-[#2563EB] text-[#2563EB]'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <span>Execution Output</span>
          <StatusBadge status={data.executionStatus} compact />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'config' ? (
          <>
            {/* General Identity */}
            <section className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-[#0F172A]">Node Label</label>
                <input
                  type="text"
                  value={data.label}
                  onChange={(e) => onChangeNodeData(node.id, { label: e.target.value })}
                  className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[12px] font-medium text-[#0F172A]">Description</label>
                <textarea
                  rows={2}
                  value={data.description}
                  onChange={(e) => onChangeNodeData(node.id, { description: e.target.value })}
                  className="w-full p-2.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#DBEAFE] resize-none"
                />
              </div>
            </section>

            {/* Start / Trigger */}
            {data.nodeType === 'start' && (
              <section className="space-y-3 pt-3 border-t border-[#E5E7EB]">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Trigger Settings
                </h4>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Trigger Type</label>
                  <select
                    value={data.config.triggerType ?? 'manual'}
                    onChange={(e) =>
                      updateConfig({
                        triggerType: e.target.value as WorkflowNodeConfig['triggerType'],
                      })
                    }
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="manual">Manual</option>
                    <option value="webhook">Webhook</option>
                    <option value="cron">CRON Schedule</option>
                    <option value="event">Event Grid</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">
                    Initial Input Payload (JSON)
                  </label>
                  <CodeEditor
                    language="json"
                    height="150px"
                    value={data.config.samplePayload ?? '{}'}
                    onChange={(val) => updateConfig({ samplePayload: val })}
                  />
                </div>
              </section>
            )}

            {/* Variable / Set Variable */}
            {(data.nodeType === 'variable' || data.nodeType === 'set_variable') && (
              <section className="space-y-3 pt-3 border-t border-[#E5E7EB]">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Variable Definition
                </h4>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Variable Name</label>
                  <input
                    type="text"
                    value={data.config.variableName ?? ''}
                    onChange={(e) => updateConfig({ variableName: e.target.value })}
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px] text-[#0F172A]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Value</label>
                  <input
                    type="text"
                    value={data.config.variableValue ?? ''}
                    onChange={(e) => updateConfig({ variableValue: e.target.value })}
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px] text-[#0F172A]"
                  />
                </div>
              </section>
            )}

            {/* AI Agent / LLM Configuration */}
            {isAiNode && (
              <section className="space-y-3 pt-3 border-t border-[#E5E7EB]">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  AI & Model Configuration
                </h4>

                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">
                    Link Configured Agent
                  </label>
                  <select
                    value={data.config.agentId ?? ''}
                    onChange={(e) => handleLinkAgent(e.target.value)}
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="">Custom inline agent configuration</option>
                    {agents.map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.model})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[12px] font-medium text-[#0F172A]">Provider</label>
                    <select
                      value={currentProvider}
                      onChange={(e) => {
                        const prov = e.target.value as LlmProvider;
                        updateConfig({
                          llmProvider: prov,
                          model: MODELS_BY_PROVIDER[prov][0],
                        });
                      }}
                      className="w-full h-9 px-2.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[12px] text-[#0F172A]"
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[12px] font-medium text-[#0F172A]">Model</label>
                    <select
                      value={data.config.model ?? availableModels[0]}
                      onChange={(e) => updateConfig({ model: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-[8px] border border-[#E5E7EB] bg-white font-mono text-[12px] text-[#0F172A]"
                    >
                      {availableModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">
                    System Instructions
                  </label>
                  <textarea
                    rows={4}
                    value={data.config.systemInstructions ?? ''}
                    onChange={(e) => updateConfig({ systemInstructions: e.target.value })}
                    className="w-full p-2.5 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] font-mono text-[12px] text-[#0F172A] focus:bg-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div className="p-3 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-[#0F172A]">Temperature</span>
                    <span className="font-mono font-semibold text-[#2563EB]">
                      {(data.config.temperature ?? 0.2).toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={data.config.temperature ?? 0.2}
                    onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
                    className="w-full accent-[#2563EB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Max Tokens</label>
                  <input
                    type="number"
                    min={128}
                    max={32768}
                    value={data.config.maxTokens ?? 2048}
                    onChange={(e) => updateConfig({ maxTokens: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px] text-[#0F172A]"
                  />
                </div>
              </section>
            )}

            {/* API / HTTP / Webhook */}
            {isHttpNode && (
              <section className="space-y-3 pt-3 border-t border-[#E5E7EB]">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  HTTP Request Settings
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[12px] font-medium text-[#0F172A]">Method</label>
                    <select
                      value={data.config.httpMethod ?? 'GET'}
                      onChange={(e) => updateConfig({ httpMethod: e.target.value as HttpMethod })}
                      className="w-full h-9 px-2 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px] text-[#0F172A]"
                    >
                      {HTTP_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="block text-[12px] font-medium text-[#0F172A]">Endpoint URL</label>
                    <input
                      type="text"
                      value={data.config.endpointUrl ?? ''}
                      onChange={(e) => updateConfig({ endpointUrl: e.target.value })}
                      placeholder="https://api.example.com/v1/..."
                      className="w-full h-9 px-2.5 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px] text-[#0F172A]"
                    />
                  </div>
                </div>

                {/* Headers Editor */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-medium text-[#0F172A]">Headers</label>
                    <button
                      type="button"
                      onClick={() =>
                        updateConfig({
                          headers: [...(data.config.headers ?? []), { key: '', value: '' }],
                        })
                      }
                      className="text-[11px] font-semibold text-[#2563EB] hover:underline flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Add Header
                    </button>
                  </div>
                  {(data.config.headers ?? []).map((hdr, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        placeholder="Header"
                        value={hdr.key}
                        onChange={(e) => {
                          const next = [...(data.config.headers ?? [])];
                          next[idx] = { ...next[idx], key: e.target.value };
                          updateConfig({ headers: next });
                        }}
                        className="w-1/2 h-8 px-2 rounded-[6px] border border-[#E5E7EB] font-mono text-[11px]"
                      />
                      <input
                        placeholder="Value"
                        value={hdr.value}
                        onChange={(e) => {
                          const next = [...(data.config.headers ?? [])];
                          next[idx] = { ...next[idx], value: e.target.value };
                          updateConfig({ headers: next });
                        }}
                        className="w-1/2 h-8 px-2 rounded-[6px] border border-[#E5E7EB] font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = (data.config.headers ?? []).filter((_, i) => i !== idx);
                          updateConfig({ headers: next });
                        }}
                        className="p-1 text-[#64748B] hover:text-[#DC2626]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {data.config.httpMethod !== 'GET' && (
                  <div className="space-y-1">
                    <label className="block text-[12px] font-medium text-[#0F172A]">
                      Request Body (JSON)
                    </label>
                    <CodeEditor
                      language="json"
                      height="130px"
                      value={data.config.requestBody ?? '{}'}
                      onChange={(val) => updateConfig({ requestBody: val })}
                    />
                  </div>
                )}
              </section>
            )}

            {/* Condition / Router */}
            {isConditionNode && (
              <section className="space-y-3 pt-3 border-t border-[#E5E7EB]">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Branching Rule
                </h4>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Input Variable</label>
                  <input
                    type="text"
                    value={data.config.inputVariable ?? 'confidence'}
                    onChange={(e) => updateConfig({ inputVariable: e.target.value })}
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Operator</label>
                  <select
                    value={data.config.operator ?? 'greater_than'}
                    onChange={(e) =>
                      updateConfig({ operator: e.target.value as ComparisonOperator })
                    }
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px]"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">
                    Comparison Value
                  </label>
                  <input
                    type="text"
                    value={data.config.comparisonValue ?? ''}
                    onChange={(e) => updateConfig({ comparisonValue: e.target.value })}
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px]"
                  />
                </div>
              </section>
            )}

            {/* Database Query */}
            {data.nodeType === 'database_query' && (
              <section className="space-y-3 pt-3 border-t border-[#E5E7EB]">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Database Query
                </h4>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Connection</label>
                  <select
                    value={data.config.dbConnection ?? 'postgres-prod-replica'}
                    onChange={(e) => updateConfig({ dbConnection: e.target.value })}
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px]"
                  >
                    <option value="postgres-prod-replica">postgres-prod-replica</option>
                    <option value="sqlserver-analytics-ro">sqlserver-analytics-ro</option>
                    <option value="qdrant-vector-cache">qdrant-vector-cache</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">SQL Query</label>
                  <CodeEditor
                    language="sql"
                    height="150px"
                    value={data.config.sqlQuery ?? ''}
                    onChange={(val) => updateConfig({ sqlQuery: val })}
                  />
                </div>
              </section>
            )}

            {/* Code Execution / Data Mapping */}
            {isCodeNode && (
              <section className="space-y-3 pt-3 border-t border-[#E5E7EB]">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                  Data & Script Logic
                </h4>
                <CodeEditor
                  language={
                    data.nodeType === 'json_parser' || data.nodeType === 'data_mapper'
                      ? 'json'
                      : 'typescript'
                  }
                  height="190px"
                  value={
                    data.config.code ??
                    data.config.mappingExpression ??
                    data.config.jsonSchema ??
                    ''
                  }
                  onChange={(val) => {
                    if (data.nodeType === 'json_parser') updateConfig({ jsonSchema: val });
                    else if (data.nodeType === 'data_mapper')
                      updateConfig({ mappingExpression: val });
                    else updateConfig({ code: val });
                  }}
                />
              </section>
            )}

            {/* Reliability / Timeout */}
            <section className="space-y-3 pt-3 border-t border-[#E5E7EB]">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Execution Policy
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">
                    Timeout (sec)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={3600}
                    value={data.config.timeoutSeconds ?? 30}
                    onChange={(e) => updateConfig({ timeoutSeconds: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[12px] font-medium text-[#0F172A]">
                    Max Retries
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={data.config.retryCount ?? 0}
                    onChange={(e) => updateConfig({ retryCount: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px]"
                  />
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#64748B]">Last Status</span>
              <div className="flex items-center gap-2">
                {typeof data.lastDurationMs === 'number' && (
                  <span className="text-[11px] font-mono text-[#64748B]">
                    {formatDuration(data.lastDurationMs)}
                  </span>
                )}
                <StatusBadge status={data.executionStatus} compact />
              </div>
            </div>

            {data.lastError && (
              <div className="p-3 rounded-[8px] bg-[#FEE2E2] border border-[#FECACA] text-[12px] font-mono text-[#DC2626]">
                {data.lastError}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="text-[12px] font-semibold text-[#0F172A]">Captured Input</div>
              <CodeEditor
                language="json"
                height="150px"
                readOnly
                value={JSON.stringify(data.lastInput ?? { info: 'Run workflow to inspect input' }, null, 2)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-[12px] font-semibold text-[#0F172A]">Captured Output</div>
              <CodeEditor
                language="json"
                height="180px"
                readOnly
                value={JSON.stringify(data.lastOutput ?? { info: 'Run workflow to inspect output' }, null, 2)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onDuplicateNode(node.id)}
          className="h-8 px-3 rounded-[8px] bg-white border border-[#E5E7EB] hover:bg-[#F1F5F9] text-[12px] font-medium text-[#0F172A] flex items-center gap-1.5 transition-colors"
        >
          <Copy className="w-3.5 h-3.5 text-[#64748B]" />
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => onDeleteNode(node.id)}
          className="h-8 px-3 rounded-[8px] bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] text-[12px] font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Node
        </button>
      </div>
    </aside>
  );
}
