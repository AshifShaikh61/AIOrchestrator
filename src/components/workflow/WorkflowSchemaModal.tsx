import { Download, History, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOrchestratorStore } from '../../store/useOrchestratorStore';
import type { WorkflowDefinition } from '../../types/orchestrator';
import { downloadJsonFile, formatDateTime } from '../../utils/formatters';
import { CodeEditor } from '../common/CodeEditor';

interface WorkflowSchemaModalProps {
  open: boolean;
  workflow: WorkflowDefinition;
  onClose: () => void;
  onRestoreVersion: (version: string) => void;
}

export function WorkflowSchemaModal({
  open,
  workflow,
  onClose,
  onRestoreVersion,
}: WorkflowSchemaModalProps) {
  const [tab, setTab] = useState<'general' | 'schemas' | 'versions' | 'json'>('general');
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description);
  const [status, setStatus] = useState(workflow.status);
  const [inputSchema, setInputSchema] = useState(workflow.inputSchema);
  const [outputSchema, setOutputSchema] = useState(workflow.outputSchema);
  const [maxConcurrency, setMaxConcurrency] = useState(workflow.executionSettings.maxConcurrency);
  const [globalTimeout, setGlobalTimeout] = useState(workflow.executionSettings.globalTimeoutSeconds);
  const [onErrorPolicy, setOnErrorPolicy] = useState(workflow.executionSettings.onErrorPolicy);

  const updateWorkflow = useOrchestratorStore((s) => s.updateWorkflow);
  const pushToast = useOrchestratorStore((s) => s.pushToast);

  useEffect(() => {
    if (!open) return;
    setName(workflow.name);
    setDescription(workflow.description);
    setStatus(workflow.status);
    setInputSchema(workflow.inputSchema);
    setOutputSchema(workflow.outputSchema);
    setMaxConcurrency(workflow.executionSettings.maxConcurrency);
    setGlobalTimeout(workflow.executionSettings.globalTimeoutSeconds);
    setOnErrorPolicy(workflow.executionSettings.onErrorPolicy);
  }, [open, workflow]);

  if (!open) return null;

  const handleSave = () => {
    updateWorkflow(workflow.id, {
      name: name.trim() || workflow.name,
      description: description.trim(),
      status,
      inputSchema,
      outputSchema,
      executionSettings: {
        ...workflow.executionSettings,
        maxConcurrency,
        globalTimeoutSeconds: globalTimeout,
        onErrorPolicy,
      },
    });
    pushToast({
      type: 'success',
      title: 'Workflow settings updated',
      description: 'Metadata, schemas, and execution policy saved.',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl bg-white border border-[#E5E7EB] rounded-[12px] shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0F172A]">Workflow Settings & Schemas</h2>
            <p className="text-[12px] font-mono text-[#64748B]">
              {workflow.id} · {workflow.version}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-2 border-b border-[#E5E7EB] flex items-center gap-5 bg-[#F8FAFC]">
          {[
            { id: 'general', label: 'General & Policy' },
            { id: 'schemas', label: 'Input / Output Schemas' },
            { id: 'versions', label: `Versions (${workflow.versions.length})` },
            { id: 'json', label: 'Workflow JSON' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={`pb-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'general' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Workflow Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Lifecycle Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as WorkflowDefinition['status'])}
                    className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] text-[13px] bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-[#0F172A]">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-[8px] border border-[#E5E7EB] text-[13px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E5E7EB]">
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Max Concurrency</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={maxConcurrency}
                    onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                    className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-medium text-[#0F172A]">Global Timeout (s)</label>
                  <input
                    type="number"
                    min={10}
                    max={3600}
                    value={globalTimeout}
                    onChange={(e) => setGlobalTimeout(Number(e.target.value))}
                    className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-medium text-[#0F172A]">On Error Policy</label>
                  <select
                    value={onErrorPolicy}
                    onChange={(e) =>
                      setOnErrorPolicy(e.target.value as 'stop' | 'continue' | 'retry')
                    }
                    className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] text-[13px] bg-white"
                  >
                    <option value="stop">Stop Workflow</option>
                    <option value="continue">Continue Independent Branches</option>
                    <option value="retry">Auto-Retry Failed Node</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === 'schemas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-[#0F172A]">Input JSON Schema</label>
                <CodeEditor
                  language="json"
                  height="260px"
                  value={inputSchema}
                  onChange={setInputSchema}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[12px] font-semibold text-[#0F172A]">Output JSON Schema</label>
                <CodeEditor
                  language="json"
                  height="260px"
                  value={outputSchema}
                  onChange={setOutputSchema}
                />
              </div>
            </div>
          )}

          {tab === 'versions' && (
            <div className="space-y-2.5">
              {workflow.versions.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-[#64748B]">
                  No saved version snapshots yet. Use "Save Version" in the builder toolbar to create a checkpoint.
                </div>
              ) : (
                workflow.versions.map((ver) => (
                  <div
                    key={`${ver.version}-${ver.savedAt}`}
                    className="p-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <History className="w-4 h-4 text-[#2563EB] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-[#0F172A] flex items-center gap-2">
                          <span className="font-mono">{ver.version}</span>
                          <span className="text-[12px] font-normal text-[#64748B] truncate">
                            {ver.note}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B]">
                          Saved {formatDateTime(ver.savedAt)} · {ver.nodes.length} nodes
                        </div>
                      </div>
                    </div>
                    {ver.nodes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          onRestoreVersion(ver.version);
                          onClose();
                        }}
                        className="h-8 px-3 rounded-[8px] bg-white border border-[#E5E7EB] hover:bg-[#F1F5F9] text-[12px] font-medium text-[#0F172A] flex items-center gap-1.5 shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#64748B]">
                  Structured JSON representation of nodes, edges, and configuration
                </span>
                <button
                  type="button"
                  onClick={() => downloadJsonFile(`${workflow.id}.json`, workflow)}
                  className="h-8 px-3 rounded-[8px] bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[12px] font-medium flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download JSON
                </button>
              </div>
              <CodeEditor
                language="json"
                height="280px"
                readOnly
                value={JSON.stringify(workflow, null, 2)}
              />
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-[8px] bg-white border border-[#E5E7EB] text-[13px] font-medium text-[#0F172A] hover:bg-[#F8FAFC]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-9 px-4 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
