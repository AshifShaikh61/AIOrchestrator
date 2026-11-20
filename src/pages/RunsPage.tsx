import {
  Download,
  ExternalLink,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CodeEditor } from '../components/common/CodeEditor';
import { StatusBadge } from '../components/common/StatusBadge';
import { useOrchestratorStore } from '../store/useOrchestratorStore';
import type { ExecutionStatus, LogLevel } from '../types/orchestrator';
import {
  downloadJsonFile,
  downloadTextFile,
  formatDateTime,
  formatDuration,
} from '../utils/formatters';

export function RunsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const executions = useOrchestratorStore((s) => s.executions);
  const activeExecutionId = useOrchestratorStore((s) => s.activeExecutionId);
  const setActiveExecutionId = useOrchestratorStore((s) => s.setActiveExecutionId);
  const clearExecutionLogs = useOrchestratorStore((s) => s.clearExecutionLogs);
  const setActiveWorkflowId = useOrchestratorStore((s) => s.setActiveWorkflowId);
  const pushToast = useOrchestratorStore((s) => s.pushToast);
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<'all' | ExecutionStatus>('all');
  const [search, setSearch] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<'ALL' | LogLevel>('ALL');
  const [logSearch, setLogSearch] = useState('');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  useEffect(() => {
    const paramId = searchParams.get('runId');
    if (paramId && executions.some((e) => e.id === paramId)) {
      setActiveExecutionId(paramId);
    }
  }, [searchParams, executions, setActiveExecutionId]);

  const filteredRuns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return executions.filter((r) => {
      const sOk = statusFilter === 'all' || r.status === statusFilter;
      const qOk =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.workflowName.toLowerCase().includes(q) ||
        r.trigger.toLowerCase().includes(q);
      return sOk && qOk;
    });
  }, [executions, statusFilter, search]);

  const activeRun = useMemo(() => {
    return (
      executions.find((e) => e.id === activeExecutionId) ??
      filteredRuns[0] ??
      executions[0] ??
      null
    );
  }, [executions, activeExecutionId, filteredRuns]);

  useEffect(() => {
    if (activeRun && activeRun.nodeExecutions.length > 0) {
      const failedStep = activeRun.nodeExecutions.find((n) => n.status === 'failed');
      setSelectedStepId((failedStep ?? activeRun.nodeExecutions[0]).nodeId);
    } else {
      setSelectedStepId(null);
    }
  }, [activeRun?.id]);

  const selectedStep = activeRun?.nodeExecutions.find((n) => n.nodeId === selectedStepId) ?? null;

  const filteredLogs = useMemo(() => {
    if (!activeRun) return [];
    const q = logSearch.trim().toLowerCase();
    return activeRun.logs.filter((l) => {
      const lvlOk = logLevelFilter === 'ALL' || l.level === logLevelFilter;
      const qOk =
        !q ||
        l.message.toLowerCase().includes(q) ||
        (l.nodeLabel ?? '').toLowerCase().includes(q);
      return lvlOk && qOk;
    });
  }, [activeRun, logLevelFilter, logSearch]);

  const totalStepDuration = useMemo(() => {
    if (!activeRun) return 1;
    const sum = activeRun.nodeExecutions.reduce((acc, s) => acc + Math.max(s.durationMs, 100), 0);
    return Math.max(sum, 1);
  }, [activeRun]);

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#0F172A]">
            Execution Monitoring & Logs
          </h1>
          <p className="text-[14px] text-[#64748B] mt-1">
            Inspect workflow runs, node-level inputs and outputs, execution timelines, and structured logs.
          </p>
        </div>
      </div>

      {/* Run Selector Strip */}
      <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E5E7EB] p-1 rounded-[8px] overflow-x-auto">
            {(['all', 'completed', 'failed', 'running', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-[6px] text-[12px] font-medium capitalize whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search run ID or workflow..."
              className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] text-[13px] focus:bg-white focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        {/* Horizontal Run Pills / Cards */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
          {filteredRuns.map((run) => {
            const isActive = activeRun?.id === run.id;
            return (
              <button
                key={run.id}
                type="button"
                onClick={() => {
                  setActiveExecutionId(run.id);
                  setSearchParams({ runId: run.id });
                }}
                className={`min-w-[230px] p-3 rounded-[8px] border text-left transition-all shrink-0 ${
                  isActive
                    ? 'border-[#2563EB] bg-[#EFF6FF]/60 ring-1 ring-[#2563EB]'
                    : 'border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] font-semibold text-[#2563EB]">
                    {run.id}
                  </span>
                  <StatusBadge status={run.status} compact />
                </div>
                <div className="text-[12px] font-semibold text-[#0F172A] truncate mt-1">
                  {run.workflowName}
                </div>
                <div className="text-[11px] font-mono text-[#64748B] mt-0.5 tabular-nums">
                  {run.trigger} · {formatDuration(run.durationMs)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Run Details */}
      {!activeRun ? (
        <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-12 text-center text-[#64748B]">
          No execution runs recorded yet.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Run Summary Banner */}
          <section className="bg-white border border-[#E5E7EB] rounded-[12px] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-[18px] font-semibold text-[#0F172A]">
                  {activeRun.id}: {activeRun.workflowName}
                </h2>
                <StatusBadge status={activeRun.status} />
                {activeRun.isSimulated && (
                  <span className="px-2 py-0.5 rounded-[6px] bg-[#F1F5F9] text-[#475569] font-mono text-[11px]">
                    Simulated Run
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[12px] text-[#64748B] font-mono">
                <span>Trigger: {activeRun.trigger}</span>
                <span>·</span>
                <span>Started: {formatDateTime(activeRun.startedAt)}</span>
                <span>·</span>
                <span>Duration: {formatDuration(activeRun.durationMs)}</span>
                <span>·</span>
                <span>
                  Nodes: {activeRun.completedNodes} completed / {activeRun.failedNodes} failed
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveWorkflowId(activeRun.workflowId);
                  navigate(`/builder/${activeRun.workflowId}`);
                }}
                className="h-9 px-3.5 rounded-[8px] bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[13px] font-medium text-[#0F172A] flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4 text-[#64748B]" />
                <span>Open Workflow</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  downloadJsonFile(`${activeRun.id}-artifacts.json`, activeRun);
                  pushToast({
                    type: 'info',
                    title: 'Artifacts exported',
                    description: `Saved ${activeRun.id}-artifacts.json`,
                  });
                }}
                className="h-9 px-3.5 rounded-[8px] bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[13px] font-medium text-[#0F172A] flex items-center gap-1.5"
              >
                <Download className="w-4 h-4 text-[#64748B]" />
                <span>Export Artifacts</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveWorkflowId(activeRun.workflowId);
                  navigate(`/builder/${activeRun.workflowId}`);
                }}
                className="h-9 px-3.5 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rerun in Builder</span>
              </button>
            </div>
          </section>

          {/* Timeline + Steps + Node I/O + Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Run Steps */}
            <section className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-[12px] p-4 space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                <h3 className="text-[14px] font-semibold text-[#0F172A]">
                  Node Execution Steps ({activeRun.nodeExecutions.length})
                </h3>
              </div>

              {activeRun.nodeExecutions.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-[#64748B]">
                  No node-level telemetry recorded for this historical batch.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {activeRun.nodeExecutions.map((step) => {
                    const isSel = selectedStep?.nodeId === step.nodeId;
                    return (
                      <button
                        key={step.nodeId}
                        type="button"
                        onClick={() => setSelectedStepId(step.nodeId)}
                        className={`w-full p-2.5 rounded-[8px] border text-left flex items-center justify-between gap-2 transition-colors ${
                          isSel
                            ? 'border-[#2563EB] bg-[#EFF6FF]/60'
                            : 'border-transparent hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#0F172A] truncate">
                            {step.nodeLabel}
                          </div>
                          <div className="text-[11px] font-mono text-[#64748B]">
                            {step.nodeType} · {formatDuration(step.durationMs)}
                          </div>
                        </div>
                        <StatusBadge status={step.status} compact />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Right: Timeline + Node Input/Output + Logs */}
            <div className="lg:col-span-8 space-y-6">
              {/* Execution Timeline Gantt */}
              <section className="bg-white border border-[#E5E7EB] rounded-[12px] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold text-[#0F172A]">Execution Timeline</h3>
                  <span className="text-[12px] font-mono text-[#64748B] tabular-nums">
                    Total: {formatDuration(activeRun.durationMs)}
                  </span>
                </div>

                <div className="h-11 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[8px] p-1.5 flex items-center gap-1">
                  {activeRun.nodeExecutions.length === 0 ? (
                    <div className="w-full h-full rounded-[6px] bg-[#DCFCE7] border border-[#BBF7D0]" />
                  ) : (
                    activeRun.nodeExecutions.map((step) => {
                      const pct = Math.max((step.durationMs / totalStepDuration) * 100, 6);
                      const colorClass =
                        step.status === 'failed'
                          ? 'bg-[#DC2626] border-[#B91C1C] text-white'
                          : step.status === 'running'
                            ? 'bg-[#2563EB] border-[#1D4ED8] text-white'
                            : 'bg-[#DCFCE7] border-[#86EFAC] text-[#16A34A]';
                      return (
                        <button
                          key={step.nodeId}
                          type="button"
                          onClick={() => setSelectedStepId(step.nodeId)}
                          style={{ width: `${pct}%` }}
                          title={`${step.nodeLabel} (${formatDuration(step.durationMs)})`}
                          className={`h-7 rounded-[6px] border px-1.5 text-[10px] font-mono font-semibold truncate transition-opacity hover:opacity-90 ${colorClass}`}
                        >
                          {step.nodeLabel}
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Selected Step Input/Output Inspector */}
              {selectedStep && (
                <section className="bg-white border border-[#E5E7EB] rounded-[12px] p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#0F172A]">
                        Node Payload Inspection — {selectedStep.nodeLabel}
                      </h3>
                      <p className="text-[11px] font-mono text-[#64748B]">
                        Duration: {formatDuration(selectedStep.durationMs)}
                      </p>
                    </div>
                    <StatusBadge status={selectedStep.status} compact />
                  </div>

                  {selectedStep.error && (
                    <div className="p-3 rounded-[8px] bg-[#FEE2E2] border border-[#FECACA] font-mono text-[12px] text-[#DC2626]">
                      {selectedStep.error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[12px] font-semibold text-[#0F172A]">Input JSON</span>
                      <CodeEditor
                        language="json"
                        height="160px"
                        readOnly
                        value={JSON.stringify(selectedStep.input ?? {}, null, 2)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[12px] font-semibold text-[#0F172A]">Output JSON</span>
                      <CodeEditor
                        language="json"
                        height="160px"
                        readOnly
                        value={JSON.stringify(selectedStep.output ?? {}, null, 2)}
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Structured Log Viewer */}
              <section className="bg-white border border-[#E5E7EB] rounded-[12px] overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 bg-[#F8FAFC]">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-mono font-semibold text-[#0F172A]">
                      logs / execution.log
                    </span>
                    <div className="flex items-center gap-1">
                      {(['ALL', 'INFO', 'DEBUG', 'WARN', 'ERROR'] as const).map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setLogLevelFilter(lvl)}
                          className={`px-2 py-0.5 rounded-[6px] font-mono text-[11px] font-medium ${
                            logLevelFilter === lvl
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-white border border-[#E5E7EB] text-[#64748B] hover:text-[#0F172A]'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Filter logs..."
                      className="h-7 px-2.5 rounded-[6px] border border-[#E5E7EB] bg-white text-[12px] w-40"
                    />
                    <button
                      type="button"
                      onClick={() => clearExecutionLogs(activeRun.id)}
                      className="h-7 px-2.5 rounded-[6px] border border-[#E5E7EB] bg-white hover:bg-[#F1F5F9] text-[12px] text-[#64748B] flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const text = activeRun.logs
                          .map((l) => `[${l.timestamp}] ${l.level} ${l.nodeLabel ? `[${l.nodeLabel}] ` : ''}${l.message}`)
                          .join('\n');
                        downloadTextFile(`${activeRun.id}.log`, text);
                      }}
                      className="h-7 px-2.5 rounded-[6px] border border-[#E5E7EB] bg-white hover:bg-[#F1F5F9] text-[12px] text-[#0F172A] flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>

                <div className="p-4 font-mono text-[12px] leading-relaxed bg-[#F8FAFC] max-h-72 overflow-y-auto space-y-1">
                  {filteredLogs.length === 0 ? (
                    <div className="py-6 text-center text-[#64748B] font-sans text-[13px]">
                      No log entries match the current filter.
                    </div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="text-[#94A3B8] shrink-0">[{log.timestamp}]</span>
                        <span
                          className={`font-semibold w-12 shrink-0 ${
                            log.level === 'ERROR'
                              ? 'text-[#DC2626]'
                              : log.level === 'WARN'
                                ? 'text-[#D97706]'
                                : log.level === 'DEBUG'
                                  ? 'text-[#2563EB]'
                                  : 'text-[#16A34A]'
                          }`}
                        >
                          {log.level}
                        </span>
                        {log.nodeLabel && (
                          <span className="text-[#475569] shrink-0">[{log.nodeLabel}]</span>
                        )}
                        <span className="text-[#0F172A] break-all">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
