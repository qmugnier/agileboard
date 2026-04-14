import React, { useState } from 'react';
import { FiMoon, FiSun, FiLogOut, FiUser, FiPlay, FiSquare, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { sprintAPI } from '../services/api';
import { useAppContext } from '../context/AppContext';

export const Header = ({ view, onViewChange }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className={clsx(
      'transition-colors shadow-sm border-b',
      isDark
        ? 'bg-slate-800 border-slate-700'
        : 'bg-white border-gray-200'
    )}>
      <div className="max-w-full mx-auto px-6 py-3 flex items-center justify-between">
        <div></div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className={clsx(
              'p-2 rounded-lg font-medium transition text-sm',
              isDark
                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            )}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={clsx(
                  'p-2 rounded-lg font-medium transition text-sm flex items-center gap-2',
                  isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                )}
              >
                <FiUser size={18} />
                <span className="hidden sm:inline max-w-[120px] truncate">{user.email}</span>
              </button>

              {showUserMenu && (
                <div
                  className={clsx(
                    'absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50',
                    isDark
                      ? 'bg-slate-700 border border-slate-600'
                      : 'bg-white border border-gray-200'
                  )}
                >
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      handleLogout();
                    }}
                    className={clsx(
                      'w-full text-left px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition',
                      isDark
                        ? 'text-slate-300 hover:bg-slate-600 hover:text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <FiLogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export const SprintSelector = ({ sprints, selectedSprintId, onSelect, projects, selectedProjectId, onProjectSelect }) => {
  const { isDark } = useTheme();
  const { fetchAllData } = useAppContext();
  const [sprintLoading, setSprintLoading] = useState(false);
  const [sprintError, setSprintError] = useState('');
  const getProjectSprints = () => {
    if (!selectedProjectId || !projects) return [];
    
    const currentProject = projects.find(p => p.id === selectedProjectId);
    if (!currentProject) return [];
    
    const forecastedCount = currentProject.num_forecasted_sprints || 5;
    const projectSprints = sprints.filter(s => s.project_id === selectedProjectId);
    
    // Sort by sprint number and limit to forecasted count
    const sortedSprints = projectSprints.sort((a, b) => {
      const numA = parseInt(a.name.split(' ').pop()) || 0;
      const numB = parseInt(b.name.split(' ').pop()) || 0;
      return numA - numB;
    });
    
    return sortedSprints.slice(0, forecastedCount);
  };
  
  const activeSprints = getProjectSprints();
  
  // Find the currently selected sprint object
  const currentSprint = activeSprints.find(s => s.id === selectedSprintId);
  
  const handleStartSprint = async () => {
    if (!currentSprint) return;
    setSprintLoading(true);
    setSprintError('');
    try {
      await sprintAPI.start(currentSprint.id);
      await fetchAllData(); // Refresh to update sprint status
    } catch (err) {
      setSprintError(err.response?.data?.detail || 'Failed to start sprint');
      setTimeout(() => setSprintError(''), 4000);
    } finally {
      setSprintLoading(false);
    }
  };
  
  const handleEndSprint = async () => {
    if (!currentSprint) return;
    if (!window.confirm(`End sprint "${currentSprint.name}"? Non-done stories will move to backlog.`)) return;
    
    setSprintLoading(true);
    setSprintError('');
    try {
      await sprintAPI.end(currentSprint.id);
      await fetchAllData(); // Refresh to update sprint status
    } catch (err) {
      setSprintError(err.response?.data?.detail || 'Failed to end sprint');
      setTimeout(() => setSprintError(''), 4000);
    } finally {
      setSprintLoading(false);
    }
  };
  
  const handleReopenSprint = async () => {
    if (!currentSprint) return;
    setSprintLoading(true);
    setSprintError('');
    try {
      await sprintAPI.reopen(currentSprint.id);
      await fetchAllData(); // Refresh to update sprint status
    } catch (err) {
      setSprintError(err.response?.data?.detail || 'Failed to reopen sprint');
      setTimeout(() => setSprintError(''), 4000);
    } finally {
      setSprintLoading(false);
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'closed':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  return (
    <div className={clsx(
      'transition-colors border-b',
      isDark
        ? 'bg-slate-800 border-slate-700'
        : 'bg-gray-50 border-gray-200'
    )}>
      <div className="max-w-full mx-auto px-6 py-3">
        {sprintError && (
          <div className="mb-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-lg">
            {sprintError}
          </div>
        )}
        
        <div className="flex items-center gap-6 flex-wrap">
          {projects && projects.length > 0 && (
            <div className="flex items-center gap-3">
              <span className={clsx('font-medium text-sm', isDark ? 'text-slate-300' : 'text-gray-600')}>Project:</span>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    onProjectSelect(parseInt(e.target.value));
                  }
                }}
                className={clsx(
                  'px-3 py-2 rounded-md border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500',
                  isDark
                    ? 'bg-slate-700 border-slate-600 text-white focus:ring-blue-400'
                    : 'bg-white border-gray-300 text-gray-900'
                )}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} {project.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <span className={clsx('font-medium text-sm', isDark ? 'text-slate-300' : 'text-gray-600')}>Sprint:</span>
            <select
              value={selectedSprintId || ''}
              onChange={(e) => onSelect(parseInt(e.target.value))}
              className={clsx(
                'px-3 py-2 rounded-md border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500',
                isDark
                  ? 'bg-slate-700 border-slate-600 text-white focus:ring-blue-400'
                  : 'bg-white border-gray-300 text-gray-900'
              )}
            >
              {activeSprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name} {sprint.status === 'active' ? '(Active)' : sprint.status === 'closed' ? '(Closed)' : ''}
                </option>
              ))}
            </select>
          </div>
          
          {currentSprint && (
            <div className="flex items-center gap-2">
              {/* Status Badge */}
              <span className={clsx(
                'text-xs font-semibold px-3 py-1 rounded-full',
                getStatusColor(currentSprint.status)
              )}>
                {getStatusLabel(currentSprint.status)}
              </span>
              
              {/* Sprint Actions */}
              {currentSprint.status === 'not_started' && (
                <button
                  onClick={handleStartSprint}
                  disabled={sprintLoading}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition',
                    sprintLoading
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-green-500 text-white hover:bg-green-600'
                  )}
                  title="Start sprint"
                >
                  <FiPlay size={16} />
                  Start
                </button>
              )}
              
              {currentSprint.status === 'active' && (
                <button
                  onClick={handleEndSprint}
                  disabled={sprintLoading}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition',
                    sprintLoading
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-red-500 text-white hover:bg-red-600'
                  )}
                  title="End sprint"
                >
                  <FiSquare size={16} />
                  End
                </button>
              )}
              
              {currentSprint.status === 'closed' && (
                <button
                  onClick={handleReopenSprint}
                  disabled={sprintLoading}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition',
                    sprintLoading
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                  )}
                  title="Reopen sprint"
                >
                  <FiRefreshCw size={16} />
                  Reopen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
