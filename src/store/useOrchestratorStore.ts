import { create } from 'zustand';
import { persistenceService } from '../services/persistenceService';
import type {
  AgentDefinition,
  ExecutionLogEntry,
  NodeExecutionRecord,
  ScheduleDefinition,
  ToastMessage,
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowExecution,
  WorkflowNode,
  WorkspaceSettings,
} from '../types/orchestrator';

interface OrchestratorState {
  agents: AgentDefinition[];
  workflows: WorkflowDefinition[];
  executions: WorkflowExecution[];
  schedules: ScheduleDefinition[];
  settings: WorkspaceSettings;

  activeWorkflowId: string;
  activeExecutionId: string | null;
  commandPaletteOpen: boolean;
  toasts: ToastMessage[];

  // Toast helpers
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;

  // Agent CRUD
  createAgent: (agent: Omit<AgentDefinition, 'id' | 'createdAt' | 'updatedAt' | 'totalRuns' | 'avgLatencyMs'>) => AgentDefinition;
  updateAgent: (id: string, patch: Partial<AgentDefinition>) => void;
  duplicateAgent: (id: string) => AgentDefinition | null;
  deleteAgent: (id: string) => void;
  incrementAgentRuns: (id: string) => void;

  // Workflow CRUD
  setActiveWorkflowId: (id: string) => void;
  createWorkflow: (payload: { name: string; description: string }) => WorkflowDefinition;
  updateWorkflow: (id: string, patch: Partial<WorkflowDefinition>) => void;
  saveWorkflowGraph: (id: string, nodes: WorkflowNode[], edges: WorkflowEdge[], versionNote?: string) => void;
  restoreWorkflowVersion: (workflowId: string, version: string) => void;
  duplicateWorkflow: (id: string) => WorkflowDefinition | null;
  deleteWorkflow: (id: string) => void;
  togglePinWorkflow: (id: string) => void;

  // Executions
  setActiveExecutionId: (id: string | null) => void;
  addExecution: (exec: WorkflowExecution) => void;
  updateExecution: (id: string, patch: Partial<WorkflowExecution>) => void;
  appendExecutionLog: (executionId: string, log: ExecutionLogEntry) => void;
  upsertExecutionNodeRecord: (executionId: string, record: NodeExecutionRecord) => void;
  clearExecutionLogs: (executionId: string) => void;

  // Schedules
  createSchedule: (payload: Omit<ScheduleDefinition, 'id' | 'createdAt' | 'nextRunAt'>) => ScheduleDefinition;
  toggleSchedule: (id: string) => void;
  deleteSchedule: (id: string) => void;
  markScheduleTriggered: (id: string, status: WorkflowExecution['status']) => void;

  // Settings & Workspace
  updateSettings: (patch: Partial<WorkspaceSettings>) => void;
  resetWorkspaceData: () => void;
}

const initialAgents = persistenceService.loadAgents();
const initialWorkflows = persistenceService.loadWorkflows();
const initialExecutions = persistenceService.loadExecutions();
const initialSchedules = persistenceService.loadSchedules();
const initialSettings = persistenceService.loadSettings();

