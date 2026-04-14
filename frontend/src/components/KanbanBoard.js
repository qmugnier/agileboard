import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FiAlertCircle, FiEdit2 } from 'react-icons/fi';
import clsx from 'clsx';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { StoryDetailView } from './StoryDetailView';
import { projectAPI, userStoryAPI } from '../services/api';

const Card = React.memo(({ story, blockingInfo, onDragStart, teamMembers, onAssign, onUnassign, statusColor = '#3B82F6', isSprintClosed = false, onOpenDetail, isFinal = false, isProjectClosed = false }) => {
  const [expanded, setExpanded] = useState(false);

  const getEffortColor = (effort) => {
    if (effort <= 5) return 'bg-green-100 text-green-800';
    if (effort <= 8) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getValueColor = (value) => {
    if (value >= 34) return 'bg-purple-100 text-purple-800';
    if (value >= 21) return 'bg-blue-100 text-blue-800';
    return 'bg-cyan-100 text-cyan-800';
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      draggable={story.status !== 'done' && !isSprintClosed && !isFinal}  // Prevent dragging done, final, or closed sprint stories
      onDragStart={(e) => {
        if (story.status === 'done' || isFinal || isSprintClosed) {
          e.preventDefault();
        } else {
          onDragStart(e, story);
        }
      }}
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition p-4 mb-3 active:opacity-75 animate-fadeIn dark:text-gray-100',
        (story.status === 'done' || isFinal || isSprintClosed) ? 'cursor-not-allowed opacity-60' : 'cursor-move hover:shadow-lg',
        isProjectClosed && 'opacity-50'
      )}
      style={{ borderLeftWidth: '4px', borderLeftColor: statusColor }}
    >
      <div onClick={() => !isSprintClosed && setExpanded(!expanded)}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-bold text-gray-500">{story.story_id}</span>
            {story.assigned_to && story.assigned_to.length > 0 && (
              <div
                className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold"
                title={`Assigned to: ${story.assigned_to[0].name}`}
              >
                {getInitials(story.assigned_to[0].name)}
              </div>
            )}
          </div>
          <span className={clsx('text-xs font-semibold px-2 py-1 rounded', getEffortColor(story.effort))}>
            {story.effort} pts
          </span>
        </div>

        <div className="flex items-start gap-2 mb-1">
          <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 break-words whitespace-normal flex-1">
            {story.title}
          </h3>
          <button
            onClick={() => onOpenDetail && onOpenDetail(story.story_id)}
            className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Edit story details"
          >
            <FiEdit2 size={16} />
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
          {story.description}
        </p>

        <div className="flex gap-2 items-center flex-wrap">
          <span className={clsx('text-xs font-semibold px-2 py-1 rounded', getValueColor(story.business_value))}>
            ${story.business_value}
          </span>
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
            {story.epic}
          </span>
          {blockingInfo[story.story_id]?.blockedBy && blockingInfo[story.story_id].blockedBy.length > 0 && (
            <span 
              title={`Blocked by: ${blockingInfo[story.story_id].blockedBy.join(', ')}`}
              className="text-xs font-bold text-red-600 dark:text-red-400"
            >
              🔴 {blockingInfo[story.story_id].blockedBy.length}
            </span>
          )}
          {blockingInfo[story.story_id]?.blocking && blockingInfo[story.story_id].blocking.length > 0 && (
            <span 
              title={`Blocks: ${blockingInfo[story.story_id].blocking.join(', ')}`}
              className="text-xs font-bold text-orange-600 dark:text-orange-400"
            >
              🟠 {blockingInfo[story.story_id].blocking.length}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {story.dependencies && story.dependencies.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 p-2 rounded">
              <FiAlertCircle />
              Depends on: {story.dependencies.join(', ')}
            </div>
          )}

          <div className="mt-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Team Assignment</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {story.assigned_to && story.assigned_to.length > 0? (
                story.assigned_to.map((member) => (
                  <span key={member.id} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded flex items-center gap-1">
                    {member.name}
                    <button
                      onClick={(e) => {
                        if (isSprintClosed) {
                          e.stopPropagation();
                          return;
                        }
                        e.stopPropagation();
                        onUnassign(story.story_id, member.id);
                      }}
                      disabled={isSprintClosed}
                      className={clsx('ml-1 font-bold', isSprintClosed ? 'cursor-not-allowed opacity-50' : 'hover:text-red-600 dark:hover:text-red-400')}
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">Unassigned</span>
              )}
            </div>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onAssign(story.story_id, parseInt(e.target.value));
                  e.target.value = '';
                }
              }}
              onClick={(e) => e.stopPropagation()}
              disabled={isSprintClosed}
              className={clsx(
                'w-full px-2 py-1 rounded text-xs border bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500',
                isSprintClosed
                  ? 'border-gray-300 dark:border-gray-600 opacity-50 cursor-not-allowed'
                  : 'border-gray-300 dark:border-gray-600'
              )}
            >
              <option value="">{isSprintClosed ? 'Sprint closed' : '+ Add team member'}</option>
              {!isSprintClosed && teamMembers && teamMembers.map((member) => {
                const isAssigned = story.assigned_to?.some(a => a.id === member.id);
                return !isAssigned && <option key={member.id} value={member.id}>{member.name}</option>;
              })}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization - only re-render if these specific props change
  return (
    prevProps.story === nextProps.story &&
    prevProps.statusColor === nextProps.statusColor &&
    prevProps.isSprintClosed === nextProps.isSprintClosed &&
    prevProps.isFinal === nextProps.isFinal &&
    prevProps.onDragStart === nextProps.onDragStart &&
    prevProps.onAssign === nextProps.onAssign &&
    prevProps.onUnassign === nextProps.onUnassign &&
    prevProps.onOpenDetail === nextProps.onOpenDetail &&
    prevProps.teamMembers?.length === nextProps.teamMembers?.length
  );
});

