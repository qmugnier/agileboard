import React, { useState } from 'react';
import { FiMenu, FiX, FiTrello, FiList, FiSettings, FiBarChart2, FiHome } from 'react-icons/fi';
import clsx from 'clsx';
import { useTheme } from '../context/ThemeContext';

const Sidebar = ({ activeView, onViewChange, onSidebarToggle }) => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(true);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onSidebarToggle) onSidebarToggle(newState);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome },
    { id: 'kanban', label: 'Kanban Board', icon: FiTrello },
    { id: 'backlog', label: 'Backlog', icon: FiList },
    { id: 'analytics', label: 'Analytics', icon: FiBarChart2 },
    { id: 'configuration', label: 'Configuration', icon: FiSettings },
  ];

  const handleViewChange = (viewId) => {
    onViewChange(viewId);
  };

  return (
    <div
      className={clsx(
        'fixed left-0 top-0 h-screen transition-all duration-300 z-40 shadow-lg',
        isDark ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-gray-200',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Sidebar Header */}
      <div className={clsx(
        'flex items-center justify-between px-4 py-5 border-b transition-colors',
        isDark ? 'border-slate-700' : 'border-gray-200'
      )}>
        {isOpen ? (
          <div className="flex items-center gap-2 min-w-0">
            <img src="/agile-icon.png" alt="Agile" width="28" height="28" className="flex-shrink-0" />
            <div className={clsx('text-lg font-bold truncate', isDark ? 'text-white' : 'text-slate-900')}>
              Agile Board
            </div>
          </div>
        ) : (
          <div className="flex justify-center w-full">
            <img src="/agile-icon.png" alt="Agile" width="28" height="28" />
          </div>
        )}
        <button
          onClick={handleToggle}
          className={clsx(
            'p-2 rounded-lg transition flex-shrink-0',
            isDark
              ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
              : 'text-gray-600 hover:bg-gray-100 hover:text-slate-900'
          )}
          title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex flex-col gap-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-md transition text-left whitespace-nowrap font-medium text-sm',
                isActive
                  ? isDark
                    ? 'bg-slate-700 text-white'
                    : 'bg-blue-50 text-blue-600'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-slate-900'
              )}
              title={!isOpen ? item.label : ''}
            >
              <Icon size={18} className="flex-shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar;
