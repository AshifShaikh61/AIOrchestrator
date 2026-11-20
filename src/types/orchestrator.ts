import type { Edge, Node } from '@xyflow/react';

export type NodeCategory = 'core' | 'ai' | 'tool' | 'logic' | 'data';

export type NodeTypeId =
  | 'start'
  | 'end'
  | 'input'
  | 'output'
  | 'variable'
  | 'set_variable'
  | 'ai_agent'
  | 'llm'
  | 'multi_agent'
  | 'supervisor_agent'
  | 'agent_handoff'
  | 'api_request'
  | 'http_request'
  | 'database_query'
  | 'webhook'
  | 'external_tool'
  | 'custom_tool'
  | 'condition'
  | 'switch'
  | 'router'
  | 'loop'
  | 'iterator'
  | 'parallel'
  | 'merge'
  | 'json_parser'
  | 'data_mapper'
  | 'transform'
  | 'filter'
  | 'code_execution';

export type NodeExecutionStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type LlmProvider = 'OpenAI' | 'Azure OpenAI' | 'Anthropic' | 'Google Gemini' | 'Ollama Local';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ComparisonOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'regex';

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface VariableDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  defaultValue?: string;
  description?: string;
}

export interface WorkflowNodeConfig {
  // General
  notes?: string;
  timeoutSeconds?: number;
  retryCount?: number;
  retryStrategy?: 'none' | 'linear' | 'exponential';

  // Start / Trigger / Input / Output
  triggerType?: 'manual' | 'webhook' | 'cron' | 'event';
  samplePayload?: string;
  variableName?: string;
  variableValue?: string;
  variableType?: 'string' | 'number' | 'boolean' | 'object' | 'array';

  // AI & Agent
  agentId?: string;
  agentName?: string;
  systemInstructions?: string;
  llmProvider?: LlmProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  availableTools?: string[];
  handoffTarget?: string;
  delegationStrategy?: 'sequential' | 'parallel' | 'hierarchical';

  // Tool / API / HTTP / DB / Webhook
  httpMethod?: HttpMethod;
  endpointUrl?: string;
  headers?: KeyValuePair[];
  authType?: 'none' | 'bearer' | 'api_key' | 'basic';
  authValue?: string;
  queryParams?: KeyValuePair[];
  requestBody?: string;
  expectedStatus?: number;
  dbConnection?: string;
  sqlQuery?: string;
  toolName?: string;

  // Logic
  inputVariable?: string;
  operator?: ComparisonOperator;
  comparisonValue?: string;
  trueBranchLabel?: string;
  falseBranchLabel?: string;
  switchCases?: string[];
  maxIterations?: number;
  collectionPath?: string;

  // Data & Code
  codeLanguage?: 'javascript' | 'typescript' | 'json';
  code?: string;
  mappingExpression?: string;
  filterCondition?: string;
  jsonSchema?: string;
}

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  nodeType: NodeTypeId;
  category: NodeCategory;
  description: string;
  config: WorkflowNodeConfig;
  inputDefinitions: VariableDefinition[];
  outputDefinitions: VariableDefinition[];
  executionStatus: NodeExecutionStatus;
  lastDurationMs?: number;
  lastInput?: unknown;
  lastOutput?: unknown;
  lastError?: string;
}

export type WorkflowNode = Node<WorkflowNodeData>;

export interface WorkflowEdgeData extends Record<string, unknown> {
  label?: string;
  branchType?: 'default' | 'true' | 'false' | 'case';
  executionState?: 'idle' | 'active' | 'completed' | 'failed';
}

export type WorkflowEdge = Edge<WorkflowEdgeData>;

export interface WorkflowExecutionSettings {
  maxConcurrency: number;
  globalTimeoutSeconds: number;
  onErrorPolicy: 'stop' | 'continue' | 'retry';
  enableCheckpointing: boolean;
}

export interface WorkflowVersionSnapshot {
  version: string;
  savedAt: string;
  note: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'archived';
  pinned: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputSchema: string;
  outputSchema: string;
  executionSettings: WorkflowExecutionSettings;
  version: string;
  versions: WorkflowVersionSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export type AgentCategory = 'conversational' | 'harness' | 'tool-calling' | 'orchestration';
export type AgentStatus = 'online' | 'idle' | 'offline';

export interface AgentToolBinding {
  id: string;
  name: string;
  description: string;
  type: 'native' | 'mcp' | 'http';
  enabled: boolean;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  status: AgentStatus;
  systemPrompt: string;
  provider: LlmProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  runtimeEngine: string;
  tools: AgentToolBinding[];
  inputSchema: string;
  outputSchema: string;
  hitlRequireApproval: boolean;
  auditLogEnabled: boolean;
  timeoutSeconds: number;
  avgLatencyMs: number;
  totalRuns: number;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export type LogLevel = 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  nodeId?: string;
  nodeLabel?: string;
  message: string;
  details?: string;
}

export interface NodeExecutionRecord {
  nodeId: string;
  nodeLabel: string;
  nodeType: NodeTypeId;
  status: NodeExecutionStatus;
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  input: unknown;
  output: unknown;
  error?: string;
}

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  trigger: 'Manual' | 'Webhook' | 'CRON' | 'Event Grid';
  status: ExecutionStatus;
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  completedNodes: number;
  failedNodes: number;
  totalNodes: number;
  nodeExecutions: NodeExecutionRecord[];
  logs: ExecutionLogEntry[];
  inputPayload: unknown;
  outputPayload: unknown;
  isSimulated: boolean;
}

export interface ScheduleDefinition {
  id: string;
  name: string;
  workflowId: string;
  workflowName: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  nextRunAt: string;
  lastRunAt?: string;
  lastStatus?: ExecutionStatus;
  createdAt: string;
}

export interface WorkspaceSettings {
  workspaceName: string;
  teamName: string;
  adminName: string;
  defaultProvider: LlmProvider;
  defaultModel: string;
  defaultTimeoutSeconds: number;
  maxRetries: number;
  enableAuditLogs: boolean;
  apiBaseUrl: string;
  simulationStepDelayMs: number;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  nodeId?: string;
  nodeLabel?: string;
  message: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