const Column = React.memo(({ title, status, stories, blockingInfo, onDragStart, onDragOver, onDrop, teamMembers, statusCount, onAssign, onUnassign, statusColor = '#3B82F6', onColumnDragStart, onColumnDragOver, onColumnDrop, isSprintClosed = false, isProjectClosed = false, onOpenDetail, projectStatusObj = null, columnWidthStyle = { flex: '1 1 auto', minWidth: '250px' } }) => {
  const isFinal = !!projectStatusObj?.is_final;
  return (
    <div
      data-column-status={status}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, status)}
      className="bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition flex flex-col"
      style={columnWidthStyle}
    >
      <div 
        className="mb-2 cursor-grab active:cursor-grabbing sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 p-4 rounded-t-lg"
        draggable
        onDragStart={(e) => onColumnDragStart(e, status)}
        onDragOver={onColumnDragOver}
        onDrop={(e) => onColumnDrop(e, status)}
      >
        <div className="flex items-center gap-3 select-none">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: statusColor }}
            title={`Status color: ${statusColor}`}
          />
          <h2 className="font-bold text-lg text-gray-800 dark:text-white flex-1">
            {title}
            <span className="ml-2 text-sm font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-700 px-2 py-1 rounded">
              {statusCount}
            </span>
          </h2>
        </div>
      </div>

      <div className="space-y-2 min-h-[400px] p-4 pt-0 overflow-y-auto flex-1" data-column-scrollable>
        {stories.map((story) => (
          <Card
            key={story.story_id}
            story={story}
            blockingInfo={blockingInfo}
            onDragStart={onDragStart}
            teamMembers={teamMembers}
            onAssign={onAssign}
            onUnassign={onUnassign}
            statusColor={statusColor}
            isSprintClosed={isSprintClosed}
            onOpenDetail={onOpenDetail}
            isFinal={isFinal}
            isProjectClosed={isProjectClosed}
          />
        ))}

        {stories.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No stories</p>
            <p className="text-xs mt-1">Drag cards here</p>
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memoization - only re-render if these specific props change
  return (
    prevProps.stories === nextProps.stories &&
    prevProps.statusColor === nextProps.statusColor &&
    prevProps.statusCount === nextProps.statusCount &&
    prevProps.isSprintClosed === nextProps.isSprintClosed &&
    prevProps.isProjectClosed === nextProps.isProjectClosed &&
    prevProps.onDragStart === nextProps.onDragStart &&
    prevProps.onDrop === nextProps.onDrop &&
    prevProps.onAssign === nextProps.onAssign &&
    prevProps.onUnassign === nextProps.onUnassign
  );
});

