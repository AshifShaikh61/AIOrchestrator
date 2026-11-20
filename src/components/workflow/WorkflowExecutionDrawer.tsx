import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp, Terminal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type {
  ExecutionLogEntry,
  NodeExecutionRecord,
  ValidationIssue,
} from '../../types/orchestrator';
import { formatDuration } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

interface WorkflowExecutionDrawerProps {
  open: boolean;
  onToggleOpen: () => void;
  logs: ExecutionLogEntry[];
  nodeRecords: NodeExecutionRecord[];
  validationIssues: ValidationIssue[];
  isRunning: boolean;
  onClearLogs: () => void;
  onFocusNode: (nodeId: string) => void;
}

export function WorkflowExecutionDrawer({
  open,
  onToggleOpen,
  logs,
  nodeRecords,
  validationIssues,
  isRunning,
  onClearLogs,
  onFocusNode,
}: WorkflowExecutionDrawerProps) {
  const [tab, setTab] = useState<'logs' | 'trace' | 'validation'>('logs');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  const errorCount = validationIssues.filter((v) => v.severity === 'error').length;
  const warnCount = validationIssues.filter((v) => v.severity === 'warning').length;

  const activeTrace =
    nodeRecords.find((r) => r.nodeId === selectedTraceId) ?? nodeRecords[nodeRecords.length - 1];

  return (
    <div className="bg-white border-t border-[#E5E7EB] flex flex-col shrink-0 z-20">
      {/* Drawer Header Bar */}
      <div className="h-10 px-4 flex items-center justify-between bg-[#F8FAFC] border-b border-[#E5E7EB]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setTab('logs');
              if (!open) onToggleOpen();
            }}
            className={`h-10 px-1 text-[12px] font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              tab === 'logs' && open
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Execution Logs ({logs.length})</span>
            {isRunning && <StatusBadge status="running" compact />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('trace');
              if (!open) onToggleOpen();
            }}
            className={`h-10 px-1 text-[12px] font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              tab === 'trace' && open
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <span>Node I/O Trace ({nodeRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('validation');
              if (!open) onToggleOpen();
            }}
            className={`h-10 px-1 text-[12px] font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              tab === 'validation' && open
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <span>Validation</span>
            {(errorCount > 0 || warnCount > 0) && (
              <span
                className={`px-1.5 py-0.5 rounded-[6px] font-mono text-[10px] ${
                  errorCount > 0
                    ? 'bg-[#FEE2E2] text-[#DC2626]'
                    : 'bg-[#FEF3C7] text-[#D97706]'
                }`}
              >
                {errorCount + warnCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {open && tab === 'logs' && logs.length > 0 && (
            <button
              type="button"
              onClick={onClearLogs}
              className="h-7 px-2 rounded-[6px] text-[11px] font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-white border border-transparent hover:border-[#E5E7EB] flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onToggleOpen}
            className="p-1 rounded-[6px] text-[#64748B] hover:text-[#0F172A] hover:bg-white"
            aria-label={open ? 'Collapse execution panel' : 'Expand execution panel'}
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Drawer Content */}
      {open && (
        <div className="h-52 overflow-hidden flex flex-col bg-white">
          {tab === 'logs' && (
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[12px] space-y-1 bg-[#F8FAFC]">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#64748B] text-[13px] font-sans">
                  Click Run Workflow to execute the graph and stream live execution logs.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
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
                      <button
                        type="button"
                        onClick={() => log.nodeId && onFocusNode(log.nodeId)}
                        className="text-[#2563EB] hover:underline shrink-0"
                      >
                        [{log.nodeLabel}]
                      </button>
                    )}
                    <span className="text-[#0F172A] break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'trace' && (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
              <div className="md:col-span-5 border-r border-[#E5E7EB] overflow-y-auto divide-y divide-[#E5E7EB]">
                {nodeRecords.length === 0 ? (
                  <div className="p-4 text-[13px] text-[#64748B]">
                    No node executions recorded in this session yet.
                  </div>
                ) : (
                  nodeRecords.map((rec) => (
                    <button
                      key={rec.nodeId}
                      type="button"
                      onClick={() => {
                        setSelectedTraceId(rec.nodeId);
                        onFocusNode(rec.nodeId);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-[#F8FAFC] transition-colors ${
                        activeTrace?.nodeId === rec.nodeId ? 'bg-[#EFF6FF]' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold text-[#0F172A] truncate">
                          {rec.nodeLabel}
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B]">
                          {rec.nodeType} · {formatDuration(rec.durationMs)}
                        </div>
                      </div>
                      <StatusBadge status={rec.status} compact />
                    </button>
                  ))
                )}
              </div>
              <div className="md:col-span-7 overflow-y-auto p-3 bg-[#F8FAFC] font-mono text-[11px] space-y-2">
                {activeTrace ? (
                  <>
                    <div className="text-[#64748B] font-semibold">
                      OUTPUT — {activeTrace.nodeLabel}
                    </div>
                    <pre className="p-2.5 rounded-[8px] bg-white border border-[#E5E7EB] text-[#0F172A] overflow-x-auto">
                      {JSON.stringify(activeTrace.output ?? activeTrace.error ?? {}, null, 2)}
                    </pre>
                  </>
                ) : (
                  <div className="text-[#64748B] font-sans text-[13px]">
                    Select an executed node step to inspect its captured payload.
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'validation' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#F8FAFC]">
              {validationIssues.length === 0 ? (
                <div className="p-3 rounded-[8px] bg-[#DCFCE7] text-[#16A34A] text-[13px] font-medium">
                  Graph validation passed with 0 errors and 0 warnings.
                </div>
              ) : (
                validationIssues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => issue.nodeId && onFocusNode(issue.nodeId)}
                    className={`w-full text-left p-2.5 rounded-[8px] border flex items-start gap-2.5 transition-colors ${
                      issue.severity === 'error'
                        ? 'bg-[#FEE2E2]/60 border-[#FECACA] text-[#DC2626]'
                        : 'bg-[#FEF3C7]/60 border-[#FDE68A] text-[#D97706]'
                    }`}
                  >
                    {issue.severity === 'error' ? (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div className="text-[12px] font-medium">{issue.message}</div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
