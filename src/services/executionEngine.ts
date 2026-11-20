import type {
  AgentDefinition,
  ComparisonOperator,
  ExecutionLogEntry,
  LogLevel,
  NodeExecutionRecord,
  NodeExecutionStatus,
  ValidationIssue,
  WorkflowEdge,
  WorkflowNode,
} from '../types/orchestrator';

function nowTimestamp(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function makeLog(
  level: LogLevel,
  message: string,
  node?: WorkflowNode,
  details?: string
): ExecutionLogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: nowTimestamp(),
    level,
    nodeId: node?.id,
    nodeLabel: node?.data.label,
    message,
    details,
  };
}

export function validateWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  agents: AgentDefinition[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (nodes.length === 0) {
    issues.push({
      id: 'val_empty',
      severity: 'error',
      message: 'Workflow canvas is empty. Add at least a Start node to run.',
    });
    return issues;
  }

  const startNodes = nodes.filter((n) => n.data.nodeType === 'start');
  if (startNodes.length === 0) {
    issues.push({
      id: 'val_no_start',
      severity: 'error',
      message: 'Missing a Start trigger node. Add a Start node as the entry point.',
    });
  }

  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();
  nodes.forEach((n) => {
    incomingCount.set(n.id, 0);
    outgoingCount.set(n.id, 0);
  });

  edges.forEach((e) => {
    outgoingCount.set(e.source, (outgoingCount.get(e.source) ?? 0) + 1);
    incomingCount.set(e.target, (incomingCount.get(e.target) ?? 0) + 1);
  });

  // Check disconnected nodes and configuration completeness
  nodes.forEach((node) => {
    const inDeg = incomingCount.get(node.id) ?? 0;
    const outDeg = outgoingCount.get(node.id) ?? 0;

    if (node.data.nodeType !== 'start' && inDeg === 0) {
      issues.push({
        id: `val_orphan_in_${node.id}`,
        severity: 'warning',
        nodeId: node.id,
        nodeLabel: node.data.label,
        message: `"${node.data.label}" has no incoming connection and will not execute.`,
      });
    }

    if (
      node.data.nodeType !== 'end' &&
      node.data.nodeType !== 'output' &&
      outDeg === 0 &&
      nodes.length > 1
    ) {
      issues.push({
        id: `val_dead_end_${node.id}`,
        severity: 'warning',
        nodeId: node.id,
        nodeLabel: node.data.label,
        message: `"${node.data.label}" has no outgoing connection.`,
      });
    }

    if (
      (node.data.nodeType === 'api_request' ||
        node.data.nodeType === 'http_request' ||
        node.data.nodeType === 'webhook') &&
      (!node.data.config.endpointUrl || !node.data.config.endpointUrl.trim())
    ) {
      issues.push({
        id: `val_url_${node.id}`,
        severity: 'error',
        nodeId: node.id,
        nodeLabel: node.data.label,
        message: `"${node.data.label}" requires a valid Endpoint URL.`,
      });
    }

    if (node.data.nodeType === 'ai_agent' && node.data.config.agentId) {
      const linked = agents.find((a) => a.id === node.data.config.agentId);
      if (!linked && !node.data.config.systemInstructions?.trim()) {
        issues.push({
          id: `val_agent_${node.id}`,
          severity: 'warning',
          nodeId: node.id,
          nodeLabel: node.data.label,
          message: `"${node.data.label}" references an unknown agent ID (${node.data.config.agentId}).`,
        });
      }
    }

    if (
      node.data.nodeType === 'code_execution' &&
      (!node.data.config.code || !node.data.config.code.trim())
    ) {
      issues.push({
        id: `val_code_${node.id}`,
        severity: 'error',
        nodeId: node.id,
        nodeLabel: node.data.label,
        message: `"${node.data.label}" has empty script code.`,
      });
    }
  });

  // Cycle detection via Kahn's algorithm
  const inDegreeCopy = new Map(incomingCount);
  const queue: string[] = [];
  inDegreeCopy.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  let visited = 0;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    visited++;
    edges
      .filter((e) => e.source === curr)
      .forEach((e) => {
        const nextDeg = (inDegreeCopy.get(e.target) ?? 0) - 1;
        inDegreeCopy.set(e.target, nextDeg);
        if (nextDeg === 0) queue.push(e.target);
      });
  }

  if (visited < nodes.length) {
    issues.push({
      id: 'val_cycle',
      severity: 'error',
      message: 'Cycle detected in workflow graph. Remove circular dependencies before running.',
    });
  }

  return issues;
}

