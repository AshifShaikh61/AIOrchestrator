import axios from 'axios';
import {
  DEFAULT_SETTINGS,
  SEED_AGENTS,
  SEED_EXECUTIONS,
  SEED_SCHEDULES,
  SEED_WORKFLOWS,
} from '../data/mockData';
import type {
  AgentDefinition,
  ScheduleDefinition,
  WorkflowDefinition,
  WorkflowExecution,
  WorkspaceSettings,
} from '../types/orchestrator';

const STORAGE_KEYS = {
  agents: 'robility_orchestrator_v1_agents',
  workflows: 'robility_orchestrator_v1_workflows',
  executions: 'robility_orchestrator_v1_executions',
  schedules: 'robility_orchestrator_v1_schedules',
  settings: 'robility_orchestrator_v1_settings',
} as const;

const LEGACY_KEYS: Record<string, string> = {
  [STORAGE_KEYS.agents]: 'wopla_orchestrator_v1_agents',
  [STORAGE_KEYS.workflows]: 'wopla_orchestrator_v1_workflows',
  [STORAGE_KEYS.executions]: 'wopla_orchestrator_v1_executions',
  [STORAGE_KEYS.schedules]: 'wopla_orchestrator_v1_schedules',
  [STORAGE_KEYS.settings]: 'wopla_orchestrator_v1_settings',
};

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function readFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw =
      window.localStorage.getItem(key) ??
      (LEGACY_KEYS[key] ? window.localStorage.getItem(LEGACY_KEYS[key]) : null);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeToStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to persist ${key} to localStorage:`, err);
  }
}

export const persistenceService = {
  loadAgents(): AgentDefinition[] {
    return readFromStorage<AgentDefinition[]>(STORAGE_KEYS.agents, SEED_AGENTS);
  },
  saveAgents(agents: AgentDefinition[]): void {
    writeToStorage(STORAGE_KEYS.agents, agents);
  },

  loadWorkflows(): WorkflowDefinition[] {
    return readFromStorage<WorkflowDefinition[]>(STORAGE_KEYS.workflows, SEED_WORKFLOWS);
  },
  saveWorkflows(workflows: WorkflowDefinition[]): void {
    writeToStorage(STORAGE_KEYS.workflows, workflows);
  },

  loadExecutions(): WorkflowExecution[] {
    return readFromStorage<WorkflowExecution[]>(STORAGE_KEYS.executions, SEED_EXECUTIONS);
  },
  saveExecutions(executions: WorkflowExecution[]): void {
    writeToStorage(STORAGE_KEYS.executions, executions);
  },

  loadSchedules(): ScheduleDefinition[] {
    return readFromStorage<ScheduleDefinition[]>(STORAGE_KEYS.schedules, SEED_SCHEDULES);
  },
  saveSchedules(schedules: ScheduleDefinition[]): void {
    writeToStorage(STORAGE_KEYS.schedules, schedules);
  },

  loadSettings(): WorkspaceSettings {
    return readFromStorage<WorkspaceSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  },
  saveSettings(settings: WorkspaceSettings): void {
    writeToStorage(STORAGE_KEYS.settings, settings);
  },

  resetAll(): {
    agents: AgentDefinition[];
    workflows: WorkflowDefinition[];
    executions: WorkflowExecution[];
    schedules: ScheduleDefinition[];
    settings: WorkspaceSettings;
  } {
    writeToStorage(STORAGE_KEYS.agents, SEED_AGENTS);
    writeToStorage(STORAGE_KEYS.workflows, SEED_WORKFLOWS);
    writeToStorage(STORAGE_KEYS.executions, SEED_EXECUTIONS);
    writeToStorage(STORAGE_KEYS.schedules, SEED_SCHEDULES);
    writeToStorage(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
    return {
      agents: SEED_AGENTS,
      workflows: SEED_WORKFLOWS,
      executions: SEED_EXECUTIONS,
      schedules: SEED_SCHEDULES,
      settings: DEFAULT_SETTINGS,
    };
  },
};
