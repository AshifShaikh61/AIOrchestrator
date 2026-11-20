import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { AgentsPage } from './pages/AgentsPage';
import { DashboardPage } from './pages/DashboardPage';
import { RunsPage } from './pages/RunsPage';
import { SchedulesPage } from './pages/SchedulesPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkflowBuilderPage } from './pages/WorkflowBuilderPage';
import { WorkflowsListPage } from './pages/WorkflowsListPage';

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/workflows" element={<WorkflowsListPage />} />
          <Route path="/builder" element={<WorkflowBuilderPage />} />
          <Route path="/builder/:workflowId" element={<WorkflowBuilderPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