function evaluateCondition(
  actualValue: unknown,
  operator: ComparisonOperator | undefined,
  expectedRaw: string | undefined
): boolean {
  const expected = expectedRaw ?? '';
  const actualStr = actualValue === undefined || actualValue === null ? '' : String(actualValue);
  const actualNum = Number(actualValue);
  const expectedNum = Number(expected);

  switch (operator) {
    case 'equals':
      return actualStr === expected;
    case 'not_equals':
      return actualStr !== expected;
    case 'contains':
      return actualStr.toLowerCase().includes(expected.toLowerCase());
    case 'greater_than':
      return !Number.isNaN(actualNum) && !Number.isNaN(expectedNum) && actualNum > expectedNum;
    case 'less_than':
      return !Number.isNaN(actualNum) && !Number.isNaN(expectedNum) && actualNum < expectedNum;
    case 'is_empty':
      return actualStr.trim().length === 0;
    case 'regex':
      try {
        return new RegExp(expected).test(actualStr);
      } catch {
        return false;
      }
    default:
      return true;
  }
}

function extractVariable(obj: unknown, path: string | undefined): unknown {
  if (!path || typeof obj !== 'object' || obj === null) return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current === 'object' && current !== null && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Execution aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Execution aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface ExecutionCallbacks {
  onNodeStatusChange: (
    nodeId: string,
    status: NodeExecutionStatus,
    details?: { durationMs?: number; input?: unknown; output?: unknown; error?: string }
  ) => void;
  onEdgeStateChange: (edgeId: string, state: 'idle' | 'active' | 'completed' | 'failed') => void;
  onLog: (entry: ExecutionLogEntry) => void;
  onNodeRecord: (record: NodeExecutionRecord) => void;
}

export async function executeWorkflowGraph(params: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  agents: AgentDefinition[];
  stepDelayMs: number;
  signal?: AbortSignal;
  callbacks: ExecutionCallbacks;
}): Promise<{
  status: 'completed' | 'failed' | 'cancelled';
  finalOutput: unknown;
  completedNodes: number;
  failedNodes: number;
  durationMs: number;
}> {
  const { nodes, edges, agents, stepDelayMs, signal, callbacks } = params;
  const startedMs = Date.now();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Reset all nodes to pending or idle
  const startNodes = nodes.filter((n) => n.data.nodeType === 'start');
  const reachable = new Set<string>();
  const bfsQueue = startNodes.map((n) => n.id);
  while (bfsQueue.length > 0) {
    const id = bfsQueue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    edges
      .filter((e) => e.source === id)
      .forEach((e) => bfsQueue.push(e.target));
  }

  nodes.forEach((n) => {
    callbacks.onNodeStatusChange(n.id, reachable.has(n.id) ? 'pending' : 'skipped');
  });
  edges.forEach((e) => callbacks.onEdgeStateChange(e.id, 'idle'));

  callbacks.onLog(
    makeLog(
      'INFO',
      `Simulated Execution Engine started (${reachable.size} reachable nodes, ${edges.length} edges).`
    )
  );

  // Build topological order over reachable subgraph
  const inDeg = new Map<string, number>();
  reachable.forEach((id) => inDeg.set(id, 0));
  edges.forEach((e) => {
    if (reachable.has(e.source) && reachable.has(e.target)) {
      inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    }
  });

  const readyQueue: string[] = [];
  inDeg.forEach((deg, id) => {
    if (deg === 0) readyQueue.push(id);
  });

  const nodeOutputs = new Map<string, Record<string, unknown>>();
  const skippedNodes = new Set<string>();
  let completedNodes = 0;
  let failedNodes = 0;
  let lastOutput: unknown = {};

  try {
    while (readyQueue.length > 0) {
      if (signal?.aborted) {
        throw new DOMException('Execution aborted', 'AbortError');
      }

      const nodeId = readyQueue.shift()!;
      const node = nodeMap.get(nodeId);
      if (!node) continue;

      // Determine if all incoming edges are skipped
      const incomingEdges = edges.filter((e) => e.target === nodeId && reachable.has(e.source));
      if (incomingEdges.length > 0) {
        const allIncomingSkipped = incomingEdges.every((e) => skippedNodes.has(e.source));
        const activeIncoming = incomingEdges.filter((e) => !skippedNodes.has(e.source));
        if (allIncomingSkipped || activeIncoming.length === 0) {
          skippedNodes.add(nodeId);
          callbacks.onNodeStatusChange(nodeId, 'skipped');
          callbacks.onLog(makeLog('DEBUG', `Skipped "${node.data.label}" (branch not taken).`, node));
          edges
            .filter((e) => e.source === nodeId)
            .forEach((e) => {
              const nextDeg = (inDeg.get(e.target) ?? 1) - 1;
              inDeg.set(e.target, nextDeg);
              if (nextDeg === 0) readyQueue.push(e.target);
            });
          continue;
        }
      }

      // Collect merged upstream input
      const mergedInput: Record<string, unknown> = {};
      incomingEdges.forEach((e) => {
        if (!skippedNodes.has(e.source)) {
          const upstreamOut = nodeOutputs.get(e.source);
          if (upstreamOut) {
            Object.assign(mergedInput, upstreamOut);
          }
          callbacks.onEdgeStateChange(e.id, 'active');
        }
      });

      const nodeStartIso = new Date().toISOString();
      const nodeStartTime = Date.now();
      callbacks.onNodeStatusChange(nodeId, 'running', { input: mergedInput });
      callbacks.onLog(makeLog('INFO', `Executing ${node.data.nodeType} node "${node.data.label}"...`, node));

      await sleep(stepDelayMs, signal);

      // Simulate node execution by type
      let output: Record<string, unknown> = { ...mergedInput };
      let branchTakenHandle: string | null = null;
      let nodeError: string | undefined;

      try {
        switch (node.data.nodeType) {
          case 'start': {
            let parsedPayload: Record<string, unknown> = { triggeredAt: new Date().toISOString() };
            if (node.data.config.samplePayload) {
              parsedPayload = JSON.parse(node.data.config.samplePayload) as Record<string, unknown>;
            }
            output = { ...parsedPayload, triggerType: node.data.config.triggerType ?? 'manual' };
            break;
          }
          case 'ai_agent':
          case 'llm':
          case 'multi_agent':
          case 'supervisor_agent': {
            const linkedAgent = agents.find((a) => a.id === node.data.config.agentId);
            const model = node.data.config.model ?? linkedAgent?.model ?? 'gpt-4o';
            const provider = node.data.config.llmProvider ?? linkedAgent?.provider ?? 'Azure OpenAI';
            output = {
              ...mergedInput,
              simulated: true,
              agentName: linkedAgent?.name ?? node.data.config.agentName ?? node.data.label,
              provider,
              model,
              confidence: 0.92,
              summary: `Simulated ${model} response for "${node.data.label}"`,
              tokensUsed: Math.floor(180 + Math.random() * 240),
            };
            callbacks.onLog(
              makeLog(
                'DEBUG',
                `[${provider} / ${model}] Generated simulated output (confidence=0.92)`,
                node
              )
            );
            break;
          }
          case 'api_request':
          case 'http_request':
          case 'webhook': {
            const url = node.data.config.endpointUrl ?? '';
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              throw new Error(`Invalid endpoint URL "${url}". Must start with http:// or https://`);
            }
            output = {
              ...mergedInput,
              simulated: true,
              httpStatus: node.data.config.expectedStatus ?? 200,
              endpoint: url,
              method: node.data.config.httpMethod ?? 'GET',
              recordsFetched: 120,
            };
            callbacks.onLog(
              makeLog(
                'INFO',
                `Simulated ${node.data.config.httpMethod ?? 'GET'} ${url} -> ${output.httpStatus}`,
                node
              )
            );
            break;
          }
          case 'database_query': {
            output = {
              ...mergedInput,
              simulated: true,
              connection: node.data.config.dbConnection ?? 'postgres-prod-replica',
              rowCount: 10,
              rows: [
                { workflow_id: 'wf_alpha_01', avg_ms: 248 },
                { workflow_id: 'wf_beta_02', avg_ms: 192 },
              ],
            };
            break;
          }
          case 'condition': {
            const varName = node.data.config.inputVariable ?? 'confidence';
            const candidate = extractVariable(mergedInput, varName) ?? mergedInput[varName] ?? 0.92;
            const passed = evaluateCondition(
              candidate,
              node.data.config.operator ?? 'greater_than',
              node.data.config.comparisonValue ?? '0.85'
            );
            branchTakenHandle = passed ? 'true' : 'false';
            output = {
              ...mergedInput,
              conditionEvaluated: `${varName} (${String(candidate)}) ${node.data.config.operator} ${node.data.config.comparisonValue}`,
              branchTaken: branchTakenHandle,
            };
            callbacks.onLog(
              makeLog(
                'INFO',
                `Condition "${varName}" evaluated to ${String(passed).toUpperCase()} -> taking "${branchTakenHandle}" branch`,
                node
              )
            );
            break;
          }
          case 'code_execution':
          case 'transform': {
            output = {
              ...mergedInput,
              simulated: true,
              transformed: true,
              processedAt: new Date().toISOString(),
            };
            break;
          }
          case 'end':
          case 'output': {
            output = {
              ...mergedInput,
              completedAt: new Date().toISOString(),
              workflowStatus: 'completed',
            };
            break;
          }
          default: {
            output = {
              ...mergedInput,
              nodeType: node.data.nodeType,
              processedBy: node.data.label,
            };
          }
        }
      } catch (err) {
        nodeError = err instanceof Error ? err.message : 'Unknown execution error';
      }

      const nodeDurationMs = Date.now() - nodeStartTime;
      const nodeEndIso = new Date().toISOString();

      if (nodeError) {
        failedNodes++;
        callbacks.onNodeStatusChange(nodeId, 'failed', {
          durationMs: nodeDurationMs,
          input: mergedInput,
          output: null,
          error: nodeError,
        });
        incomingEdges.forEach((e) => callbacks.onEdgeStateChange(e.id, 'failed'));
        callbacks.onLog(makeLog('ERROR', `Node "${node.data.label}" failed: ${nodeError}`, node));
        callbacks.onNodeRecord({
          nodeId,
          nodeLabel: node.data.label,
          nodeType: node.data.nodeType,
          status: 'failed',
          startedAt: nodeStartIso,
          endedAt: nodeEndIso,
          durationMs: nodeDurationMs,
          input: mergedInput,
          output: null,
          error: nodeError,
        });

        return {
          status: 'failed',
          finalOutput: { error: nodeError, failedNode: node.data.label },
          completedNodes,
          failedNodes,
          durationMs: Date.now() - startedMs,
        };
      }

      completedNodes++;
      nodeOutputs.set(nodeId, output);
      lastOutput = output;

      callbacks.onNodeStatusChange(nodeId, 'completed', {
        durationMs: nodeDurationMs,
        input: mergedInput,
        output,
      });
      incomingEdges.forEach((e) => {
        if (!skippedNodes.has(e.source)) {
          callbacks.onEdgeStateChange(e.id, 'completed');
        }
      });

      callbacks.onNodeRecord({
        nodeId,
        nodeLabel: node.data.label,
        nodeType: node.data.nodeType,
        status: 'completed',
        startedAt: nodeStartIso,
        endedAt: nodeEndIso,
        durationMs: nodeDurationMs,
        input: mergedInput,
        output,
      });

      // Propagate downstream & skip untaken conditional branches
      const outEdges = edges.filter((e) => e.source === nodeId);
      outEdges.forEach((e) => {
        if (branchTakenHandle && e.sourceHandle && e.sourceHandle !== branchTakenHandle) {
          // Mark target node if it only depends on this untaken edge
          const targetOtherEdges = edges.filter(
            (other) => other.target === e.target && other.id !== e.id && !skippedNodes.has(other.source)
          );
          if (targetOtherEdges.length === 0) {
            skippedNodes.add(e.target);
          }
          callbacks.onEdgeStateChange(e.id, 'idle');
        } else {
          callbacks.onEdgeStateChange(e.id, 'completed');
        }
        const nextDeg = (inDeg.get(e.target) ?? 1) - 1;
        inDeg.set(e.target, nextDeg);
        if (nextDeg === 0) readyQueue.push(e.target);
      });
    }

    const totalDuration = Date.now() - startedMs;
    callbacks.onLog(
      makeLog('INFO', `Simulated workflow run completed in ${(totalDuration / 1000).toFixed(2)}s.`)
    );

    return {
      status: 'completed',
      finalOutput: lastOutput,
      completedNodes,
      failedNodes,
      durationMs: totalDuration,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      callbacks.onLog(makeLog('WARN', 'Workflow execution stopped by operator.'));
      return {
        status: 'cancelled',
        finalOutput: { cancelled: true },
        completedNodes,
        failedNodes,
        durationMs: Date.now() - startedMs,
      };
    }
    throw err;
  }
}

