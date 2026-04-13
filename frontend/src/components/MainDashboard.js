import React, { useState } from 'react';
import clsx from 'clsx';
import { Header, SprintSelector } from './Header';
import { KanbanBoard } from './KanbanBoard';
import { BacklogView } from './BacklogView';
import { Dashboard } from './Dashboard';
import { WelcomeDashboard } from './WelcomeDashboard';
import ConfigurationView from './ConfigurationView';
import Sidebar from './Sidebar';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

export function MainDashboard() {
  const [view, setView] = useState('dashboard'); // 'dashboard', 'kanban', 'backlog', 'analytics', 'configuration'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { sprints, projects, selectedSprintId, setSelectedSprintId, selectedProjectId, setProjectAndLoadStatuses, loading, error } = useAppContext();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your agile board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('min-h-screen transition-colors', isDark ? 'bg-slate-900' : 'bg-gray-50')}>
      <Sidebar activeView={view} onViewChange={setView} onSidebarToggle={setSidebarOpen} />
      
      <div className={clsx('transition-all duration-300 min-h-screen flex flex-col', sidebarOpen ? 'pl-64' : 'pl-20')}>
        <Header view={view} onViewChange={setView} />

        {(sprints.length > 0 || projects.length > 0) && view !== 'configuration' && view !== 'dashboard' && (
          <SprintSelector
            sprints={sprints}
            selectedSprintId={selectedSprintId}
            onSelect={setSelectedSprintId}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onProjectSelect={setProjectAndLoadStatuses}
          />
        )}

        {error && (
          <div className="max-w-full mx-auto px-6 py-4 w-full">
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        )}

        <main className={clsx('max-w-full mx-auto px-6 py-8 flex-1 w-full', isDark ? 'bg-slate-900' : 'bg-gray-50')}>
          {view === 'dashboard' && <WelcomeDashboard />}
          {view === 'kanban' && <KanbanBoard />}
          {view === 'backlog' && <BacklogView />}
          {view === 'analytics' && <Dashboard />}
          {view === 'configuration' && <ConfigurationView />}
        </main>
      </div>
    </div>
  );
}

export default MainDashboard;