export const useOrchestratorStore = create<OrchestratorState>((set, get) => ({
  agents: initialAgents,
  workflows: initialWorkflows,
  executions: initialExecutions,
  schedules: initialSchedules,
  settings: initialSettings,

  activeWorkflowId: initialWorkflows[0]?.id ?? '',
  activeExecutionId: initialExecutions[0]?.id ?? null,
  commandPaletteOpen: false,
  toasts: [],

  pushToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      get().dismissToast(id);
    }, 4000);
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  createAgent: (payload) => {
    const now = new Date().toISOString();
    const newAgent: AgentDefinition = {
      ...payload,
      id: `agt_${Math.random().toString(36).slice(2, 8)}`,
      avgLatencyMs: 160,
      totalRuns: 0,
      createdAt: now,
      updatedAt: now,
    };
    const next = [newAgent, ...get().agents];
    persistenceService.saveAgents(next);
    set({ agents: next });
    return newAgent;
  },

  updateAgent: (id, patch) => {
    const next = get().agents.map((a) =>
      a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
    );
    persistenceService.saveAgents(next);
    set({ agents: next });
  },

  duplicateAgent: (id) => {
    const src = get().agents.find((a) => a.id === id);
    if (!src) return null;
    const now = new Date().toISOString();
    const copy: AgentDefinition = {
      ...src,
      id: `agt_${Math.random().toString(36).slice(2, 8)}`,
      name: `${src.name} (Copy)`,
      totalRuns: 0,
      version: 'v1.0.0',
      createdAt: now,
      updatedAt: now,
    };
    const next = [copy, ...get().agents];
    persistenceService.saveAgents(next);
    set({ agents: next });
    return copy;
  },

  deleteAgent: (id) => {
    const next = get().agents.filter((a) => a.id !== id);
    persistenceService.saveAgents(next);
    set({ agents: next });
  },

  incrementAgentRuns: (id) => {
    const next = get().agents.map((a) =>
      a.id === id ? { ...a, totalRuns: a.totalRuns + 1, updatedAt: new Date().toISOString() } : a
    );
    persistenceService.saveAgents(next);
    set({ agents: next });
  },

  setActiveWorkflowId: (id) => set({ activeWorkflowId: id }),

  createWorkflow: ({ name, description }) => {
    const now = new Date().toISOString();
    const id = `wf_${Math.random().toString(36).slice(2, 8)}`;
    const newWf: WorkflowDefinition = {
      id,
      name,
      description,
      status: 'draft',
      pinned: false,
      version: 'v1.0.0',
      versions: [],
      inputSchema: JSON.stringify({ type: 'object', properties: { input: { type: 'string' } } }, null, 2),
      outputSchema: JSON.stringify({ type: 'object', properties: { result: { type: 'object' } } }, null, 2),
      executionSettings: {
        maxConcurrency: 4,
        globalTimeoutSeconds: 300,
        onErrorPolicy: 'stop',
        enableCheckpointing: true,
      },
      nodes: [
        {
          id: `n_start_${Date.now()}`,
          type: 'workflowNode',
          position: { x: 140, y: 200 },
          data: {
            label: 'Manual Trigger',
            nodeType: 'start',
            category: 'core',
            description: 'Workflow entry point',
            executionStatus: 'idle',
            inputDefinitions: [],
            outputDefinitions: [{ name: 'payload', type: 'object' }],
            config: {
              triggerType: 'manual',
              samplePayload: JSON.stringify({ requestId: 'req_01', payload: 'sample' }, null, 2),
            },
          },
        },
        {
          id: `n_end_${Date.now() + 1}`,
          type: 'workflowNode',
          position: { x: 520, y: 200 },
          data: {
            label: 'Workflow Output',
            nodeType: 'end',
            category: 'core',
            description: 'Terminates execution',
            executionStatus: 'idle',
            inputDefinitions: [{ name: 'result', type: 'object' }],
            outputDefinitions: [],
            config: {},
          },
        },
      ],
      edges: [],
      createdAt: now,
      updatedAt: now,
    };
    const next = [newWf, ...get().workflows];
    persistenceService.saveWorkflows(next);
    set({ workflows: next, activeWorkflowId: newWf.id });
    return newWf;
  },

  updateWorkflow: (id, patch) => {
    const next = get().workflows.map((w) =>
      w.id === id ? { ...w, ...patch, updatedAt: new Date().toISOString() } : w
    );
    persistenceService.saveWorkflows(next);
    set({ workflows: next });
  },

  saveWorkflowGraph: (id, nodes, edges, versionNote) => {
    const now = new Date().toISOString();
    const next = get().workflows.map((w) => {
      if (w.id !== id) return w;
      if (versionNote) {
        const parts = w.version.replace('v', '').split('.').map(Number);
        const nextVer = `v${parts[0] || 1}.${parts[1] || 0}.${(parts[2] || 0) + 1}`;
        const snapshot = {
          version: w.version,
          savedAt: now,
          note: versionNote,
          nodes: structuredClone(w.nodes),
          edges: structuredClone(w.edges),
        };
        return {
          ...w,
          nodes,
          edges,
          version: nextVer,
          versions: [snapshot, ...w.versions].slice(0, 15),
          updatedAt: now,
        };
      }
      return { ...w, nodes, edges, updatedAt: now };
    });
    persistenceService.saveWorkflows(next);
    set({ workflows: next });
  },

  restoreWorkflowVersion: (workflowId, version) => {
    const next = get().workflows.map((w) => {
      if (w.id !== workflowId) return w;
      const snap = w.versions.find((v) => v.version === version);
      if (!snap || snap.nodes.length === 0) return w;
      return {
        ...w,
        nodes: structuredClone(snap.nodes),
        edges: structuredClone(snap.edges),
        updatedAt: new Date().toISOString(),
      };
    });
    persistenceService.saveWorkflows(next);
    set({ workflows: next });
  },

  duplicateWorkflow: (id) => {
    const src = get().workflows.find((w) => w.id === id);
    if (!src) return null;
    const now = new Date().toISOString();
    const copy: WorkflowDefinition = {
      ...structuredClone(src),
      id: `wf_${Math.random().toString(36).slice(2, 8)}`,
      name: `${src.name} (Copy)`,
      status: 'draft',
      pinned: false,
      version: 'v1.0.0',
      versions: [],
      createdAt: now,
      updatedAt: now,
    };
    const next = [copy, ...get().workflows];
    persistenceService.saveWorkflows(next);
    set({ workflows: next });
    return copy;
  },

  deleteWorkflow: (id) => {
    const next = get().workflows.filter((w) => w.id !== id);
    persistenceService.saveWorkflows(next);
    set((s) => ({
      workflows: next,
      activeWorkflowId: s.activeWorkflowId === id ? next[0]?.id ?? '' : s.activeWorkflowId,
    }));
  },

  togglePinWorkflow: (id) => {
    const next = get().workflows.map((w) =>
      w.id === id ? { ...w, pinned: !w.pinned } : w
    );
    persistenceService.saveWorkflows(next);
    set({ workflows: next });
  },

  setActiveExecutionId: (id) => set({ activeExecutionId: id }),

  addExecution: (exec) => {
    const next = [exec, ...get().executions].slice(0, 50);
    persistenceService.saveExecutions(next);
    set({ executions: next, activeExecutionId: exec.id });
  },

  updateExecution: (id, patch) => {
    const next = get().executions.map((e) => (e.id === id ? { ...e, ...patch } : e));
    persistenceService.saveExecutions(next);
    set({ executions: next });
  },

  appendExecutionLog: (executionId, log) => {
    const next = get().executions.map((e) =>
      e.id === executionId ? { ...e, logs: [...e.logs, log] } : e
    );
    persistenceService.saveExecutions(next);
    set({ executions: next });
  },

  upsertExecutionNodeRecord: (executionId, record) => {
    const next = get().executions.map((e) => {
      if (e.id !== executionId) return e;
      const exists = e.nodeExecutions.some((r) => r.nodeId === record.nodeId);
      const nodeExecutions = exists
        ? e.nodeExecutions.map((r) => (r.nodeId === record.nodeId ? record : r))
        : [...e.nodeExecutions, record];
      return { ...e, nodeExecutions };
    });
    persistenceService.saveExecutions(next);
    set({ executions: next });
  },

  clearExecutionLogs: (executionId) => {
    const next = get().executions.map((e) => (e.id === executionId ? { ...e, logs: [] } : e));
    persistenceService.saveExecutions(next);
    set({ executions: next });
  },

  createSchedule: (payload) => {
    const newSched: ScheduleDefinition = {
      ...payload,
      id: `sch_${Math.random().toString(36).slice(2, 8)}`,
      nextRunAt: new Date(Date.now() + 3600_000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    const next = [newSched, ...get().schedules];
    persistenceService.saveSchedules(next);
    set({ schedules: next });
    return newSched;
  },

  toggleSchedule: (id) => {
    const next = get().schedules.map((sc) =>
      sc.id === id ? { ...sc, enabled: !sc.enabled } : sc
    );
    persistenceService.saveSchedules(next);
    set({ schedules: next });
  },

  deleteSchedule: (id) => {
    const next = get().schedules.filter((sc) => sc.id !== id);
    persistenceService.saveSchedules(next);
    set({ schedules: next });
  },

  markScheduleTriggered: (id, status) => {
    const now = new Date().toISOString();
    const next = get().schedules.map((sc) =>
      sc.id === id
        ? { ...sc, lastRunAt: now, lastStatus: status, nextRunAt: new Date(Date.now() + 3600_000).toISOString() }
        : sc
    );
    persistenceService.saveSchedules(next);
    set({ schedules: next });
  },

  updateSettings: (patch) => {
    const next = { ...get().settings, ...patch };
    persistenceService.saveSettings(next);
    set({ settings: next });
  },

  resetWorkspaceData: () => {
    const reset = persistenceService.resetAll();
    set({
      agents: reset.agents,
      workflows: reset.workflows,
      executions: reset.executions,
      schedules: reset.schedules,
      settings: reset.settings,
      activeWorkflowId: reset.workflows[0]?.id ?? '',
      activeExecutionId: reset.executions[0]?.id ?? null,
    });
  },
}));
