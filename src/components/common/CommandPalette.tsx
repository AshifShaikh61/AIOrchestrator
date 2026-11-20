import { Bot, GitBranch, PlayCircle, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrchestratorStore } from '../../store/useOrchestratorStore';

export function CommandPalette() {
  const open = useOrchestratorStore((s) => s.commandPaletteOpen);
  const setOpen = useOrchestratorStore((s) => s.setCommandPaletteOpen);
  const workflows = useOrchestratorStore((s) => s.workflows);
  const agents = useOrchestratorStore((s) => s.agents);
  const executions = useOrchestratorStore((s) => s.executions);
  const setActiveWorkflowId = useOrchestratorStore((s) => s.setActiveWorkflowId);
  const setActiveExecutionId = useOrchestratorStore((s) => s.setActiveExecutionId);

  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedWorkflows = workflows
      .filter((w) => !q || w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q))
      .slice(0, 4);
    const matchedAgents = agents
      .filter((a) => !q || a.name.toLowerCase().includes(q) || a.model.toLowerCase().includes(q))
      .slice(0, 4);
    const matchedRuns = executions
      .filter((r) => !q || r.id.toLowerCase().includes(q) || r.workflowName.toLowerCase().includes(q))
      .slice(0, 4);
    return { matchedWorkflows, matchedAgents, matchedRuns };
  }, [query, workflows, agents, executions]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-900/40 backdrop-blur-[1px] p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white border border-[#E5E7EB] rounded-[12px] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 h-12 border-b border-[#E5E7EB] gap-2.5">
          <Search className="w-4 h-4 text-[#64748B]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workflows, AI agents, or run IDs..."
            className="flex-1 text-[14px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded-[6px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {results.matchedWorkflows.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Workflows
              </div>
              {results.matchedWorkflows.map((wf) => (
                <button
                  key={wf.id}
                  type="button"
                  onClick={() => {
                    setActiveWorkflowId(wf.id);
                    setOpen(false);
                    navigate(`/builder/${wf.id}`);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-[#F8FAFC] text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GitBranch className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span className="text-[13px] font-medium text-[#0F172A] truncate">{wf.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#64748B] shrink-0 ml-2">{wf.version}</span>
                </button>
              ))}
            </div>
          )}

          {results.matchedAgents.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                AI Agents
              </div>
              {results.matchedAgents.map((ag) => (
                <button
                  key={ag.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(`/agents?selected=${ag.id}`);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-[#F8FAFC] text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Bot className="w-4 h-4 text-[#2563EB] shrink-0" />
                    <span className="text-[13px] font-medium text-[#0F172A] truncate">{ag.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#64748B] shrink-0 ml-2">{ag.model}</span>
                </button>
              ))}
            </div>
          )}

          {results.matchedRuns.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Execution Runs
              </div>
              {results.matchedRuns.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => {
                    setActiveExecutionId(run.id);
                    setOpen(false);
                    navigate(`/runs?runId=${run.id}`);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-[#F8FAFC] text-left transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayCircle className="w-4 h-4 text-[#64748B] shrink-0" />
                    <span className="text-[13px] font-medium text-[#0F172A] truncate">
                      {run.id} · {run.workflowName}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#64748B] capitalize shrink-0 ml-2">
                    {run.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.matchedWorkflows.length === 0 &&
            results.matchedAgents.length === 0 &&
            results.matchedRuns.length === 0 && (
              <div className="py-8 text-center text-[13px] text-[#64748B]">
                No matching workflows, agents, or runs found.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
