import {
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import {
  AlertCircle,
  GitFork,
  History,
  Maximize2,
  Play,
  Redo2,
  Save,
  Settings2,
  Square,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NODE_CATALOG_MAP } from '../constants/nodeCatalog';
import { executeWorkflowGraph, validateWorkflowGraph } from '../services/executionEngine';
import { useOrchestratorStore } from '../store/useOrchestratorStore';
import type {
  ExecutionLogEntry,
  NodeExecutionRecord,
  NodeTypeId,
  ValidationIssue,
  WorkflowEdge,
  WorkflowExecution,
  WorkflowNode,
  WorkflowNodeData,
} from '../types/orchestrator';
import { CustomWorkflowEdge } from '../components/workflow/CustomWorkflowEdge';
import { NodeInspectorPanel } from '../components/workflow/NodeInspectorPanel';
import { NodeLibraryPanel } from '../components/workflow/NodeLibraryPanel';
import { WorkflowExecutionDrawer } from '../components/workflow/WorkflowExecutionDrawer';
import {
  WorkflowNodeCard,
  type WorkflowNodeCallbacks,
} from '../components/workflow/WorkflowNodeCard';
import { WorkflowSchemaModal } from '../components/workflow/WorkflowSchemaModal';

const NODE_TYPES = {
  workflowNode: WorkflowNodeCard,
};

const EDGE_TYPES = {
  workflowEdge: CustomWorkflowEdge,
};

interface HistorySnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

function WorkflowBuilderCanvas() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();

  const workflows = useOrchestratorStore((s) => s.workflows);
  const agents = useOrchestratorStore((s) => s.agents);
  const settings = useOrchestratorStore((s) => s.settings);
  const setActiveWorkflowId = useOrchestratorStore((s) => s.setActiveWorkflowId);
  const saveWorkflowGraph = useOrchestratorStore((s) => s.saveWorkflowGraph);
  const restoreWorkflowVersion = useOrchestratorStore((s) => s.restoreWorkflowVersion);
  const addExecution = useOrchestratorStore((s) => s.addExecution);
  const updateExecution = useOrchestratorStore((s) => s.updateExecution);
  const appendExecutionLog = useOrchestratorStore((s) => s.appendExecutionLog);
  const upsertExecutionNodeRecord = useOrchestratorStore((s) => s.upsertExecutionNodeRecord);
  const pushToast = useOrchestratorStore((s) => s.pushToast);

  const workflow = useMemo(
    () => workflows.find((w) => w.id === workflowId) ?? workflows[0],
    [workflows, workflowId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>(workflow?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>(workflow?.edges ?? []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Undo/Redo stacks
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  // Execution & validation state
  const [isRunning, setIsRunning] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logs, setLogs] = useState<ExecutionLogEntry[]>([]);
  const [nodeRecords, setNodeRecords] = useState<NodeExecutionRecord[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [showMobileLibrary, setShowMobileLibrary] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, zoomIn, zoomOut, fitView, setCenter } = useReactFlow();

  // Sync when switching workflows
  useEffect(() => {
    if (!workflow) return;
    setActiveWorkflowId(workflow.id);
    setNodes(structuredClone(workflow.nodes));
    setEdges(structuredClone(workflow.edges));
    setSelectedNodeId(null);
    setDirty(false);
    setPast([]);
    setFuture([]);
    setLogs([]);
    setNodeRecords([]);
    setValidationIssues([]);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [workflow?.id]);

  // Live validation whenever nodes/edges change
  useEffect(() => {
    setValidationIssues(validateWorkflowGraph(nodes, edges, agents));
  }, [nodes, edges, agents]);

  const pushHistory = useCallback(() => {
    setPast((p) => [...p.slice(-24), { nodes: structuredClone(nodes), edges: structuredClone(edges) }]);
    setFuture([]);
    setDirty(true);
  }, [nodes, edges]);

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture((f) => [{ nodes: structuredClone(nodes), edges: structuredClone(edges) }, ...f]);
    setPast((p) => p.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setDirty(true);
  }, [past, nodes, edges, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setPast((p) => [...p, { nodes: structuredClone(nodes), edges: structuredClone(edges) }]);
    setFuture((f) => f.slice(1));
    setNodes(next.nodes);
    setEdges(next.edges);
    setDirty(true);
  }, [future, nodes, edges, setNodes, setEdges]);

  const handleSave = useCallback(
    (withVersionSnapshot = false) => {
      if (!workflow) return;
      saveWorkflowGraph(
        workflow.id,
        nodes,
        edges,
        withVersionSnapshot ? `Manual snapshot (${nodes.length} nodes)` : undefined
      );
      setDirty(false);
      pushToast({
        type: 'success',
        title: withVersionSnapshot ? 'Version snapshot saved' : 'Workflow saved',
        description: `"${workflow.name}" persisted locally.`,
      });
    },
    [workflow, nodes, edges, saveWorkflowGraph, pushToast]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      pushHistory();
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [pushHistory, setNodes, setEdges, selectedNodeId]
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;
      pushHistory();
      const newId = `n_${Date.now().toString(36)}`;
      const cloned: WorkflowNode = {
        ...structuredClone(target),
        id: newId,
        selected: false,
        position: { x: target.position.x + 48, y: target.position.y + 48 },
        data: {
          ...structuredClone(target.data),
          label: `${target.data.label} (Copy)`,
          executionStatus: 'idle',
        },
      };
      setNodes((nds) => [...nds, cloned]);
      setSelectedNodeId(newId);
    },
    [nodes, pushHistory, setNodes]
  );

  // Register node card action callbacks cleanly
  useEffect(() => {
    const win = window as unknown as { __woplaNodeCallbacks?: WorkflowNodeCallbacks };
    win.__woplaNodeCallbacks = {
      onDeleteNode: handleDeleteNode,
      onDuplicateNode: handleDuplicateNode,
    };
  }, [handleDeleteNode, handleDuplicateNode]);

  // Keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditingInput =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave(false);
      } else if (!isEditingInput && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (!isEditingInput && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, handleUndo, handleRedo]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source === connection.target) return;
      pushHistory();
      const sourceNode = nodes.find((n) => n.id === connection.source);
      let label: string | undefined;
      let branchType: 'default' | 'true' | 'false' | 'case' = 'default';

      if (sourceNode?.data.nodeType === 'condition') {
        if (connection.sourceHandle === 'true') {
          label = 'True';
          branchType = 'true';
        } else if (connection.sourceHandle === 'false') {
          label = 'False';
          branchType = 'false';
        }
      } else if (connection.sourceHandle && connection.sourceHandle !== 'default') {
        label = connection.sourceHandle.replace('_', ' ');
        branchType = 'case';
      }

      const newEdge: WorkflowEdge = {
        ...connection,
        id: `e_${connection.source}_${connection.target}_${Date.now().toString(36)}`,
        type: 'workflowEdge',
        data: { label, branchType, executionState: 'idle' },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodes, pushHistory, setEdges]
  );

  const createNodeAtPosition = useCallback(
    (nodeType: NodeTypeId, position: { x: number; y: number }) => {
      const entry = NODE_CATALOG_MAP[nodeType];
      if (!entry) return;
      pushHistory();
      const id = `n_${nodeType}_${Date.now().toString(36)}`;
      const newNode: WorkflowNode = {
        id,
        type: 'workflowNode',
        position,
        data: {
          label: entry.label,
          nodeType: entry.nodeType,
          category: entry.category,
          description: entry.shortDescription,
          config: structuredClone(entry.defaultConfig),
          inputDefinitions: structuredClone(entry.defaultInputs),
          outputDefinitions: structuredClone(entry.defaultOutputs),
          executionStatus: 'idle',
        },
      };
      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
    },
    [pushHistory, setNodes]
  );

  const handleAddNodeFromClick = useCallback(
    (nodeType: NodeTypeId) => {
      const offset = (nodes.length % 6) * 28;
      createNodeAtPosition(nodeType, { x: 260 + offset, y: 160 + offset });
    },
    [nodes.length, createNodeAtPosition]
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const nodeType = e.dataTransfer.getData('application/wopla-node-type') as NodeTypeId;
      if (!nodeType) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      createNodeAtPosition(nodeType, position);
    },
    [screenToFlowPosition, createNodeAtPosition]
  );

  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    pushHistory();
    // Simple topological horizontal layering
    const depth = new Map<string, number>();
    nodes.forEach((n) => depth.set(n.id, 0));
    for (let i = 0; i < nodes.length; i++) {
      edges.forEach((e) => {
        const dSrc = depth.get(e.source) ?? 0;
        const dTgt = depth.get(e.target) ?? 0;
        if (dTgt <= dSrc) depth.set(e.target, dSrc + 1);
      });
    }
    const layers = new Map<number, WorkflowNode[]>();
    nodes.forEach((n) => {
      const d = depth.get(n.id) ?? 0;
      const list = layers.get(d) ?? [];
      list.push(n);
      layers.set(d, list);
    });

    const positioned = nodes.map((n) => {
      const d = depth.get(n.id) ?? 0;
      const list = layers.get(d) ?? [n];
      const idx = list.findIndex((item) => item.id === n.id);
      return {
        ...n,
        position: {
          x: 80 + d * 320,
          y: 100 + idx * 190,
        },
      };
    });
    setNodes(positioned);
    setTimeout(() => fitView({ padding: 0.2 }), 40);
  }, [nodes, edges, pushHistory, setNodes, fitView]);

  const handleChangeNodeData = useCallback(
    (nodeId: string, patch: Partial<WorkflowNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n))
      );
      setDirty(true);
    },
    [setNodes]
  );

  const handleRunWorkflow = async () => {
    if (!workflow || isRunning) return;

    const issues = validateWorkflowGraph(nodes, edges, agents);
    setValidationIssues(issues);
    const fatalErrors = issues.filter((i) => i.severity === 'error');
    if (fatalErrors.length > 0) {
      setDrawerOpen(true);
      pushToast({
        type: 'error',
        title: 'Cannot start workflow',
        description: fatalErrors[0].message,
      });
      return;
    }

    // Persist current graph before running
    saveWorkflowGraph(workflow.id, nodes, edges);
    setDirty(false);

    const execId = `run_${Date.now().toString().slice(-5)}`;
    const startedAt = new Date().toISOString();
    const initialExec: WorkflowExecution = {
      id: execId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      trigger: 'Manual',
      status: 'running',
      startedAt,
      durationMs: 0,
      completedNodes: 0,
      failedNodes: 0,
      totalNodes: nodes.length,
      nodeExecutions: [],
      logs: [],
      inputPayload: {},
      outputPayload: null,
      isSimulated: true,
    };

    addExecution(initialExec);
    setLogs([]);
    setNodeRecords([]);
    setDrawerOpen(true);
    setIsRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const result = await executeWorkflowGraph({
      nodes,
      edges,
      agents,
      stepDelayMs: settings.simulationStepDelayMs,
      signal: controller.signal,
      callbacks: {
        onNodeStatusChange: (nodeId, status, details) => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      executionStatus: status,
                      lastDurationMs: details?.durationMs ?? n.data.lastDurationMs,
                      lastInput: details?.input !== undefined ? details.input : n.data.lastInput,
                      lastOutput: details?.output !== undefined ? details.output : n.data.lastOutput,
                      lastError: details?.error,
                    },
                  }
                : n
            )
          );
        },
        onEdgeStateChange: (edgeId, state) => {
          setEdges((eds) =>
            eds.map((e) =>
              e.id === edgeId ? { ...e, data: { ...e.data, executionState: state } } : e
            )
          );
        },
        onLog: (entry) => {
          setLogs((prev) => [...prev, entry]);
          appendExecutionLog(execId, entry);
        },
        onNodeRecord: (record) => {
          setNodeRecords((prev) => {
            const exists = prev.some((r) => r.nodeId === record.nodeId);
            return exists
              ? prev.map((r) => (r.nodeId === record.nodeId ? record : r))
              : [...prev, record];
          });
          upsertExecutionNodeRecord(execId, record);
        },
      },
    });

    setIsRunning(false);
    abortRef.current = null;

    updateExecution(execId, {
      status: result.status,
      endedAt: new Date().toISOString(),
      durationMs: result.durationMs,
      completedNodes: result.completedNodes,
      failedNodes: result.failedNodes,
      outputPayload: result.finalOutput,
    });

    pushToast({
      type:
        result.status === 'completed'
          ? 'success'
          : result.status === 'cancelled'
            ? 'warning'
            : 'error',
      title:
        result.status === 'completed'
          ? 'Simulated execution completed'
          : result.status === 'cancelled'
            ? 'Execution stopped'
            : 'Workflow execution failed',
      description: `Run ${execId} finished (${result.completedNodes} completed, ${result.failedNodes} failed).`,
    });
  };

  const handleStopWorkflow = () => {
    abortRef.current?.abort();
  };

  const handleFocusNode = useCallback(
    (nodeId: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;
      setSelectedNodeId(nodeId);
      setCenter(target.position.x + 124, target.position.y + 70, { zoom: 1.05, duration: 300 });
    },
    [nodes, setCenter]
  );

  const onSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    if (params.nodes.length === 1) {
      setSelectedNodeId(params.nodes[0].id);
    } else if (params.nodes.length === 0) {
      setSelectedNodeId(null);
    }
  }, []);

  if (!workflow) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-[15px] font-semibold text-[#0F172A]">No workflows available</p>
          <button
            type="button"
            onClick={() => navigate('/workflows')}
            className="h-9 px-4 rounded-[8px] bg-[#2563EB] text-white text-[13px] font-semibold"
          >
            Go to Workflows
          </button>
        </div>
      </div>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const errorCount = validationIssues.filter((v) => v.severity === 'error').length;

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Builder Toolbar */}
      <div className="h-12 px-4 bg-white border-b border-[#E5E7EB] flex items-center justify-between gap-3 shrink-0 overflow-x-auto">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowMobileLibrary((s) => !s)}
            className="md:hidden h-8 px-2.5 rounded-[8px] border border-[#E5E7EB] text-[12px] font-medium text-[#0F172A]"
          >
            Nodes
          </button>

          <select
            value={workflow.id}
            onChange={(e) => navigate(`/builder/${e.target.value}`)}
            className="h-8 px-2.5 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] text-[13px] font-semibold text-[#0F172A] max-w-[240px] truncate focus:outline-none focus:border-[#2563EB]"
          >
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id}>
                {wf.name}
              </option>
            ))}
          </select>

          <span className="text-[11px] font-mono text-[#64748B] px-2 py-0.5 rounded-[6px] bg-[#F1F5F9] shrink-0">
            {workflow.version}
          </span>

          {dirty && (
            <span className="text-[11px] font-medium text-[#D97706] whitespace-nowrap">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Undo / Redo */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={past.length === 0}
            className="h-8 w-8 rounded-[8px] border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] flex items-center justify-center text-[#475569] disabled:opacity-40"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={future.length === 0}
            className="h-8 w-8 rounded-[8px] border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] flex items-center justify-center text-[#475569] disabled:opacity-40"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-[#E5E7EB] mx-1" />

          {/* Auto Layout & Fit */}
          <button
            type="button"
            onClick={handleAutoLayout}
            className="h-8 px-2.5 rounded-[8px] border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] text-[12px] font-medium text-[#0F172A] flex items-center gap-1.5"
            title="Auto-arrange nodes into DAG columns"
          >
            <GitFork className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden xl:inline">Auto Layout</span>
          </button>

          <button
            type="button"
            onClick={() => setSchemaModalOpen(true)}
            className="h-8 px-2.5 rounded-[8px] border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] text-[12px] font-medium text-[#0F172A] flex items-center gap-1.5"
          >
            <Settings2 className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden lg:inline">Schemas & JSON</span>
          </button>

          {errorCount > 0 && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="h-8 px-2.5 rounded-[8px] bg-[#FEE2E2] text-[#DC2626] text-[12px] font-semibold flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorCount} Error{errorCount > 1 ? 's' : ''}</span>
            </button>
          )}

          <div className="h-5 w-px bg-[#E5E7EB] mx-1" />

          {/* Save & Snapshot */}
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="h-8 px-2.5 rounded-[8px] border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] text-[12px] font-medium text-[#0F172A] flex items-center gap-1.5"
            title="Save version snapshot"
          >
            <History className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="hidden xl:inline">Snapshot</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            className="h-8 px-3 rounded-[8px] border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] text-[12px] font-semibold text-[#0F172A] flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Save</span>
          </button>

          {/* Run / Stop */}
          {isRunning ? (
            <button
              type="button"
              onClick={handleStopWorkflow}
              className="h-8 px-3.5 rounded-[8px] bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[12px] font-semibold flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunWorkflow}
              className="h-8 px-3.5 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-semibold flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run (Simulated)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 3-Pane Editor Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Node Library */}
        <div className="hidden md:flex h-full">
          <NodeLibraryPanel onAddNode={handleAddNodeFromClick} />
        </div>

        {/* Mobile Node Library Overlay */}
        {showMobileLibrary && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div className="fixed inset-0 bg-slate-900/30" onClick={() => setShowMobileLibrary(false)} />
            <div className="relative z-50 h-full">
              <NodeLibraryPanel
                onAddNode={(t) => {
                  handleAddNodeFromClick(t);
                  setShowMobileLibrary(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Center Canvas + Bottom Execution Drawer */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <div ref={reactFlowWrapper} className="flex-1 relative">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodesDelete={() => setDirty(true)}
              onEdgesDelete={() => setDirty(true)}
              onNodeDragStop={() => setDirty(true)}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onDragOver={onDragOver}
              onDrop={onDrop}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#CBD5E1" />
              <MiniMap
                nodeStrokeWidth={2}
                zoomable
                pannable
                className="!bg-white !bottom-3 !right-3"
              />
              <Controls showInteractive={false} className="!hidden" />
            </ReactFlow>

            {/* Precision Floating Zoom Controls */}
            <div className="absolute top-3 left-3 z-10 flex flex-col bg-white border border-[#E5E7EB] rounded-[8px] shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => zoomIn()}
                className="w-8 h-8 flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] border-b border-[#E5E7EB]"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => zoomOut()}
                className="w-8 h-8 flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] border-b border-[#E5E7EB]"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => fitView({ padding: 0.2 })}
                className="w-8 h-8 flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                title="Fit workflow to screen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <WorkflowExecutionDrawer
            open={drawerOpen}
            onToggleOpen={() => setDrawerOpen((o) => !o)}
            logs={logs}
            nodeRecords={nodeRecords}
            validationIssues={validationIssues}
            isRunning={isRunning}
            onClearLogs={() => setLogs([])}
            onFocusNode={handleFocusNode}
          />
        </div>

        {/* Right Node Configuration Inspector (docked on lg, slide-over on smaller screens) */}
        {selectedNode && (
          <div className="fixed inset-y-14 right-0 z-30 lg:static lg:inset-auto h-[calc(100vh-104px)] lg:h-full shadow-xl lg:shadow-none">
            <NodeInspectorPanel
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onChangeNodeData={handleChangeNodeData}
              onDeleteNode={handleDeleteNode}
              onDuplicateNode={handleDuplicateNode}
            />
          </div>
        )}
      </div>

      <WorkflowSchemaModal
        open={schemaModalOpen}
        workflow={workflow}
        onClose={() => setSchemaModalOpen(false)}
        onRestoreVersion={(ver) => {
          const snap = workflow.versions.find((v) => v.version === ver);
          if (!snap || snap.nodes.length === 0) return;
          pushHistory();
          restoreWorkflowVersion(workflow.id, ver);
          setNodes(structuredClone(snap.nodes));
          setEdges(structuredClone(snap.edges));
          setSelectedNodeId(null);
          setDirty(false);
          setTimeout(() => fitView({ padding: 0.2 }), 50);
          pushToast({
            type: 'info',
            title: `Restored ${ver}`,
            description: 'Canvas updated to selected version snapshot.',
          });
        }}
      />
    </div>
  );
}

export function WorkflowBuilderPage() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderCanvas />
    </ReactFlowProvider>
  );
}
