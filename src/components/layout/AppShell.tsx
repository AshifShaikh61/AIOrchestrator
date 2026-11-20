import {
  Bell,
  Bot,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  GitBranch,
  LayoutGrid,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PlayCircle,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useOrchestratorStore } from '../../store/useOrchestratorStore';
import { formatRelativeTime } from '../../utils/formatters';
import { CommandPalette } from '../common/CommandPalette';
import { StatusBadge } from '../common/StatusBadge';
import { ToastContainer } from '../common/ToastContainer';
import { CreateWorkflowModal } from './CreateWorkflowModal';

const ROUTE_BREADCRUMBS: Record<string, string> = {
  '/': 'Control Plane',
  '/workflows': 'Agentic Workflows',
  '/builder': 'Orchestration Builder',
  '/agents': 'AI Agents',
  '/runs': 'Execution Traces',
  '/schedules': 'Schedule Calendar',
  '/settings': 'Engine Settings',
};

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const workflows = useOrchestratorStore((s) => s.workflows);
  const executions = useOrchestratorStore((s) => s.executions);
  const settings = useOrchestratorStore((s) => s.settings);
  const activeWorkflowId = useOrchestratorStore((s) => s.activeWorkflowId);
  const setActiveWorkflowId = useOrchestratorStore((s) => s.setActiveWorkflowId);
  const setActiveExecutionId = useOrchestratorStore((s) => s.setActiveExecutionId);
  const setCommandPaletteOpen = useOrchestratorStore((s) => s.setCommandPaletteOpen);

  const location = useLocation();
  const navigate = useNavigate();

  const pinnedWorkflows = workflows.filter((w) => w.pinned);
  const recentRuns = executions.slice(0, 4);
  const failedCount = executions.filter((e) => e.status === 'failed').length;

  const baseRoute = '/' + (location.pathname.split('/')[1] || '');
  const currentBreadcrumb = ROUTE_BREADCRUMBS[baseRoute] ?? 'Overview';
  const activeBuilderWorkflow = workflows.find((w) => w.id === activeWorkflowId);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
    { to: '/workflows', label: 'Workflows', icon: GitBranch, badge: workflows.length },
    { to: `/builder/${activeWorkflowId || workflows[0]?.id || ''}`, label: 'Flow Builder', icon: Network, matchPrefix: '/builder' },
    { to: '/runs', label: 'Runs', icon: PlayCircle },
    { to: '/agents', label: 'Agents', icon: Bot },
    { to: '/schedules', label: 'Schedules', icon: CalendarClock },
    { to: '/settings', label: 'Settings', icon: SlidersHorizontal },
  ];

  const isBuilderView = location.pathname.startsWith('/builder');

  const SidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E5E7EB] select-none">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#E5E7EB] shrink-0">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[8px] bg-[#2563EB] flex items-center justify-center text-white shrink-0">
            <Network className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 leading-tight">
              <div className="text-[15px] font-bold tracking-tight text-[#0F172A] whitespace-nowrap">
                Robility
              </div>
              <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#2563EB] whitespace-nowrap">
                Orchestrator
              </div>
            </div>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          className="hidden lg:flex p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9]"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Team Workspace Card */}
      {!sidebarCollapsed && (
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/settings');
            }}
            className="w-full p-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] rounded-[8px] border border-[#E5E7EB] flex items-center justify-between text-left transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-[6px] bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center font-mono text-[11px] font-bold shrink-0">
                {settings.workspaceName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-[#0F172A] truncate">
                  {settings.workspaceName}
                </div>
                <div className="text-[11px] font-mono text-[#64748B] truncate">
                  {settings.teamName}
                </div>
              </div>
            </div>
            <Settings className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5">
        <nav className="space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const customActive = item.matchPrefix
              ? location.pathname.startsWith(item.matchPrefix)
              : false;

            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => {
                  const active = isActive || customActive;
                  return `flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                      : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] font-medium'
                  }`;
                }}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!sidebarCollapsed && item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 rounded-[6px] bg-[#F1F5F9] text-[#475569] font-mono text-[11px] tabular-nums">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Pinned Workflows */}
        {!sidebarCollapsed && (
          <div>
            <button
              type="button"
              onClick={() => setPinnedExpanded((p) => !p)}
              className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B] hover:text-[#0F172A]"
            >
              <span className="flex items-center gap-1.5">
                <Pin className="w-3 h-3" />
                Pinned Flows
              </span>
              {pinnedExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {pinnedExpanded && (
              <div className="mt-1.5 space-y-0.5 pl-2">
                {pinnedWorkflows.length === 0 ? (
                  <p className="px-3 py-1 text-[12px] text-[#94A3B8]">No pinned workflows</p>
                ) : (
                  pinnedWorkflows.map((wf) => (
                    <button
                      key={wf.id}
                      type="button"
                      onClick={() => {
                        setActiveWorkflowId(wf.id);
                        setMobileMenuOpen(false);
                        navigate(`/builder/${wf.id}`);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-[8px] text-[12px] truncate transition-colors ${
                        location.pathname === `/builder/${wf.id}`
                          ? 'text-[#2563EB] bg-[#EFF6FF] font-medium'
                          : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
                      }`}
                      title={wf.name}
                    >
                      {wf.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Admin User */}
      <div className="p-3 border-t border-[#E5E7EB] shrink-0">
        <button
          type="button"
          onClick={() => {
            setMobileMenuOpen(false);
            navigate('/settings');
          }}
          className="w-full flex items-center gap-2.5 p-1.5 rounded-[8px] hover:bg-[#F8FAFC] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center text-[11px] font-bold shrink-0">
            {settings.adminName.slice(0, 2).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-[#0F172A] truncate">{settings.adminName}</div>
              <div className="text-[11px] font-mono text-[#64748B] truncate">AI Orchestrator Admin</div>
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-150 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {SidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] h-full z-50">{SidebarContent}</aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-150 ${
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60'
        }`}
      >
        {/* Sticky 56px Top Header */}
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-[#E5E7EB] px-4 lg:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav className="flex items-center gap-1.5 text-[13px] min-w-0" aria-label="Breadcrumb">
              <Link to="/" className="text-[#64748B] hover:text-[#0F172A] whitespace-nowrap font-medium">
                Robility Orchestrator
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
              <span className="font-semibold text-[#0F172A] truncate">{currentBreadcrumb}</span>
              {isBuilderView && activeBuilderWorkflow && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 hidden sm:block" />
                  <span className="text-[#64748B] truncate max-w-[200px] hidden sm:block">
                    {activeBuilderWorkflow.name}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center justify-between h-9 w-64 px-3 rounded-[8px] border border-[#E5E7EB] bg-[#F8FAFC] hover:bg-white text-[13px] text-[#64748B] transition-colors"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Search flows, agents, runs...</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-[#E5E7EB] rounded text-[#64748B]">
                ⌘K
              </kbd>
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((o) => !o)}
                className="relative h-9 w-9 rounded-[8px] border border-[#E5E7EB] bg-white hover:bg-[#F8FAFC] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition-colors"
                aria-label="Recent run notifications"
              >
                <Bell className="w-4 h-4" />
                {failedCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#DC2626] text-white font-mono text-[10px] font-semibold flex items-center justify-center">
                    {failedCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setNotificationsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-[12px] shadow-lg z-40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-[#0F172A]">Recent Executions</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/runs');
                        }}
                        className="text-[12px] font-medium text-[#2563EB] hover:underline"
                      >
                        View all
                      </button>
                    </div>
                    <div className="divide-y divide-[#E5E7EB] max-h-72 overflow-y-auto">
                      {recentRuns.map((run) => (
                        <button
                          key={run.id}
                          type="button"
                          onClick={() => {
                            setActiveExecutionId(run.id);
                            setNotificationsOpen(false);
                            navigate(`/runs?runId=${run.id}`);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-[#F8FAFC] transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-[#0F172A] truncate">
                              {run.workflowName}
                            </p>
                            <p className="text-[11px] font-mono text-[#64748B]">
                              {run.id} · {formatRelativeTime(run.startedAt)}
                            </p>
                          </div>
                          <StatusBadge status={run.status} compact />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 px-3.5 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Workflow</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className={`flex-1 min-w-0 ${isBuilderView ? 'overflow-hidden' : 'p-4 lg:p-6'}`}>
          {children}
        </main>
      </div>

      <CreateWorkflowModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />
      <CommandPalette />
      <ToastContainer />
    </div>
  );
}
