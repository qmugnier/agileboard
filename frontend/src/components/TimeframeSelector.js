import React from 'react';
import clsx from 'clsx';
import { FiChevronDown } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

/**
 * TimeframeSelector Component
 * Allows users to switch between different analytics timeframes:
 * - 'auto': Smart selection (active sprint → last closed → project)
 * - 'active': Current active sprint only
 * - 'last_closed': Last closed sprint
 * - 'project': Entire project data
 */
export const TimeframeSelector = ({ 
  value = 'auto', 
  onChange, 
  loading = false,
  disabled = false,
  className = '',
  compact = false 
}) => {
  const { isDark } = useTheme();

  const options = [
    {
      value: 'auto',
      label: 'Smart (Active/Last Closed)',
      description: 'Auto-selects active sprint or last closed sprint'
    },
    {
      value: 'active',
      label: 'Active Sprint Only',
      description: 'Show only current active sprint'
    },
    {
      value: 'last_closed',
      label: 'Last Closed Sprint',
      description: 'Show the most recent closed sprint'
    },
    {
      value: 'project',
      label: 'Entire Project',
      description: 'Show all sprints (entire history)'
    },
  ];

  const currentOption = options.find(opt => opt.value === value);

  return (
    <div className={clsx('relative inline-block', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading || disabled}
        className={clsx(
          'appearance-none px-4 py-2 pr-10 rounded-lg border transition',
          'font-medium text-sm',
          isDark
            ? 'bg-slate-800 border-slate-700 text-white hover:border-slate-600 disabled:bg-slate-900'
            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 disabled:bg-gray-100',
          loading && 'opacity-50 cursor-not-allowed',
          'focus:outline-none focus:ring-2 focus:ring-blue-500'
        )}
        title={currentOption?.description}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Custom dropdown arrow */}
      <FiChevronDown
        className={clsx(
          'absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none',
          isDark ? 'text-gray-400' : 'text-gray-600'
        )}
        size={16}
      />

      {/* Tooltip on hover (for full width, not in compact mode) */}
      {!compact && (
        <div
          className={clsx(
            'absolute bottom-full left-0 mb-2 px-3 py-2 rounded text-xs whitespace-nowrap opacity-0 hover:opacity-100 transition pointer-events-none',
            isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-700 text-white'
          )}
        >
          {currentOption?.description}
        </div>
      )}
    </div>
  );
};

/**
 * TimeframeInfo Component
 * Displays information about which timeframe is currently selected
 */
export const TimeframeInfo = ({ timeframe = {}, compact = false }) => {
  const { isDark } = useTheme();

  if (!timeframe || !timeframe.type) {
    return null;
  }

  const isProject = timeframe.type === 'project';

  return (
    <div
      className={clsx(
        'py-2 px-3 rounded-lg border transition',
        isDark
          ? 'bg-slate-800 border-slate-700 text-slate-200'
          : 'bg-blue-50 border-blue-200 text-blue-900'
      )}
    >
      {isProject ? (
        <div className={clsx(!compact && 'space-y-1')}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
            Project View
          </p>
          <p className="text-sm font-medium">
            Showing all {timeframe.sprint_count} sprints
          </p>
        </div>
      ) : (
        <div className={clsx(!compact && 'space-y-1')}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
            {timeframe.type === 'auto' ? 'Smart Selection' : timeframe.type.replace('_', ' ')}
          </p>
          <p className="text-sm font-medium">
            {timeframe.sprint_name}
          </p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span
              className={clsx(
                'text-xs px-2 py-1 rounded font-semibold',
                timeframe.status === 'active'
                  ? isDark
                    ? 'bg-green-900/30 text-green-300'
                    : 'bg-green-100 text-green-800'
                  : isDark
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-gray-200 text-gray-800'
              )}
            >
              {timeframe.status === 'active' ? '🟢 Active' : '✓ Closed'}
            </span>
            {!compact && timeframe.start_date && (
              <span className="text-xs opacity-75">
                {new Date(timeframe.start_date).toLocaleDateString()} →{' '}
                {new Date(timeframe.end_date).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeframeSelector;