export const KanbanBoard = () => {
  const { userStories, selectedSprintId, projectStatuses, selectedProjectId, projects, updateStoryStatus, moveStoryToSprint, teamMembers, assignStory, unassignStory, sprints } = useAppContext();
  const [draggedStory, setDraggedStory] = useState(null);
  const [draggedColumnStatus, setDraggedColumnStatus] = useState(null);
  
  // Check if current project is closed
  const currentProject = projects?.find(p => p.id === selectedProjectId);
  const isProjectClosed = currentProject?.closed_date ? true : false;
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [selectedStoryDetail, setSelectedStoryDetail] = useState(null);
  const [transitions, setTransitions] = useState([]);
  const [blockingInfo, setBlockingInfo] = useState({}); // { storyId: { blockedBy: [], blocking: [] } }
  const [toggledStatuses, setToggledStatuses] = useState(() => {
    const saved = localStorage.getItem('kanbanToggledStatuses');
    return saved ? JSON.parse(saved) : {};
  });
  const [columnOrder, setColumnOrder] = useState(() => {
    const saved = localStorage.getItem('kanbanColumnOrder');
    return saved ? JSON.parse(saved) : [];
  });
  const [transitionError, setTransitionError] = useState('');
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Track what we've already fetched to prevent infinite loops
  const lastFetchedRef = useRef({ sprintId: null, storyIds: [] });
  
  // Track scroll position for drag and drop with localStorage backup
  const scrollContainerRef = useRef(null);
  const scrollPositionRef = useRef({ scrollX: 0, scrollY: 0 }); // Store main container scroll
  const columnScrollPositionsRef = useRef(new Map()); // Store scroll positions for each column

  // Restore scroll from localStorage if available (for page reloads or major re-renders)
  useEffect(() => {
    const savedScroll = localStorage.getItem('kanbanScrollPosition');
    if (savedScroll) {
      try {
        const { scrollX, scrollY } = JSON.parse(savedScroll);
        // Use multiple timeouts to ensure restoration even if render is slow
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollX;
            scrollContainerRef.current.scrollTop = scrollY;
          }
        }, 100);
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollX;
            scrollContainerRef.current.scrollTop = scrollY;
          }
        }, 300);
        localStorage.removeItem('kanbanScrollPosition');
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Continuously track scroll position so if component re-mounts, we can restore it
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScroll = {
        scrollX: scrollContainer.scrollLeft,
        scrollY: scrollContainer.scrollTop
      };
      scrollPositionRef.current = currentScroll;
      // Save to localStorage as well for persistence across re-mounts
      localStorage.setItem('kanbanScrollPosition', JSON.stringify(currentScroll));
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Track container width for dynamic column sizing
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Set initial width
    setContainerWidth(scrollContainer.clientWidth);

    // Use ResizeObserver to track width changes
    const resizeObserver = new ResizeObserver(() => {
      setContainerWidth(scrollContainer.clientWidth);
    });

    resizeObserver.observe(scrollContainer);

    // Also listen to window resize
    const handleWindowResize = () => {
      if (scrollContainer) {
        setContainerWidth(scrollContainer.clientWidth);
      }
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);
  
  useTheme(); // Hook for theme support (isDark available in context)

  // Get current sprint
  const currentSprint = sprints?.find(s => s.id === selectedSprintId);
  const isSprintClosed = currentSprint?.status === 'closed';

  // Persist toggledStatuses to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kanbanToggledStatuses', JSON.stringify(toggledStatuses));
  }, [toggledStatuses]);

  // Refresh board when project changes
  useEffect(() => {
    setSelectedAssignee(null);
  }, [selectedProjectId]);

  // Fetch valid transitions when project changes
  // Skip if project allows backlog-to-running-sprint (we don't need to validate transitions)
  useEffect(() => {
    if (!selectedProjectId || currentProject?.allow_backlog_to_running_sprint) {
      setTransitions([]);
      return;
    }

    const fetchTransitions = async () => {
      try {
        const res = await projectAPI.getTransitions(selectedProjectId);
        setTransitions(res.data || []);
      } catch (err) {
        console.error('Error fetching transitions:', err);
        setTransitions([]);
      }
    };

    fetchTransitions();
  }, [selectedProjectId, currentProject?.allow_backlog_to_running_sprint]);

  // Get team members for the current project
  const getProjectTeamMembers = () => {
    if (!selectedProjectId || !projects) return teamMembers || [];
    const project = projects.find(p => p.id === selectedProjectId);
    return project?.team_members || [];
  };

  const projectTeamMembers = getProjectTeamMembers();

  // Filter stories by selected project (memoized to prevent unnecessary re-renders)
  const projectStories = useMemo(() => 
    userStories.filter((s) => s.project_id === selectedProjectId),
    [userStories, selectedProjectId]
  );

  const sprintStories = useMemo(() => 
    projectStories.filter((s) => s.sprint_id === selectedSprintId),
    [projectStories, selectedSprintId]
  );

  const globalBacklog = useMemo(() => 
    projectStories.filter((s) => (!s.sprint_id || s.sprint_id === null) && s.status !== 'done'),
    [projectStories]
  );

  // Fetch blocking info for sprint stories - only trigger on actual sprint change
  useEffect(() => {
    const fetchBlockingInfo = async () => {
      if (!selectedSprintId || sprintStories.length === 0) {
        setBlockingInfo({});
        lastFetchedRef.current = { sprintId: null, storyIds: [] };
        return;
      }

      // Check if we've already fetched this exact sprint with these exact stories
      const currentStoryIds = sprintStories.map(s => s.story_id).sort().join(',');
      if (
        lastFetchedRef.current.sprintId === selectedSprintId &&
        lastFetchedRef.current.storyIds === currentStoryIds
      ) {
        // Already fetched these stories for this sprint, skip
        return;
      }

      // Mark that we're fetching this sprint
      lastFetchedRef.current = { sprintId: selectedSprintId, storyIds: currentStoryIds };

      const info = {};
      try {
        await Promise.all(
          sprintStories.map(async (story) => {
            try {
              const [blockedRes, blockingRes] = await Promise.all([
                userStoryAPI.getBlockedBy(story.story_id).catch(() => ({ data: [] })),
                userStoryAPI.getBlocking(story.story_id).catch(() => ({ data: [] }))
              ]);
              info[story.story_id] = {
                blockedBy: (blockedRes.data || []).map(s => s.story_id),
                blocking: (blockingRes.data || []).map(s => s.story_id)
              };
            } catch (err) {
              info[story.story_id] = { blockedBy: [], blocking: [] };
            }
          })
        );
        setBlockingInfo(info);
      } catch (err) {
        console.error('Failed to fetch blocking info:', err);
      }
    };

    fetchBlockingInfo();
  }, [selectedSprintId, sprintStories]);


  // Build columns - always include Backlog, Ready, In Progress, Done
  const columns = useMemo(() => {
    // Filter by assignee if selected
    const filterByAssignee = (stories) => {
      if (!selectedAssignee) return stories;
      if (selectedAssignee === 'unassigned') {
        return stories.filter(s => !s.assigned_to || s.assigned_to.length === 0);
      }
      const assigneeId = parseInt(selectedAssignee);
      return stories.filter(s => s.assigned_to?.some(a => a.id === assigneeId));
    };

    const buildColumns = () => {
      const columnMap = new Map();
      
      // Always add these default columns
      columnMap.set('backlog', {
        title: 'Backlog',
        status: 'backlog',
        color: '#6B7280',
        stories: filterByAssignee(globalBacklog),
        isFixed: true,
        projectStatusObj: null,
      });
      
      columnMap.set('ready', {
        title: 'Ready',
        status: 'ready',
        color: '#3B82F6',
        stories: filterByAssignee(sprintStories.filter(s => s.status === 'ready')),
        isFixed: true,
        projectStatusObj: projectStatuses?.find(s => s.status_name === 'ready') || null,
      });
      
      // Always show in_progress column
      columnMap.set('in_progress', {
        title: 'In Progress',
        status: 'in_progress',
        color: '#F59E0B',
        stories: filterByAssignee(sprintStories.filter(s => s.status === 'in_progress')),
        isFixed: true,
        projectStatusObj: projectStatuses?.find(s => s.status_name === 'in_progress') || null,
      });
      
      // Always show done column
      columnMap.set('done', {
        title: 'Done',
        status: 'done',
        color: '#10B981',
        stories: filterByAssignee(sprintStories.filter(s => s.status === 'done')),
        isFixed: true,
        projectStatusObj: projectStatuses?.find(s => s.status_name === 'done') || null,
      });

      // Add custom project statuses
      if (projectStatuses && projectStatuses.length > 0) {
        projectStatuses.forEach((status) => {
          // Skip default statuses if they're in projectStatuses
          if (!['ready', 'in_progress', 'done'].includes(status.status_name)) {
            const storiesInStatus = sprintStories.filter(s => s.status === status.status_name);
            // Add if toggled ON OR if there are stories in this status
            if (toggledStatuses[status.status_name] || storiesInStatus.length > 0) {
              columnMap.set(status.status_name, {
                title: status.status_name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
                status: status.status_name,
                color: status.color,
                is_locked: status.is_locked,
                stories: filterByAssignee(storiesInStatus),
                isFixed: false,
                projectStatusObj: status,
              });
            }
          }
        });
      }

      // Apply column order from localStorage
      const orderedStatuses = [
        'backlog',
        ...columnOrder.filter(s => s !== 'backlog' && columnMap.has(s)),
        ...Array.from(columnMap.keys()).filter(s => s !== 'backlog' && !columnOrder.includes(s))
      ];

      return orderedStatuses.map(status => columnMap.get(status)).filter(Boolean);
    };

    return buildColumns();
  }, [sprintStories, globalBacklog, selectedAssignee, projectStatuses, toggledStatuses, columnOrder]);

  // Calculate optimal column width for no-scroll layout
  const columnWidthStyle = useMemo(() => {
    if (!columns || columns.length === 0 || !containerWidth) {
      // Use flex until containerWidth is ready
      return { flex: '1 1 auto', minWidth: '150px' };
    }

    const GAP_SIZE = 12; // gap-3 = 0.75rem = 12px
    const totalGapsWidth = GAP_SIZE * (columns.length - 1);
    // No scrollbar buffer needed - columns should fit without scrolling
    const availableWidth = containerWidth - totalGapsWidth;
    const columnWidth = Math.max(150, Math.floor(availableWidth / columns.length));

    // Debug: log calculations during development
    if (process.env.NODE_ENV === 'development') {
      const totalWidth = columnWidth * columns.length + totalGapsWidth;
      console.log(`Kanban - Columns: ${columns.length}, Available: ${availableWidth}px, Column Width: ${columnWidth}px, Total needed: ${totalWidth}px, Container: ${containerWidth}px, Fit: ${totalWidth <= containerWidth ? 'YES ✓' : 'NO ✗'}`);
    }

    // Use exact calculated width to fit viewport
    return { flex: '0 0 auto', width: `${columnWidth}px`, minWidth: `${columnWidth}px` };
  }, [columns, containerWidth]);

  const handleDragStart = (e, story) => {
    if (isSprintClosed || isProjectClosed) {
      e.preventDefault();
      return;
    }
    // Save main container scroll position AND column scroll positions before starting drag
    const currentScroll = {
      scrollX: scrollContainerRef.current?.scrollLeft || 0,
      scrollY: scrollContainerRef.current?.scrollTop || 0
    };
    scrollPositionRef.current = currentScroll;
    // Also save to localStorage as backup in case of major re-render
    localStorage.setItem('kanbanScrollPosition', JSON.stringify(currentScroll));
    saveColumnScrollPositions();
    setDraggedStory(story);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragStart = (e, status) => {
    // Save main container scroll position AND column scroll positions before starting drag
    const currentScroll = {
      scrollX: scrollContainerRef.current?.scrollLeft || 0,
      scrollY: scrollContainerRef.current?.scrollTop || 0
    };
    scrollPositionRef.current = currentScroll;
    // Also save to localStorage as backup in case of major re-render
    localStorage.setItem('kanbanScrollPosition', JSON.stringify(currentScroll));
    saveColumnScrollPositions();
    setDraggedColumnStatus(status);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColumnDrop = (e, targetStatus) => {
    e.preventDefault();
    if (!draggedColumnStatus || draggedColumnStatus === targetStatus) {
      setDraggedColumnStatus(null);
      return;
    }

    // Reorder columns
    const newOrder = columnOrder.filter(s => s !== draggedColumnStatus);
    const draggedIndex = columns.findIndex(c => c.status === draggedColumnStatus);
    const targetIndex = columns.findIndex(c => c.status === targetStatus);
    
    const targetPosition = newOrder.findIndex(s => s === targetStatus);
    if (draggedIndex < targetIndex) {
      newOrder.splice(targetPosition + 1, 0, draggedColumnStatus);
    } else {
      newOrder.splice(targetPosition, 0, draggedColumnStatus);
    }
    
    setColumnOrder(newOrder);
    localStorage.setItem('kanbanColumnOrder', JSON.stringify(newOrder));
    
    // Restore scroll positions after state update with multiple attempts
    const restoreScroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollPositionRef.current.scrollX;
        scrollContainerRef.current.scrollTop = scrollPositionRef.current.scrollY;
      }
      restoreColumnScrollPositions();
    };
    
    // Try multiple times to ensure scroll is restored even if render is slow
    setTimeout(restoreScroll, 0);
    setTimeout(restoreScroll, 50);
    setTimeout(restoreScroll, 150);
    
    setDraggedColumnStatus(null);
  };

  const handleDragOver = (e) => {
    if (isSprintClosed) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Helper function to save scroll positions of all columns
  const saveColumnScrollPositions = () => {
    columnScrollPositionsRef.current.clear();
    const columns = document.querySelectorAll('[data-column-status]');
    columns.forEach((column) => {
      const status = column.getAttribute('data-column-status');
      const scrollable = column.querySelector('[data-column-scrollable]');
      if (scrollable) {
        columnScrollPositionsRef.current.set(status, scrollable.scrollTop);
      }
    });
  };

  // Helper function to restore scroll positions of all columns
  const restoreColumnScrollPositions = () => {
    setTimeout(() => {
      const columns = document.querySelectorAll('[data-column-status]');
      columns.forEach((column) => {
        const status = column.getAttribute('data-column-status');
        const scrollable = column.querySelector('[data-column-scrollable]');
        if (scrollable && columnScrollPositionsRef.current.has(status)) {
          scrollable.scrollTop = columnScrollPositionsRef.current.get(status);
        }
      });
    }, 0);
  };

  // Helper function to check if a transition is valid
  const isValidTransition = (fromStatus, toStatus, storySprintId) => {
    // Prevent moving to the same status
    if (fromStatus === toStatus) {
      return false;
    }

    // When toggle is on and sprint is active, treat it like a non-active sprint
    const effectiveSprintStatus = (currentSprint?.status === 'active' && currentProject?.allow_backlog_to_running_sprint)
      ? 'non-active'
      : currentSprint?.status;

    // Special case: if moving from backlog and project allows it, only to ready
    if (!storySprintId && currentProject?.allow_backlog_to_running_sprint) {
      return toStatus === 'ready';
    }

    // Backlog stories (no sprint)
    if (!storySprintId) {
      if (effectiveSprintStatus !== 'active') {
        return toStatus === 'ready';
      }
      if (effectiveSprintStatus === 'active') {
        return false;
      }
      return true;
    }

    // Assigned stories in non-active or active-with-toggle sprints: ONLY backlog ↔ ready
    if (effectiveSprintStatus !== 'active') {
      const isBacklogReady = 
        (fromStatus === 'backlog' && toStatus === 'ready') ||
        (fromStatus === 'ready' && toStatus === 'backlog');
      return isBacklogReady;
    }

    // Active sprint without toggle: check workflow transitions
    const fromStatusId = getStatusId(fromStatus);
    const toStatusId = getStatusId(toStatus);

    // If either status doesn't exist in the project, allow it (might be custom status)
    if (!fromStatusId || !toStatusId) {
      return true;
    }

    // Check if the explicit forward transition exists (fromStatus → toStatus)
    const forwardTransitionExists = Array.isArray(transitions) && transitions.some(
      t => t.from_status_id === fromStatusId && t.to_status_id === toStatusId
    );

    // Check if the implicit backward transition exists (toStatus → fromStatus)
    // This allows bidirectional flow: if A→B is defined, you can also go B→A
    const backwardTransitionExists = Array.isArray(transitions) && transitions.some(
      t => t.from_status_id === toStatusId && t.to_status_id === fromStatusId
    );

    const transitionExists = forwardTransitionExists || backwardTransitionExists;

    if (!transitionExists) {
      console.log(`Transition blocked: ${fromStatus} (${fromStatusId}) ↔ ${toStatus} (${toStatusId}). Not found in workflow`);
    }
    
    return transitionExists;
  };

  // Helper function to get status ID from status name
  const getStatusId = (statusName) => {
    const status = projectStatuses?.find(s => s.status_name === statusName);
    const id = status?.id || null;
    if (!id) {
      console.warn(`Status "${statusName}" not found in project statuses`, projectStatuses);
    }
    return id;
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (isSprintClosed || !draggedStory) {
      return;
    }

    // Validate transition
    if (!isValidTransition(draggedStory.status, newStatus, draggedStory.sprint_id)) {
      const fromStatusDisplay = draggedStory.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const toStatusDisplay = newStatus.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      // Provide more specific error message based on sprint status
      if (currentSprint && currentSprint.status === 'closed') {
        setTransitionError('⚠️ Closed sprints are locked. Reopen final stories via backlog.');
      } else if (currentSprint && currentSprint.status !== 'active') {
        setTransitionError('⚠️ Non-active sprints only allow "Backlog ↔ Ready" transitions.');
      } else {
        setTransitionError(`⚠️ Cannot move from "${fromStatusDisplay}" to "${toStatusDisplay}" - not allowed by workflow`);
      }
      setTimeout(() => setTransitionError(''), 4000);
      console.warn(`Invalid transition from ${draggedStory.status} to ${newStatus}`);
      setDraggedStory(null);
      return;
    }
    
    try {
      // Moving to backlog column: remove from sprint AND set status to 'backlog'
      if (newStatus === 'backlog' && draggedStory.sprint_id) {
        moveStoryToSprint(draggedStory.story_id, null, 'backlog').catch(() => {});
      } 
      // Moving from backlog to a sprint: assign to current sprint with the target status
      else if (!draggedStory.sprint_id || draggedStory.sprint_id === null) {
        moveStoryToSprint(draggedStory.story_id, selectedSprintId, newStatus).catch(() => {});
      } 
      // Moving within a sprint: just update the status
      else {
        updateStoryStatus(draggedStory.story_id, newStatus).catch(() => {});
      }
    } catch (err) {
      // Error already in context, just suppress the exception
    }
    
    // Restore scroll positions after state update with multiple attempts
    const restoreScroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollPositionRef.current.scrollX;
        scrollContainerRef.current.scrollTop = scrollPositionRef.current.scrollY;
      }
      restoreColumnScrollPositions();
    };
    
    // Try multiple times to ensure scroll is restored even if render is slow
    setTimeout(restoreScroll, 0);
    setTimeout(restoreScroll, 50);
    setTimeout(restoreScroll, 150);
    
    setDraggedStory(null);
  };

  return (
    <div className={clsx('bg-white dark:bg-gray-800 rounded-lg p-6 border dark:border-gray-700 h-fit', isProjectClosed && 'opacity-70')}>
      {isProjectClosed && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2">
          <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={18} />
          <p className="text-sm text-red-800 dark:text-red-300 font-medium">
            This project is closed and read-only. No changes can be made to stories.
          </p>
        </div>
      )}
      {isSprintClosed && !isProjectClosed && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2">
          <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={18} />
          <p className="text-sm text-red-800 dark:text-red-300 font-medium">
            This sprint is closed. No changes can be made to stories.
          </p>
        </div>
      )}
      {transitionError && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-center gap-2">
          <FiAlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" size={18} />
          <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
            {transitionError}
          </p>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isSprintClosed 
              ? 'Sprint is closed. Done stories are tied to this sprint.'
              : 'Drag cards to change status • Drag column headers to reorder'
            }
          </p>
        </div>
        <select
          value={selectedAssignee || ''}
          onChange={(e) => setSelectedAssignee(e.target.value || null)}
          disabled={isProjectClosed}
          className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {projectTeamMembers && projectTeamMembers.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </select>
      </div>

      {/* Custom Status Toggles */}
      {projectStatuses && projectStatuses.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Show Custom Statuses:</p>
          <div className="flex flex-wrap gap-2">
            {projectStatuses.map((status) => {
              if (['ready', 'in_progress', 'done'].includes(status.status_name)) return null;
              return (
                <label key={status.status_name} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={toggledStatuses[status.status_name] || false}
                    onChange={(e) => setToggledStatuses({
                      ...toggledStatuses,
                      [status.status_name]: e.target.checked
                    })}
                    disabled={isProjectClosed}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: status.color }}
                    />
                    {status.status_name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto" style={{ height: 'calc(100vh - 200px)' }} ref={scrollContainerRef}>
        <div className="flex gap-3 pb-4" style={{ display: 'flex', width: 'fit-content', minWidth: '100%' }}>
          {columns.map((column) => (
            <Column
              key={column.status}
              title={column.title}
              status={column.status}
              stories={column.stories}
              blockingInfo={blockingInfo}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onColumnDragStart={handleColumnDragStart}
              onColumnDragOver={handleColumnDragOver}
              onColumnDrop={handleColumnDrop}
              teamMembers={projectTeamMembers}
              statusCount={column.stories.length}
              onAssign={assignStory}
              onUnassign={unassignStory}
              statusColor={column.color}
              isFixed={column.isFixed}
              isSprintClosed={isSprintClosed}
              onOpenDetail={setSelectedStoryDetail}
              projectStatusObj={column.projectStatusObj}
              columnWidthStyle={columnWidthStyle}
              isProjectClosed={isProjectClosed}
            />
          ))}
        </div>
      </div>

      {/* Story Detail Modal */}
      {selectedStoryDetail && (
        <StoryDetailView
          storyId={selectedStoryDetail}
          onClose={() => setSelectedStoryDetail(null)}
        />
      )}
    </div>
  );
};