export async function runAgentPlaygroundTest(
  agent: AgentDefinition,
  inputJson: string
): Promise<{
  success: boolean;
  durationMs: number;
  parsedInput: unknown;
  output: unknown;
  logs: string[];
}> {
  const start = Date.now();
  await sleep(480);

  let parsedInput: unknown;
  try {
    parsedInput = JSON.parse(inputJson);
  } catch {
    parsedInput = { rawPrompt: inputJson };
  }

  const enabledTools = agent.tools.filter((t) => t.enabled).map((t) => t.name);
  const durationMs = Date.now() - start;

  return {
    success: true,
    durationMs,
    parsedInput,
    output: {
      simulated: true,
      agentId: agent.id,
      agentName: agent.name,
      provider: agent.provider,
      model: agent.model,
      toolsInvoked: enabledTools.slice(0, 2),
      response: `Simulated playground response from ${agent.name} (${agent.model}) applying system instructions (${agent.systemPrompt.slice(0, 72)}...).`,
      metrics: {
        temperature: agent.temperature,
        promptTokens: 194,
        completionTokens: 128,
        latencyMs: durationMs,
      },
    },
    logs: [
      `[${nowTimestamp()}] INFO  Loaded agent ${agent.name} (${agent.version})`,
      `[${nowTimestamp()}] DEBUG Provider: ${agent.provider} | Model: ${agent.model} | Temp: ${agent.temperature}`,
      `[${nowTimestamp()}] DEBUG Active plugins: ${enabledTools.length > 0 ? enabledTools.join(', ') : 'none'}`,
      `[${nowTimestamp()}] INFO  Simulated inference completed in ${durationMs}ms`,
    ],
  };
}
