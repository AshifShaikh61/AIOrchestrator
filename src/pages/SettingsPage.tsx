import { Download, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useOrchestratorStore } from '../store/useOrchestratorStore';
import type { LlmProvider } from '../types/orchestrator';
import { downloadJsonFile } from '../utils/formatters';

export function SettingsPage() {
  const settings = useOrchestratorStore((s) => s.settings);
  const agents = useOrchestratorStore((s) => s.agents);
  const workflows = useOrchestratorStore((s) => s.workflows);
  const executions = useOrchestratorStore((s) => s.executions);
  const schedules = useOrchestratorStore((s) => s.schedules);
  const updateSettings = useOrchestratorStore((s) => s.updateSettings);
  const resetWorkspaceData = useOrchestratorStore((s) => s.resetWorkspaceData);
  const pushToast = useOrchestratorStore((s) => s.pushToast);

  const [form, setForm] = useState(settings);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    pushToast({
      type: 'success',
      title: 'Workspace settings saved',
      description: 'Updated execution engine defaults and team metadata.',
    });
  };

  const handleExportWorkspace = () => {
    downloadJsonFile('robility-workspace-backup.json', {
      exportedAt: new Date().toISOString(),
      settings,
      agents,
      workflows,
      schedules,
      executions,
    });
    pushToast({
      type: 'info',
      title: 'Workspace exported',
      description: 'Downloaded robility-workspace-backup.json',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[#0F172A]">
          Workspace & Engine Settings
        </h1>
        <p className="text-[14px] text-[#64748B] mt-1">
          Configure default model bindings, simulated execution timing, and workspace persistence.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-[#E5E7EB] rounded-[12px] p-6 space-y-6 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
      >
        <section className="space-y-4">
          <h2 className="text-[15px] font-semibold text-[#0F172A] pb-2 border-b border-[#E5E7EB]">
            Organization & Workspace Identity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-[#0F172A]">Workspace Name</label>
              <input
                value={form.workspaceName}
                onChange={(e) => setForm({ ...form, workspaceName: e.target.value })}
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-[#0F172A]">Team Label</label>
              <input
                value={form.teamName}
                onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-[#0F172A]">Admin Name</label>
              <input
                value={form.adminName}
                onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] text-[13px]"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[15px] font-semibold text-[#0F172A] pb-2 border-b border-[#E5E7EB]">
            Orchestration Defaults & Simulation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-[#0F172A]">
                Default LLM Provider
              </label>
              <select
                value={form.defaultProvider}
                onChange={(e) =>
                  setForm({ ...form, defaultProvider: e.target.value as LlmProvider })
                }
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] bg-white text-[13px]"
              >
                <option value="Azure OpenAI">Azure OpenAI</option>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Google Gemini">Google Gemini</option>
                <option value="Ollama Local">Ollama Local</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-[#0F172A]">Default Model</label>
              <input
                value={form.defaultModel}
                onChange={(e) => setForm({ ...form, defaultModel: e.target.value })}
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-[#0F172A]">
                Default Node Timeout (seconds)
              </label>
              <input
                type="number"
                min={5}
                max={3600}
                value={form.defaultTimeoutSeconds}
                onChange={(e) =>
                  setForm({ ...form, defaultTimeoutSeconds: Number(e.target.value) })
                }
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[12px] font-medium text-[#0F172A]">
                Simulated Step Delay (ms)
              </label>
              <input
                type="number"
                min={150}
                max={3000}
                step={50}
                value={form.simulationStepDelayMs}
                onChange={(e) =>
                  setForm({ ...form, simulationStepDelayMs: Number(e.target.value) })
                }
                className="w-full h-[38px] px-3 rounded-[8px] border border-[#E5E7EB] font-mono text-[13px]"
              />
            </div>
          </div>

          <label className="flex items-center justify-between p-3 rounded-[8px] bg-[#F8FAFC] border border-[#E5E7EB] cursor-pointer">
            <div>
              <div className="text-[13px] font-medium text-[#0F172A]">
                Enable Structured Audit Logging
              </div>
              <div className="text-[12px] text-[#64748B]">
                Persist node-level input/output payloads and execution timestamps locally.
              </div>
            </div>
            <input
              type="checkbox"
              checked={form.enableAuditLogs}
              onChange={(e) => setForm({ ...form, enableAuditLogs: e.target.checked })}
              className="w-4 h-4 accent-[#2563EB]"
            />
          </label>
        </section>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="submit"
            className="h-9 px-4 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Data Backup & Reset */}
      <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-semibold text-[#0F172A]">Workspace Data Management</h3>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Export all workflows, agents, and run history as JSON, or restore factory seed data.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportWorkspace}
            className="h-9 px-3.5 rounded-[8px] border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] text-[13px] font-medium text-[#0F172A] flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-[#64748B]" />
            Export Backup
          </button>
          <button
            type="button"
            onClick={() => setResetDialogOpen(true)}
            className="h-9 px-3.5 rounded-[8px] bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] text-[13px] font-semibold flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Demo Data
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={resetDialogOpen}
        title="Reset Workspace to Seed Data"
        description="This will overwrite any custom workflows, agents, schedules, and execution logs stored in your browser with the default seed workspace."
        confirmLabel="Reset Workspace"
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={() => {
          resetWorkspaceData();
          setResetDialogOpen(false);
          pushToast({
            type: 'info',
            title: 'Workspace reset',
            description: 'Restored default agents, workflows, schedules, and run history.',
          });
        }}
      />
    </div>
  );
}
