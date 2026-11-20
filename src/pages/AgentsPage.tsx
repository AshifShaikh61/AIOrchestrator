import {
  Bot,
  Copy,
  Download,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreateAgentModal } from '../components/agents/CreateAgentModal';
import { CodeEditor } from '../components/common/CodeEditor';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { runAgentPlaygroundTest } from '../services/executionEngine';
import { useOrchestratorStore } from '../store/useOrchestratorStore';
import type { AgentCategory, AgentDefinition, LlmProvider } from '../types/orchestrator';
import { downloadJsonFile, formatRelativeTime } from '../utils/formatters';

export function AgentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const agents = useOrchestratorStore((s) => s.agents);
  const executions = useOrchestratorStore((s) => s.executions);
  const workflows = useOrchestratorStore((s) => s.workflows);
  const updateAgent = useOrchestratorStore((s) => s.updateAgent);
  const duplicateAgent = useOrchestratorStore((s) => s.duplicateAgent);
  const deleteAgent = useOrchestratorStore((s) => s.deleteAgent);
  const incrementAgentRuns = useOrchestratorStore((s) => s.incrementAgentRuns);
  const pushToast = useOrchestratorStore((s) => s.pushToast);

  const [categoryFilter, setCategoryFilter] = useState<'all' | AgentCategory>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'runs' | 'latency' | 'name'>('recent');
  const [selectedId, setSelectedId] = useState<string>(
    searchParams.get('selected') ?? agents[0]?.id ?? ''
  );
  const [drawerTab, setDrawerTab] = useState<'config' | 'tools' | 'playground' | 'history'>('config');
  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === '1');
  const [deleteTarget, setDeleteTarget] = useState<AgentDefinition | null>(null);

  // Editable draft state for selected agent
  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedId) ?? null,
    [agents, selectedId]
  );

  const [draft, setDraft] = useState<AgentDefinition | null>(selectedAgent);
  const [newToolName, setNewToolName] = useState('');

  // Playground state
  const [testInput, setTestInput] = useState(
    JSON.stringify({ tenantId: 'tnt_acme', prompt: 'Validate schema & summarize top bottlenecks' }, null, 2)
  );
  const [testRunning, setTestRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<string>('');
  const [testLogs, setTestLogs] = useState<string[]>([]);

  useEffect(() => {
    const paramSel = searchParams.get('selected');
    if (paramSel && agents.some((a) => a.id === paramSel)) {
      setSelectedId(paramSel);
    }
    if (searchParams.get('create') === '1') {
      setCreateOpen(true);
    }
  }, [searchParams, agents]);

  useEffect(() => {
    setDraft(selectedAgent ? structuredClone(selectedAgent) : null);
    setTestOutput('');
    setTestLogs([]);
  }, [selectedAgent]);

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = agents.filter((a) => {
      const catMatch = categoryFilter === 'all' || a.category === categoryFilter;
      const qMatch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.provider.toLowerCase().includes(q);
      return catMatch && qMatch;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'runs') return b.totalRuns - a.totalRuns;
      if (sortBy === 'latency') return a.avgLatencyMs - b.avgLatencyMs;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [agents, categoryFilter, search, sortBy]);

  const handleSaveDraft = () => {
    if (!draft) return;
    updateAgent(draft.id, draft);
    pushToast({
      type: 'success',
      title: 'Agent configuration saved',
      description: `Updated "${draft.name}" (${draft.model}).`,
    });
  };

  const handleRunPlayground = async () => {
    if (!draft || testRunning) return;
    setTestRunning(true);
    try {
      const res = await runAgentPlaygroundTest(draft, testInput);
      setTestOutput(JSON.stringify(res.output, null, 2));
      setTestLogs(res.logs);
      incrementAgentRuns(draft.id);
    } finally {
      setTestRunning(false);
    }
  };

  const agentUsageWorkflows = useMemo(() => {
    if (!selectedAgent) return [];
    return workflows.filter((wf) =>
      wf.nodes.some((n) => n.data.config.agentId === selectedAgent.id)
    );
  }, [workflows, selectedAgent]);

  const agentHistoryRuns = useMemo(() => {
    if (!selectedAgent) return [];
    const wfIds = new Set(agentUsageWorkflows.map((w) => w.id));
    return executions.filter((ex) => wfIds.has(ex.workflowId)).slice(0, 6);
  }, [executions, agentUsageWorkflows, selectedAgent]);

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#0F172A]">
            AI Agents & Directory
          </h1>
          <p className="text-[14px] text-[#64748B] mt-1">
            Create, configure, test, and govern autonomous AI agents across workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              downloadJsonFile('robility-agents-catalog.json', agents);
              pushToast({ type: 'info', title: 'Exported agent catalog' });
            }}
            className="h-9 px-3.5 rounded-[8px] bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[13px] font-medium text-[#0F172A] flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-[#64748B]" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-9 px-4 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Agent</span>
          </button>
        </div>
      </div>

      {/* Filters & Search Strip */}
      <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E5E7EB] p-1 rounded-[8px] overflow-x-auto">
          {(
            [
              { id: 'all', label: `All (${agents.length})` },
              {
                id: 'tool-calling',
                label: `Tool-Calling (${agents.filter((a) => a.category === 'tool-calling').length})`,
              },
              {
                id: 'harness',
                label: `Harness (${agents.filter((a) => a.category === 'harness').length})`,
              },
              {
                id: 'conversational',
                label: `Conversational (${agents.filter((a) => a.category === 'conversational').length})`,
              },
              {
                id: 'orchestration',
                label: `Orchestration (${agents.filter((a) => a.category === 'orchestration').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1 rounded-[6px] text-[12px] font-medium whitespace-nowrap transition-colors ${
                categoryFilter === tab.id
                  ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search agents or models..."
              className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] text-[13px] focus:bg-white focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-9 px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[12px] font-medium text-[#0F172A]"
          >
            <option value="recent">Sort: Recently Updated</option>
            <option value="runs">Sort: Most Runs</option>
            <option value="latency">Sort: Lowest Latency</option>
            <option value="name">Sort: Name A-Z</option>
          </select>
        </div>
      </div>

      {/* Master-Detail Split: Agent Grid + Configuration Drawer */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Agent Cards Grid */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          {filteredAgents.length === 0 ? (
            <div className="md:col-span-2 bg-white border border-[#E5E7EB] rounded-[12px] p-12 text-center space-y-3">
              <Bot className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <p className="text-[14px] font-semibold text-[#0F172A]">No matching agents</p>
              <p className="text-[13px] text-[#64748B]">
                Clear search filters or register a new AI agent.
              </p>
            </div>
          ) : (
            filteredAgents.map((agent) => {
              const isSelected = selectedId === agent.id;
              return (
                <div
                  key={agent.id}
                  onClick={() => {
                    setSelectedId(agent.id);
                    setSearchParams({ selected: agent.id });
                  }}
                  className={`bg-white rounded-[12px] p-5 border transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] ${
                    isSelected
                      ? 'border-[#2563EB] ring-2 ring-[#DBEAFE]'
                      : 'border-[#E5E7EB] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-[8px] bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                          <Bot className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold text-[#0F172A] truncate">
                            {agent.name}
                          </h3>
                          <div className="text-[11px] font-mono text-[#64748B] truncate">
                            {agent.id} · {agent.version}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={agent.status} compact />
                    </div>

                    <p className="text-[13px] text-[#475569] line-clamp-2 leading-relaxed">
                      {agent.description}
                    </p>

                    <div className="p-2.5 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] space-y-1 text-[12px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-[#64748B]">{agent.provider}</span>
                        <span className="font-semibold text-[#0F172A]">{agent.model}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                        <span>{agent.tools.filter((t) => t.enabled).length} tools enabled</span>
                        <span className="tabular-nums">
                          ~{agent.avgLatencyMs}ms · {agent.totalRuns.toLocaleString()} runs
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const copy = duplicateAgent(agent.id);
                          if (copy) {
                            setSelectedId(copy.id);
                            pushToast({
                              type: 'success',
                              title: 'Agent duplicated',
                              description: `Created "${copy.name}".`,
                            });
                          }
                        }}
                        className="p-1.5 rounded-[6px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                        title="Duplicate agent"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(agent.id);
                          setDrawerTab('playground');
                        }}
                        className="p-1.5 rounded-[6px] text-[#64748B] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
                        title="Test in playground"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(agent)}
                        className="p-1.5 rounded-[6px] text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                        title="Delete agent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(agent.id);
                        setDrawerTab('config');
                      }}
                      className={`h-8 px-3 rounded-[8px] text-[12px] font-semibold transition-colors ${
                        isSelected
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-[#F8FAFC] border border-[#E5E7EB] text-[#0F172A] hover:bg-[#F1F5F9]'
                      }`}
                    >
                      {isSelected ? 'Configuring' : 'Configure'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Configuration Drawer */}
        {draft && (
          <aside className="w-full xl:w-[440px] shrink-0 bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] flex flex-col xl:sticky xl:top-20 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-[#0F172A] truncate">{draft.name}</h2>
                  <span className="text-[11px] font-mono text-[#64748B]">{draft.version}</span>
                </div>
                <p className="text-[11px] font-mono text-[#64748B] mt-0.5">
                  {draft.runtimeEngine} · Updated {formatRelativeTime(draft.updatedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId('')}
                className="p-1 rounded-[6px] text-[#64748B] hover:bg-white hover:text-[#0F172A]"
                aria-label="Close agent drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="px-4 pt-2 border-b border-[#E5E7EB] flex items-center gap-4 overflow-x-auto">
              {[
                { id: 'config', label: 'Configuration' },
                { id: 'tools', label: 'Tools & Schemas' },
                { id: 'playground', label: 'Test Playground' },
                { id: 'history', label: 'History' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDrawerTab(t.id as typeof drawerTab)}
                  className={`pb-2.5 text-[12px] font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    drawerTab === t.id
                      ? 'border-[#2563EB] text-[#2563EB]'
                      : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {drawerTab === 'config' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[12px] font-medium text-[#0F172A]">Agent Name</label>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] text-[13px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[12px] font-medium text-[#0F172A]">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                      className="w-full p-2.5 rounded-[8px] border border-[#E5E7EB] text-[13px] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[12px] font-medium text-[#0F172A]">Status</label>
                      <select
                        value={draft.status}
                        onChange={(e) =>
                          setDraft({ ...draft, status: e.target.value as AgentDefinition['status'] })
                        }
                        className="w-full h-9 px-2.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px]"
                      >
                        <option value="online">Online</option>
                        <option value="idle">Idle</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[12px] font-medium text-[#0F172A]">
                        Category
                      </label>
                      <select
                        value={draft.category}
                        onChange={(e) =>
                          setDraft({ ...draft, category: e.target.value as AgentCategory })
                        }
                        className="w-full h-9 px-2.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px]"
                      >
                        <option value="tool-calling">Tool-Calling</option>
                        <option value="harness">Harness</option>
                        <option value="conversational">Conversational</option>
                        <option value="orchestration">Orchestration</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[12px] font-medium text-[#0F172A]">
                        Provider
                      </label>
                      <select
                        value={draft.provider}
                        onChange={(e) =>
                          setDraft({ ...draft, provider: e.target.value as LlmProvider })
                        }
                        className="w-full h-9 px-2.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px]"
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
                        value={draft.model}
                        onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                        className="w-full h-9 px-2.5 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[12px] font-medium text-[#0F172A]">
                      System Prompt
                    </label>
                    <textarea
                      rows={4}
                      value={draft.systemPrompt}
                      onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
                      className="w-full p-2.5 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] font-mono text-[12px] focus:bg-white focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>

                  <div className="p-3 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] space-y-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-medium text-[#0F172A]">Temperature</span>
                      <span className="font-mono font-semibold text-[#2563EB]">
                        {draft.temperature.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={draft.temperature}
                      onChange={(e) =>
                        setDraft({ ...draft, temperature: parseFloat(e.target.value) })
                      }
                      className="w-full accent-[#2563EB]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[12px] font-medium text-[#0F172A]">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        value={draft.maxTokens}
                        onChange={(e) => setDraft({ ...draft, maxTokens: Number(e.target.value) })}
                        className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[12px] font-medium text-[#0F172A]">
                        Timeout (sec)
                      </label>
                      <input
                        type="number"
                        value={draft.timeoutSeconds}
                        onChange={(e) =>
                          setDraft({ ...draft, timeoutSeconds: Number(e.target.value) })
                        }
                        className="w-full h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                    <label className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] cursor-pointer">
                      <span className="text-[12px] font-medium text-[#0F172A]">
                        Require Human Approval (HITL)
                      </span>
                      <input
                        type="checkbox"
                        checked={draft.hitlRequireApproval}
                        onChange={(e) =>
                          setDraft({ ...draft, hitlRequireApproval: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#2563EB]"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] cursor-pointer">
                      <span className="text-[12px] font-medium text-[#0F172A]">
                        Stream Execution Trace to Audit Log
                      </span>
                      <input
                        type="checkbox"
                        checked={draft.auditLogEnabled}
                        onChange={(e) =>
                          setDraft({ ...draft, auditLogEnabled: e.target.checked })
                        }
                        className="w-4 h-4 accent-[#2563EB]"
                      />
                    </label>
                  </div>
                </>
              )}

              {drawerTab === 'tools' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-[12px] font-semibold text-[#0F172A]">
                      Attached Tools & MCP Plugins
                    </h4>
                    {draft.tools.map((tool) => (
                      <label
                        key={tool.id}
                        className="flex items-center justify-between p-2.5 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={tool.enabled}
                            onChange={(e) => {
                              const nextTools = draft.tools.map((t) =>
                                t.id === tool.id ? { ...t, enabled: e.target.checked } : t
                              );
                              setDraft({ ...draft, tools: nextTools });
                            }}
                            className="w-4 h-4 accent-[#2563EB]"
                          />
                          <div className="min-w-0">
                            <div className="text-[12px] font-mono font-semibold text-[#0F172A] truncate">
                              {tool.name}
                            </div>
                            <div className="text-[11px] text-[#64748B] truncate">
                              {tool.description}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-white border border-[#E5E7EB] text-[#475569] shrink-0">
                          {tool.type}
                        </span>
                      </label>
                    ))}

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newToolName}
                        onChange={(e) => setNewToolName(e.target.value)}
                        placeholder="Attach custom plugin or MCP tool..."
                        className="flex-1 h-9 px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[12px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newToolName.trim()) return;
                          setDraft({
                            ...draft,
                            tools: [
                              ...draft.tools,
                              {
                                id: `tool_${Date.now()}`,
                                name: newToolName.trim(),
                                description: 'Custom attached capability',
                                type: 'mcp',
                                enabled: true,
                              },
                            ],
                          });
                          setNewToolName('');
                        }}
                        className="h-9 px-3 rounded-[8px] bg-[#EFF6FF] text-[#2563EB] text-[12px] font-semibold flex items-center gap-1"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-[#E5E7EB]">
                    <label className="block text-[12px] font-semibold text-[#0F172A]">
                      Input JSON Schema
                    </label>
                    <CodeEditor
                      language="json"
                      height="130px"
                      value={draft.inputSchema}
                      onChange={(val) => setDraft({ ...draft, inputSchema: val })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[12px] font-semibold text-[#0F172A]">
                      Output JSON Schema
                    </label>
                    <CodeEditor
                      language="json"
                      height="130px"
                      value={draft.outputSchema}
                      onChange={(val) => setDraft({ ...draft, outputSchema: val })}
                    />
                  </div>
                </div>
              )}

              {drawerTab === 'playground' && (
                <div className="space-y-3">
                  <div className="p-2.5 rounded-[8px] bg-[#EFF6FF] border border-[#BFDBFE] text-[12px] text-[#1D4ED8]">
                    Simulated Agent Runner: exercises system prompt, model parameters, and enabled tools locally.
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[12px] font-semibold text-[#0F172A]">
                      Test Input Payload (JSON)
                    </label>
                    <CodeEditor
                      language="json"
                      height="130px"
                      value={testInput}
                      onChange={setTestInput}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleRunPlayground}
                    disabled={testRunning}
                    className="w-full h-9 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{testRunning ? 'Running Simulation...' : 'Run Agent Test'}</span>
                  </button>

                  {testOutput && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[12px] font-semibold text-[#0F172A]">Simulated Output</div>
                      <CodeEditor language="json" height="150px" readOnly value={testOutput} />
                      <div className="p-2.5 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] font-mono text-[11px] text-[#475569] space-y-1">
                        {testLogs.map((l, i) => (
                          <div key={i}>{l}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'history' && (
                <div className="space-y-3">
                  <div className="text-[12px] text-[#64748B]">
                    Used in {agentUsageWorkflows.length} workflow(s):{' '}
                    {agentUsageWorkflows.map((w) => w.name).join(', ') || 'None'}
                  </div>

                  {agentHistoryRuns.length === 0 ? (
                    <div className="py-8 text-center text-[13px] text-[#64748B]">
                      No recorded workflow executions for this agent yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {agentHistoryRuns.map((run) => (
                        <div
                          key={run.id}
                          className="p-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[12px] font-semibold text-[#0F172A] truncate">
                              {run.workflowName}
                            </div>
                            <div className="text-[11px] font-mono text-[#64748B]">
                              {run.id} · {formatRelativeTime(run.startedAt)}
                            </div>
                          </div>
                          <StatusBadge status={run.status} compact />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3.5 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(draft)}
                className="h-8 px-3 rounded-[8px] text-[#DC2626] hover:bg-[#FEE2E2] text-[12px] font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(selectedAgent ? structuredClone(selectedAgent) : null)}
                  className="h-8 px-3 rounded-[8px] bg-white border border-[#E5E7EB] text-[12px] font-medium text-[#0F172A]"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="h-8 px-3.5 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      <CreateAgentModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          if (searchParams.get('create')) {
            setSearchParams({});
          }
        }}
        onCreated={(ag) => setSelectedId(ag.id)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete AI Agent"
        description={`Remove "${deleteTarget?.name}" from the agent registry? Workflow nodes referencing this ID will retain their inline fallback configuration.`}
        confirmLabel="Delete Agent"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteAgent(deleteTarget.id);
            if (selectedId === deleteTarget.id) {
              setSelectedId('');
            }
            pushToast({
              type: 'info',
              title: 'Agent deleted',
              description: `"${deleteTarget.name}" removed from directory.`,
            });
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
