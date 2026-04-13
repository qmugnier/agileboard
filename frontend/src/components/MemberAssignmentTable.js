import React from 'react';
import clsx from 'clsx';
import { FiLock, FiChevronUp, FiChevronDown } from 'react-icons/fi';

/**
 * MemberAssignmentTable
 * Displays team members with their assignment counts and toggle buttons for project membership
 */
const MemberAssignmentTable = ({
  teamMembers = [],
  projectMembers = [],
  memberAssignmentCounts = {},
  onToggleMember,
  loading = false,
  sortBy = 'name', // 'name', 'assigned', 'count'
  sortOrder = 'asc', // 'asc', 'desc'
  onSortChange,
  filterAssigned = null, // null = show all, true = show only assigned, false = show only unassigned
  onFilterChange,
}) => {
  
  // Sort the team members
  const getSortedMembers = () => {
    let sorted = [...teamMembers];
    
    const compareValues = (a, b) => {
      let aVal, bVal;
      
      if (sortBy === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortBy === 'assigned') {
        const aAssigned = projectMembers.some(m => m.id === a.id) ? 1 : 0;
        const bAssigned = projectMembers.some(m => m.id === b.id) ? 1 : 0;
        aVal = aAssigned;
        bVal = bAssigned;
      } else if (sortBy === 'count') {
        aVal = memberAssignmentCounts[a.id] || 0;
        bVal = memberAssignmentCounts[b.id] || 0;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    };
    
    sorted.sort(compareValues);
    return sorted;
  };
  
  // Apply filtering
  const getFilteredMembers = () => {
    let members = getSortedMembers();
    
    if (filterAssigned !== null) {
      members = members.filter(member => {
        const isAssigned = projectMembers.some(m => m.id === member.id);
        return filterAssigned ? isAssigned : !isAssigned;
      });
    }
    
    return members;
  };
  
  const filteredMembers = getFilteredMembers();
  const totalAssigned = projectMembers.length;
  const totalMembers = teamMembers.length;
  
  const handleSort = (column) => {
    if (sortBy === column) {
      // Toggle sort order if clicking same column
      onSortChange(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, start with ascending
      onSortChange(column, 'asc');
    }
  };
  
  const SortIcon = ({ column }) => {
    if (sortBy !== column) {
      return <span className="text-gray-400">⇅</span>;
    }
    return sortOrder === 'asc' ? 
      <FiChevronUp size={16} /> : 
      <FiChevronDown size={16} />;
  };
  
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-white">{totalAssigned}</span> of <span className="font-semibold text-gray-900 dark:text-white">{totalMembers}</span> team members assigned
        </div>
        
        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onFilterChange(null)}
            className={clsx(
              'px-3 py-1 rounded text-sm font-medium transition',
              filterAssigned === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            )}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange(true)}
            className={clsx(
              'px-3 py-1 rounded text-sm font-medium transition',
              filterAssigned === true
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            )}
          >
            Assigned
          </button>
          <button
            onClick={() => onFilterChange(false)}
            className={clsx(
              'px-3 py-1 rounded text-sm font-medium transition',
              filterAssigned === false
                ? 'bg-gray-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            )}
          >
            Unassigned
          </button>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Name
                  <SortIcon column="name" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <span className="font-semibold text-gray-900 dark:text-white">Role</span>
              </th>
              <th className="px-6 py-3 text-center">
                <button
                  onClick={() => handleSort('count')}
                  className="flex items-center justify-center gap-2 w-full font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Assignments
                  <SortIcon column="count" />
                </button>
              </th>
              <th className="px-6 py-3 text-center">
                <button
                  onClick={() => handleSort('assigned')}
                  className="flex items-center justify-center gap-2 w-full font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Status
                  <SortIcon column="assigned" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No team members to display
                </td>
              </tr>
            ) : (
              filteredMembers.map((member) => {
                const isAssigned = projectMembers.some(m => m.id === member.id);
                const assignmentCount = memberAssignmentCounts[member.id] || 0;
                const isLocked = isAssigned && assignmentCount > 0;
                const canToggle = !isLocked;
                
                return (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {member.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {member.role || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {assignmentCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm font-medium">
                          {assignmentCount}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => canToggle && onToggleMember(member.id, isAssigned)}
                          disabled={!canToggle || loading}
                          title={!canToggle ? `Locked - Member has ${assignmentCount} assignment(s). Remove assignments first.` : ''}
                          className={clsx(
                            'px-4 py-2 rounded font-medium transition text-sm',
                            !canToggle
                              ? 'cursor-not-allowed opacity-75'
                              : 'cursor-pointer hover:shadow-md',
                            isLocked
                              ? 'bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white'
                              : isAssigned
                              ? 'bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {isAssigned ? '✓ Assigned' : 'Assign'}
                            {isLocked && <FiLock size={14} />}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• <strong>Locked members</strong> have active story assignments. Remove them from stories before unassigning from project.</p>
        <p>• <strong>Assign/Unassign</strong> buttons are disabled while locked to prevent data inconsistency.</p>
      </div>
    </div>
  );
};

export default MemberAssignmentTable;
