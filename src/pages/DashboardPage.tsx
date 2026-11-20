import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Download,
  ExternalLink,
  PlayCircle,
  Plus,
  RefreshCw,
  Timer,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../components/common/StatusBadge';
import { useOrchestratorStore } from '../store/useOrchestratorStore';
import type { ExecutionStatus } from '../types/orchestrator';
import { downloadJsonFile, formatDuration, formatRelativeTime } from '../utils/formatters';

const CHART_POINTS = [
  { label: '00:00', total: 140, success: 138, failed: 2 },
  { label: '04:00', total: 185, success: 182, failed: 3 },
  { label: '08:00', total: 260, success: 256, failed: 4 },
  { label: '12:00', total: 340, success: 334, failed: 6 },
  { label: '16:00', total: 310, success: 306, failed: 4 },
  { label: '20:00', total: 420, success: 416, failed: 4 },
  { label: '23:59', total: 380, success: 377, failed: 3 },
];

export function DashboardPage() {
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('24h');
  const [chartSeries, setChartSeries] = useState<'total' | 'success' | 'failed'>('total');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(5);
  const [runFilter, setRunFilter] = useState<'all' | ExecutionStatus>('all');

  const agents = useOrchestratorStore((s) => s.agents);
  const workflows = useOrchestratorStore((s) => s.workflows);
  const executions = useOrchestratorStore((s) => s.executions);
  const schedules = useOrchestratorStore((s) => s.schedules);
  const setActiveExecutionId = useOrchestratorStore((s) => s.setActiveExecutionId);
  const setActiveWorkflowId = useOrchestratorStore((s) => s.setActiveWorkflowId);
  const pushToast = useOrchestratorStore((s) => s.pushToast);
  const navigate = useNavigate();

  const metrics = useMemo(() => {
    const onlineAgents = agents.filter((a) => a.status === 'online').length;
    const totalRuns = executions.length;
    const completedRuns = executions.filter((e) => e.status === 'completed').length;
    const failedRuns = executions.filter((e) => e.status === 'failed').length;
    const runningRuns = executions.filter((e) => e.status === 'running').length;
    const finished = completedRuns + failedRuns;
    const successRate = finished > 0 ? ((completedRuns / finished) * 100).toFixed(1) : '100.0';
    const avgDurationMs =
      totalRuns > 0
        ? Math.round(executions.reduce((sum, e) => sum + e.durationMs, 0) / totalRuns)
        : 0;

    return {
      onlineAgents,
      totalAgents: agents.length,
      totalRuns,
      completedRuns,
      failedRuns,
      runningRuns,
      successRate,
      avgDurationMs,
    };
  }, [agents, executions]);

  const filteredRuns = useMemo(() => {
    return executions
      .filter((r) => runFilter === 'all' || r.status === runFilter)
      .slice(0, 6);
  }, [executions, runFilter]);

  const multiplier = timeframe === '24h' ? 1 : timeframe === '7d' ? 6.5 : 26;
  const maxChartValue = chartSeries === 'failed' ? 15 * multiplier : 450 * multiplier;

  const pointsCoords = CHART_POINTS.map((pt, idx) => {
    const val = pt[chartSeries] * multiplier;
    const x = (idx / (CHART_POINTS.length - 1)) * 680 + 10;
    const y = 148 - (val / maxChartValue) * 124;
    return { x, y, label: pt.label, val: Math.round(val) };
  });

  const linePath = pointsCoords
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${pointsCoords[pointsCoords.length - 1].x.toFixed(1)} 155 L ${pointsCoords[0].x.toFixed(1)} 155 Z`;

  const handleExportReport = () => {
    downloadJsonFile(`robility-orchestrator-overview-${timeframe}.json`, {
      generatedAt: new Date().toISOString(),
      platform: 'Robility Orchestrator',
      timeframe,
      metrics,
      recentExecutions: executions.slice(0, 10),
    });
    pushToast({
      type: 'success',
      title: 'Telemetry report exported',
      description: `Downloaded robility-orchestrator-overview-${timeframe}.json`,
    });
  };

  const activeSchedules = useMemo(
    () => schedules.filter((s) => s.enabled).slice(0, 3),
    [schedules]
  );

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Page Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold tracking-tight text-[#0F172A]">
              AI Orchestration Control Plane
            </h1>
            <StatusBadge status="active" labelOverride="Engine Operational" />
          </div>
          <p className="text-[14px] text-[#64748B] mt-1">
            Real-time multi-agent coordination, DAG pipeline throughput, tool bindings, and scheduled triggers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center p-1 bg-white border border-[#E5E7EB] rounded-[8px]">
            {(
              [
                { id: '24h', label: '24 Hours' },
                { id: '7d', label: '7 Days' },
                { id: '30d', label: '30 Days' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTimeframe(item.id)}
                className={`px-3 py-1 rounded-[6px] text-[12px] font-medium transition-colors whitespace-nowrap ${
                  timeframe === item.id
                    ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportReport}
            className="h-9 px-3.5 rounded-[8px] bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[13px] font-medium text-[#0F172A] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-[#64748B]" />
            <span>Export Report</span>
          </button>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[12px] font-medium text-[#64748B]">Active AI Agents</span>
              <div className="mt-1.5 flex items-baseline gap-1.5 tabular-nums">
                <span className="text-[28px] font-semibold text-[#0F172A]">
                  {metrics.onlineAgents}
                </span>
                <span className="text-[15px] text-[#64748B]">/ {metrics.totalAgents}</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-[8px] bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-[12px] text-[#64748B] flex items-center justify-between">
            <span>
              {agents.reduce((acc, a) => acc + a.tools.filter((t) => t.enabled).length, 0)} MCP &amp; native tools bound
            </span>
            <button
              type="button"
              onClick={() => navigate('/agents')}
              className="text-[#2563EB] font-medium hover:underline"
            >
              Manage
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[12px] font-medium text-[#64748B]">Orchestrated Runs</span>
              <div className="mt-1.5 text-[28px] font-semibold text-[#0F172A] tabular-nums">
                {metrics.totalRuns}
              </div>
            </div>
            <div className="w-9 h-9 rounded-[8px] bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
              <PlayCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-[12px] text-[#64748B] flex items-center justify-between tabular-nums">
            <span>{workflows.filter((w) => w.status === 'active').length} active DAG pipelines</span>
            <button
              type="button"
              onClick={() => navigate('/runs')}
              className="text-[#2563EB] font-medium hover:underline"
            >
              Trace
            </button>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[12px] font-medium text-[#64748B]">Pipeline Success Rate</span>
              <div className="mt-1.5 text-[28px] font-semibold text-[#0F172A] tabular-nums">
                {metrics.successRate}%
              </div>
            </div>
            <div className="w-9 h-9 rounded-[8px] bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-[12px] text-[#64748B] flex items-center justify-between tabular-nums">
            <span className="text-[#16A34A] font-medium">{metrics.completedRuns} passed</span>
            <span className="text-[#DC2626] font-medium">{metrics.failedRuns} failed</span>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[12px] font-medium text-[#64748B]">Avg Orchestration Latency</span>
              <div className="mt-1.5 text-[28px] font-semibold font-mono text-[#0F172A] tabular-nums">
                {formatDuration(metrics.avgDurationMs)}
              </div>
            </div>
            <div className="w-9 h-9 rounded-[8px] bg-[#F1F5F9] text-[#475569] flex items-center justify-center">
              <Timer className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#F1F5F9] text-[12px] text-[#64748B] flex items-center justify-between font-mono">
            <span>{activeSchedules.length} active CRON triggers</span>
            <button
              type="button"
              onClick={() => navigate('/schedules')}
              className="text-[#2563EB] font-sans font-medium hover:underline"
            >
              Calendar
            </button>
          </div>
        </div>
      </section>

      {/* Trends Chart + Live Agent Fleet */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Execution Trends Chart */}
        <div className="xl:col-span-8 bg-white border border-[#E5E7EB] rounded-[12px] p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold text-[#0F172A]">
                Workflow Execution Throughput
              </h2>
              <p className="text-[12px] text-[#64748B]">
                Aggregated run volume across scheduled, webhook, and manual triggers.
              </p>
            </div>
            <div className="flex items-center p-1 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[8px]">
              {(
                [
                  { id: 'total', label: 'Total' },
                  { id: 'success', label: 'Completed' },
                  { id: 'failed', label: 'Failed' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setChartSeries(s.id)}
                  className={`px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition-colors ${
                    chartSeries === s.id
                      ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative bg-[#F8FAFC] border border-[#E5E7EB] rounded-[8px] p-4">
            <svg viewBox="0 0 700 170" className="w-full h-48 overflow-visible">
              <defs>
                <linearGradient id="robilityArea" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={chartSeries === 'failed' ? '#DC2626' : '#2563EB'}
                    stopOpacity="0.22"
                  />
                  <stop
                    offset="100%"
                    stopColor={chartSeries === 'failed' ? '#DC2626' : '#2563EB'}
                    stopOpacity="0.0"
                  />
                </linearGradient>
              </defs>

              {[35, 75, 115, 155].map((y) => (
                <line
                  key={y}
                  x1="10"
                  y1={y}
                  x2="690"
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                />
              ))}

              <path d={areaPath} fill="url(#robilityArea)" />
              <path
                d={linePath}
                fill="none"
                stroke={chartSeries === 'failed' ? '#DC2626' : '#2563EB'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {pointsCoords.map((pt, i) => (
                <g key={pt.label}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredIdx === i ? 5.5 : 4}
                    fill={hoveredIdx === i ? '#2563EB' : '#FFFFFF'}
                    stroke={chartSeries === 'failed' ? '#DC2626' : '#2563EB'}
                    strokeWidth="2"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(i)}
                  />
                  <text
                    x={pt.x}
                    y="168"
                    textAnchor="middle"
                    className="fill-[#64748B] text-[10px] font-mono"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>

            {hoveredIdx !== null && pointsCoords[hoveredIdx] && (
              <div className="mt-2 flex items-center justify-between text-[12px] font-mono text-[#475569] border-t border-[#E5E7EB] pt-2.5">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Window {pointsCoords[hoveredIdx].label}</span>
                </span>
                <span className="font-semibold text-[#0F172A]">
                  {pointsCoords[hoveredIdx].val.toLocaleString()} runs ({chartSeries})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Agent Fleet & Upcoming Schedule Snapshot */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <h2 className="text-[16px] font-semibold text-[#0F172A]">AI Agent Fleet</h2>
                <p className="text-[12px] text-[#64748B]">Autonomous worker nodes &amp; tool bindings</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/agents')}
                className="text-[12px] font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <span>All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {agents.slice(0, 3).map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => navigate(`/agents?selected=${agent.id}`)}
                  className="w-full p-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white hover:border-[#CBD5E1] transition-colors text-left space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[#0F172A] truncate">
                      {agent.name}
                    </span>
                    <StatusBadge status={agent.status} compact />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#64748B]">
                    <span className="truncate">
                      {agent.model} · {agent.tools.filter((t) => t.enabled).length} tools
                    </span>
                    <span className="tabular-nums shrink-0">
                      {agent.avgLatencyMs}ms · {agent.totalRuns.toLocaleString()} runs
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate('/agents?create=1')}
              className="w-full h-9 rounded-[8px] border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] text-[13px] font-medium text-[#0F172A] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-[#2563EB]" />
              <span>Register AI Agent</span>
            </button>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#0F172A]">
                Upcoming Schedule Calendar
              </span>
              <button
                type="button"
                onClick={() => navigate('/schedules')}
                className="text-[12px] font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <span>Open Calendar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1.5">
              {activeSchedules.length === 0 ? (
                <p className="text-[12px] text-[#64748B] py-2">No active CRON schedules.</p>
              ) : (
                activeSchedules.map((sch) => (
                  <button
                    key={sch.id}
                    type="button"
                    onClick={() => navigate('/schedules')}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white text-left flex items-center justify-between gap-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-[#0F172A] truncate">
                        {sch.name}
                      </div>
                      <div className="text-[11px] font-mono text-[#64748B] truncate">
                        {sch.cronExpression} · {sch.timezone}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-[6px] bg-[#DBEAFE] text-[#2563EB] text-[10px] font-mono font-semibold shrink-0">
                      Active
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Workflow Runs Table */}
      <section className="bg-white border border-[#E5E7EB] rounded-[12px] shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-5 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0F172A]">Recent Workflow Runs</h2>
            <p className="text-[12px] text-[#64748B]">
              Execution history across manual, webhook, and CRON-triggered pipelines.
            </p>
          </div>

          <div className="flex items-center p-1 bg-[#F8FAFC] border border-[#E5E7EB] rounded-[8px] overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'failed', label: `Failed (${metrics.failedRuns})` },
                { id: 'running', label: `Running (${metrics.runningRuns})` },
                { id: 'completed', label: 'Completed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRunFilter(tab.id)}
                className={`px-3 py-1 rounded-[6px] text-[12px] font-medium whitespace-nowrap transition-colors ${
                  runFilter === tab.id
                    ? 'bg-white text-[#2563EB] shadow-xs font-semibold'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F8FAFC] text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                <th className="py-3 px-4">Run ID</th>
                <th className="py-3 px-4">Workflow</th>
                <th className="py-3 px-4">Trigger</th>
                <th className="py-3 px-4">Nodes</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[13px]">
              {filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#64748B]">
                    No workflow runs match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-mono text-[12px] font-semibold text-[#2563EB]">
                      {run.id}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveWorkflowId(run.workflowId);
                          navigate(`/builder/${run.workflowId}`);
                        }}
                        className="font-semibold text-[#0F172A] hover:text-[#2563EB] flex items-center gap-1.5 text-left"
                      >
                        <span className="truncate max-w-[260px]">{run.workflowName}</span>
                        <ExternalLink className="w-3 h-3 text-[#94A3B8] shrink-0" />
                      </button>
                      <div className="text-[11px] text-[#64748B]">
                        {formatRelativeTime(run.startedAt)}
                        {run.isSimulated ? ' · Simulated' : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#475569]">{run.trigger}</td>
                    <td className="py-3 px-4 font-mono text-[12px] text-[#475569] tabular-nums">
                      {run.completedNodes}/{run.totalNodes}
                    </td>
                    <td className="py-3 px-4 font-mono text-[12px] text-[#0F172A] tabular-nums">
                      {formatDuration(run.durationMs)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={run.status} compact />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveExecutionId(run.id);
                            navigate(`/runs?runId=${run.id}`);
                          }}
                          className="h-7 px-2.5 rounded-[6px] border border-[#E5E7EB] bg-white hover:bg-[#F1F5F9] text-[12px] font-medium text-[#0F172A]"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveWorkflowId(run.workflowId);
                            navigate(`/builder/${run.workflowId}`);
                          }}
                          className="h-7 px-2.5 rounded-[6px] bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[12px] font-semibold text-[#2563EB] flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Open</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
