import React, { useState } from 'react';
import clsx from 'clsx';
import { FiX } from 'react-icons/fi';
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
  const [showError, setShowError] = useState(true);
  const { sprints, projects, selectedSprintId, setSelectedSprintId, selectedProjectId, setProjectAndLoadStatuses, loading, error, clearError } = useAppContext();
  const { isDark } = useTheme();

  // Auto-dismiss error after 2 seconds and clear it from context so it can show again
  React.useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        clearError(); // Clear error from context so next occurrence will trigger effect again
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [error, clearError]);

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

        {error && showError && (
          <div className="max-w-full mx-auto px-6 py-4 w-full">
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded flex justify-between items-start gap-4">
              <span className="flex-1">{error}</span>
              <button onClick={() => setShowError(false)} className="text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100 flex-shrink-0">
                <FiX size={18} />
              </button>
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
