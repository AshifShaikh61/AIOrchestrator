import {
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  Pin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { StatusBadge } from '../components/common/StatusBadge';
import { CreateWorkflowModal } from '../components/layout/CreateWorkflowModal';
import { useOrchestratorStore } from '../store/useOrchestratorStore';
import type { WorkflowDefinition } from '../types/orchestrator';
import { downloadJsonFile, formatRelativeTime } from '../utils/formatters';

export function WorkflowsListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WorkflowDefinition['status']>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowDefinition | null>(null);

  const workflows = useOrchestratorStore((s) => s.workflows);
  const setActiveWorkflowId = useOrchestratorStore((s) => s.setActiveWorkflowId);
  const duplicateWorkflow = useOrchestratorStore((s) => s.duplicateWorkflow);
  const deleteWorkflow = useOrchestratorStore((s) => s.deleteWorkflow);
  const togglePinWorkflow = useOrchestratorStore((s) => s.togglePinWorkflow);
  const pushToast = useOrchestratorStore((s) => s.pushToast);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workflows.filter((wf) => {
      const matchesStatus = statusFilter === 'all' || wf.status === statusFilter;
      const matchesQuery =
        !q ||
        wf.name.toLowerCase().includes(q) ||
        wf.description.toLowerCase().includes(q) ||
        wf.id.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [workflows, search, statusFilter]);

  const handleOpen = (wf: WorkflowDefinition) => {
    setActiveWorkflowId(wf.id);
    navigate(`/builder/${wf.id}`);
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#0F172A]">Workflows</h1>
          <p className="text-[14px] text-[#64748B] mt-1">
            Create, version, and orchestrate multi-agent visual pipelines.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="h-9 px-4 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F8FAFC] border border-[#E5E7EB] p-1 rounded-[8px] overflow-x-auto">
          {(
            [
              { id: 'all', label: `All (${workflows.length})` },
              {
                id: 'active',
                label: `Active (${workflows.filter((w) => w.status === 'active').length})`,
              },
              {
                id: 'draft',
                label: `Draft (${workflows.filter((w) => w.status === 'draft').length})`,
              },
              {
                id: 'archived',
                label: `Archived (${workflows.filter((w) => w.status === 'archived').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-[6px] text-[12px] font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter workflows by name or ID..."
            className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Workflow Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-12 text-center space-y-3">
          <GitBranch className="w-8 h-8 text-[#94A3B8] mx-auto" />
          <h3 className="text-[15px] font-semibold text-[#0F172A]">No workflows found</h3>
          <p className="text-[13px] text-[#64748B]">
            Try adjusting your filters or create a new workflow pipeline.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="h-9 px-4 rounded-[8px] bg-[#2563EB] text-white text-[13px] font-semibold"
          >
            Create Workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((wf) => (
            <div
              key={wf.id}
              className="bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-[12px] p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] flex flex-col justify-between gap-4 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => handleOpen(wf)}
                      className="text-[15px] font-semibold text-[#0F172A] hover:text-[#2563EB] text-left truncate block w-full"
                    >
                      {wf.name}
                    </button>
                    <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                      {wf.id} · {wf.version} · Updated {formatRelativeTime(wf.updatedAt)}
                    </div>
                  </div>
                  <StatusBadge status={wf.status} compact />
                </div>

                <p className="text-[13px] text-[#475569] line-clamp-2 leading-relaxed">
                  {wf.description}
                </p>

                <div className="flex items-center gap-4 text-[12px] font-mono text-[#64748B] bg-[#F8FAFC] border border-[#E5E7EB] rounded-[8px] px-3 py-2">
                  <span>{wf.nodes.length} nodes</span>
                  <span>·</span>
                  <span>{wf.edges.length} connections</span>
                  <span>·</span>
                  <span>{wf.versions.length} snapshots</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => togglePinWorkflow(wf.id)}
                    className={`p-1.5 rounded-[8px] border transition-colors ${
                      wf.pinned
                        ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]'
                        : 'border-transparent text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }`}
                    title={wf.pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = duplicateWorkflow(wf.id);
                      if (copy) {
                        pushToast({
                          type: 'success',
                          title: 'Workflow duplicated',
                          description: `Created "${copy.name}".`,
                        });
                      }
                    }}
                    className="p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                    title="Duplicate workflow"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadJsonFile(`${wf.id}.json`, wf);
                      pushToast({ type: 'info', title: 'Exported JSON', description: `${wf.id}.json` });
                    }}
                    className="p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                    title="Export workflow JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(wf)}
                    className="p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                    title="Delete workflow"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpen(wf)}
                  className="h-8 px-3 rounded-[8px] bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] text-[12px] font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Open Builder</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateWorkflowModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Workflow"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All canvas nodes, edges, and version snapshots will be removed.`}
        confirmLabel="Delete Workflow"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteWorkflow(deleteTarget.id);
            pushToast({
              type: 'info',
              title: 'Workflow deleted',
              description: `"${deleteTarget.name}" was removed.`,
            });
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
