import React, { useState, useRef } from 'react';
import { FiEdit3, FiPlus, FiTrash2, FiX, FiAlertCircle } from 'react-icons/fi';
import clsx from 'clsx';
import { useAppContext } from '../context/AppContext';
import { StoryDetailView } from './StoryDetailView';
import { FibonacciEffortSelector } from './FibonacciEffortSelector';
import { userStoryAPI } from '../services/api';
import axios from 'axios';

const BacklogTable = ({ stories, sprints, projectStatuses, onStatusChange, onSprintChange, onAssignUser, hideCompleted, teamMembers, onAssign, onUnassign, onOpenDetail, onDelete, setError, getForecastedSprints, isReadOnlyForSprint = false, targetSprintId = null, draggedStory, setDraggedStory, setReopenConfirmation, isProjectClosed = false, currentProject = null }) => {
  const [expandedId, setExpandedId] = useState(null);
  const scrollContainerRef = useRef(null);
  const scrollPositionRef = useRef({ scrollX: 0, scrollY: 0 });
  
  // Restore scroll from localStorage if available (for page reloads or major re-renders)
  React.useEffect(() => {
    const savedScroll = localStorage.getItem('backlogScrollPosition');
    if (savedScroll) {
      try {
        const { scrollX, scrollY } = JSON.parse(savedScroll);
        // Use multiple timeouts to ensure restoration even if render is slow (instant, no animation)
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollX;
          }
          window.scrollTo({ left: 0, top: scrollY, behavior: 'auto' });
        }, 100);
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollX;
          }
          window.scrollTo({ left: 0, top: scrollY, behavior: 'auto' });
        }, 300);
        localStorage.removeItem('backlogScrollPosition');
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Continuously track scroll position so if component re-mounts, we can restore it
  React.useEffect(() => {
    const handleWindowScroll = () => {
      const currentScroll = {
        scrollX: scrollContainerRef.current?.scrollLeft || 0,
        scrollY: window.scrollY || 0
      };
      scrollPositionRef.current = currentScroll;
      // Save to localStorage as well for persistence across re-mounts
      localStorage.setItem('backlogScrollPosition', JSON.stringify(currentScroll));
    };

    // Capture the ref value in the effect scope to avoid cleanup warnings
    const scrollContainer = scrollContainerRef.current;

    window.addEventListener('scroll', handleWindowScroll);
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleWindowScroll);
    }

    return () => {
      window.removeEventListener('scroll', handleWindowScroll);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleWindowScroll);
      }
    };
  }, []);
  
  // Always show all stories - done stories will be grayed out visually
  const filteredStories = stories;

  // Build status -> color map from projectStatuses
  const getStatusColorHex = (statusName) => {
    if (statusName === 'backlog') return '#6B7280'; // Gray for backlog
    const status = projectStatuses?.find(s => s.status_name === statusName);
    return status?.color || '#3B82F6'; // Default blue
  };

  const getEffortBg = (effort) => {
    if (effort <= 5) return 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300';
    if (effort <= 8) return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-300';
    return 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300';
  };

  const getValueBg = (value) => {
    if (value >= 34) return 'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-300';
    if (value >= 21) return 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300';
    return 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-900 dark:text-cyan-300';
  };

  const getStatusColor = (status) => {
    // Always use neutral colors for dropdown, not the status color
    const colors = {
      backlog: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      ready: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      in_progress: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      done: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    };
    return { custom: false, className: colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' };
  };

  const isFinalStatus = (statusName) => {
    const status = projectStatuses?.find(s => s.status_name === statusName);
    return !!status?.is_final;
  };

  const handleDragStart = (e, story) => {
    // Prevent dragging if story has done or final status, or if project is closed
    if (isReadOnlyForSprint || isProjectClosed || story.status === 'done' || isFinalStatus(story.status)) {
      e.preventDefault();
      return;
    }
    // Save both horizontal and vertical scroll positions
    const currentScroll = {
      scrollX: scrollContainerRef.current?.scrollLeft || 0,
      scrollY: window.scrollY || 0
    };
    scrollPositionRef.current = currentScroll;
    // Also save to localStorage as backup in case of major re-render
    localStorage.setItem('backlogScrollPosition', JSON.stringify(currentScroll));
    setDraggedStory(story);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetSprintId) => {
    e.preventDefault();
    if (!draggedStory || isReadOnlyForSprint || isProjectClosed) return;
    
    // Use the passed targetSprintId from the section, or fall back to story's sprint_id
    const sprintId = targetSprintId !== null ? targetSprintId : draggedStory.sprint_id;
    
    // Change sprint for the dragged story
    onSprintChange(draggedStory.story_id, sprintId ? parseInt(sprintId) : null);
    
    // Restore scroll positions after state update with multiple attempts (instant, no animation)
    const restoreScroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollPositionRef.current.scrollX;
      }
      // Use behavior: 'auto' to disable smooth scroll animation
      window.scrollTo({ left: 0, top: scrollPositionRef.current.scrollY, behavior: 'auto' });
    };
    
    // Try multiple times to ensure scroll is restored even if render is slow
    setTimeout(restoreScroll, 0);
    setTimeout(restoreScroll, 50);
    setTimeout(restoreScroll, 150);
    
    setDraggedStory(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg overflow-hidden border dark:border-gray-700">
      <div className="overflow-x-auto" ref={scrollContainerRef}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200" title="Hover for full title">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Epic</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">Effort</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">Value</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200" title="Dependencies">Deps</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Sprint</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">Assigned To</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStories.map((story) => (
              <React.Fragment key={story.story_id}>
                <tr 
                  draggable={!isReadOnlyForSprint && story.status !== 'done' && !isFinalStatus(story.status)}
                  onDragStart={(e) => handleDragStart(e, story)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, targetSprintId || story.sprint_id)}
                  className={clsx(
                    "border-b dark:border-gray-700 transition",
                    !isReadOnlyForSprint && story.status !== 'done' && !isFinalStatus(story.status) && 'cursor-grab active:cursor-grabbing hover:bg-blue-50 dark:hover:bg-blue-900/20',
                    (story.status === 'done' || isFinalStatus(story.status)) && 'opacity-50',
                    draggedStory?.story_id === story.story_id && 'opacity-50 bg-blue-100 dark:bg-blue-900/30',
                    isReadOnlyForSprint 
                      ? "bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/50" 
                      : (story.status === 'done' || isFinalStatus(story.status))
                      ? "bg-gray-50 dark:bg-gray-700/30"
                      : "cursor-pointer"
                  )}
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor: getStatusColorHex(story.status),
                  }}
                >
                  <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">{story.story_id}</td>
                  <td
                    className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-xs truncate"
                    onClick={() => setExpandedId(expandedId === story.story_id ? null : story.story_id)}
                    title={story.title}
                  >
                    {story.title}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {story.epic_obj ? (
                      <span className="inline-block px-3 py-1 rounded text-sm font-medium text-white" style={{ backgroundColor: story.epic_obj.color }}>
                        {story.epic_obj.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">No epic</span>
                    )}
                  </td>
                  <td className={clsx('px-4 py-3 text-center font-semibold rounded', getEffortBg(story.effort))}>
                    {story.effort}
                  </td>
                  <td className={clsx('px-4 py-3 text-center font-semibold rounded', getValueBg(story.business_value))}>
                    {story.business_value}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {story.blocked_by && story.blocked_by.length > 0 && (
                      <div title={`Blocked by: ${story.blocked_by.join(', ')}`} className="text-red-600 dark:text-red-400 font-bold cursor-help">
                        🔴 {story.blocked_by.length}
                      </div>
                    )}
                    {story.blocking && story.blocking.length > 0 && (
                      <div title={`Blocking: ${story.blocking.join(', ')}`} className="text-orange-600 dark:text-orange-400 font-bold cursor-help">
                        🟠 {story.blocking.length}
                      </div>
                    )}
                    {(!story.blocked_by || story.blocked_by.length === 0) && (!story.blocking || story.blocking.length === 0) && (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={story.sprint_id || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const scrollPos = window.scrollY;
                        onSprintChange(story.story_id, e.target.value ? parseInt(e.target.value) : null);
                        // Restore scroll position after state update
                        setTimeout(() => window.scrollTo(0, scrollPos), 0);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      disabled={isReadOnlyForSprint || story.status === 'done' || isFinalStatus(story.status)}
                      className={clsx(
                        'px-2 py-1 rounded font-medium text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500',
                        (isReadOnlyForSprint || story.status === 'done' || isFinalStatus(story.status)) && 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <option value="">Backlog</option>
                      {getForecastedSprints && getForecastedSprints().map((sprint) => {
                        // When toggle is on, treat active sprint like non-active
                        const effectiveStatus = (sprint.status === 'active' && currentProject?.allow_backlog_to_running_sprint)
                          ? 'non-active'
                          : sprint.status;
                        const isDisabled = effectiveStatus === 'closed' || (effectiveStatus === 'active' && !currentProject?.allow_backlog_to_running_sprint);
                        return (
                          <option key={sprint.id} value={sprint.id} disabled={isDisabled}>
                            {sprint.name} {(effectiveStatus === 'closed') ? '(Closed - Read Only)' : (isDisabled && sprint.status === 'active') ? '(Active - Read Only)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {story.status === 'done' || isFinalStatus(story.status) ? (
                      <span className={clsx(
                        'px-2 py-1 rounded font-medium text-xs block',
                        getStatusColor(story.status).className
                      )}>
                        {story.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        {isFinalStatus(story.status) && <span className="ml-1 text-red-600 font-bold">FINAL</span>}
                      </span>
                    ) : story.sprint_id ? (
                      (() => {
                        // For non-active, non-closed sprints, only allow 'ready' status
                        const sprint = sprints?.find(s => s.id === story.sprint_id);
                        const isNonActiveSprint = sprint && sprint.status !== 'active' && sprint.status !== 'closed';
                        const availableStatuses = isNonActiveSprint 
                          ? (projectStatuses || []).filter(s => s.status_name === 'ready')
                          : (projectStatuses || []);
                        
                        return (
                          <select
                            value={story.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const scrollPos = {
                                scrollX: scrollContainerRef.current?.scrollLeft || 0,
                                scrollY: window.scrollY || 0
                              };
                              localStorage.setItem('backlogScrollPosition', JSON.stringify(scrollPos));
                              onStatusChange(story.story_id, e.target.value);
                              
                              // Restore scroll position after state update with multiple attempts (instant, no animation)
                              const restoreScroll = () => {
                                if (scrollContainerRef.current) {
                                  scrollContainerRef.current.scrollLeft = scrollPos.scrollX;
                                }
                                window.scrollTo({ left: 0, top: scrollPos.scrollY, behavior: 'auto' });
                              };
                              
                              // Try multiple times to ensure scroll is restored even if render is slow
                              setTimeout(restoreScroll, 0);
                              setTimeout(restoreScroll, 50);
                              setTimeout(restoreScroll, 150);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx(
                              'px-2 py-1 rounded font-medium text-xs border-0 cursor-pointer',
                              getStatusColor(story.status).className
                            )}
                          >
                            {availableStatuses && availableStatuses.map((status) => (
                              <option key={status.id} value={status.status_name}>
                                {status.status_name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </option>
                            ))}
                          </select>
                        );
                      })()
                    ) : (
                      // For backlog stories, hide status column
                      <span className="text-gray-400 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {story.status === 'done' || isFinalStatus(story.status) ? (
                      <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                        {story.assigned_to && story.assigned_to.length > 0 ? story.assigned_to[0].name : 'Unassigned'}
                      </span>
                    ) : (
                      <div className="flex flex-row items-center gap-2 flex-wrap">
                        {story.assigned_to && story.assigned_to.length > 0 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded inline-flex items-center gap-1">
                            {story.assigned_to[0].name}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnassign(story.story_id, story.assigned_to[0].id);
                              }}
                              className="font-bold hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                              title="Remove assignment"
                            >
                              ×
                            </button>
                          </span>
                        )}
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              if (story.assigned_to && story.assigned_to.length > 0) {
                                // Change existing assignment
                                const newMemberId = parseInt(e.target.value);
                                onUnassign(story.story_id, story.assigned_to[0].id);
                                setTimeout(() => onAssign(story.story_id, newMemberId), 100);
                              } else {
                                // Assign new
                                onAssign(story.story_id, parseInt(e.target.value));
                              }
                              e.target.value = '';
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 rounded text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title={story.assigned_to?.length > 0 ? "Change assignment" : "Assign member"}
                        >
                          <option value="">{story.assigned_to?.length > 0 ? "Change" : "Assign"}</option>
                          {teamMembers && teamMembers.map((member) => {
                            const isAssigned = story.assigned_to?.[0]?.id === member.id;
                            return !isAssigned && <option key={member.id} value={member.id}>{member.name}</option>;
                          })}
                        </select>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {story.status === 'done' || isFinalStatus(story.status) ? (
                        <button
                          onClick={() => {
                            // Check if story is in a closed sprint
                            const sprint = story.sprint_id ? sprints?.find(s => s.id === story.sprint_id) : null;
                            const isInClosedSprint = sprint?.status === 'closed';
                            const isInNonClosedSprint = sprint && sprint.status !== 'closed';
                            
                            if (isInClosedSprint) {
                              // Closed sprint: show confirmation to move to backlog
                              setReopenConfirmation({
                                storyId: story.story_id,
                                storyTitle: story.title,
                                isClosed: true
                              });
                            } else if (isInNonClosedSprint) {
                              // Non-closed sprint: change status to "ready" in the same sprint
                              onStatusChange(story.story_id, 'ready');
                            } else {
                              // No sprint (backlog): move to backlog
                              onStatusChange(story.story_id, 'backlog');
                            }
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-xs px-3 py-1 rounded border border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                          title="Reopen story"
                        >
                          Reopen
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => onOpenDetail(story.story_id)}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300"
                            title="View/Edit details"
                          >
                            <FiEdit3 size={18} />
                          </button>
                          <button
                            onClick={() => setExpandedId(expandedId === story.story_id ? null : story.story_id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-xs"
                          >
                            {expandedId === story.story_id ? 'Hide' : 'Show'}
                          </button>
                          {!story.sprint_id && onDelete && (
                            <button
                              onClick={() => onDelete(story.story_id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              title="Delete story"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>

                {expandedId === story.story_id && (
                  <tr className="bg-blue-50 dark:bg-gray-700/50 border-b dark:border-gray-600">
                    <td colSpan="8" className="px-4 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h4>
                          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{story.description}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Details</h4>
                          <div className="space-y-2 text-sm">
                            <p>
                              <span className="text-gray-600 dark:text-gray-400">Created:</span>{' '}
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {new Date(story.created_at).toLocaleDateString()}
                              </span>
                            </p>
                            <p>
                              <span className="text-gray-600 dark:text-gray-400">Updated:</span>{' '}
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {new Date(story.updated_at).toLocaleDateString()}
                              </span>
                            </p>
                            {story.dependencies && story.dependencies.length > 0 && (
                              <p>
                                <span className="text-gray-600 dark:text-gray-400">Dependencies:</span>{' '}
                                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 px-2 py-1 rounded">
                                  {story.dependencies.join(', ')}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {filteredStories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No stories found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const BacklogView = () => {
  const { userStories, sprints, projectStatuses, projects, updateStoryStatus, moveStoryToSprint, selectedProjectId, assignStory, unassignStory, fetchAllData } = useAppContext();
  const [hideCompleted, setHideCompleted] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [selectedStoryDetail, setSelectedStoryDetail] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [projectEpics, setProjectEpics] = useState([]);
  const [error, setError] = useState('');
  const [draggedStory, setDraggedStory] = useState(null);
  const [orderBy, setOrderBy] = useState('default'); // default, assignee_asc, creation_date_asc, epic_asc, effort_asc, effort_desc, business_value_asc, business_value_desc
  const [reopenConfirmation, setReopenConfirmation] = useState(null); // { storyId, storyTitle, isClosed }
  const [blockingInfo, setBlockingInfo] = useState({}); // { storyId: { blockedBy: [], blocking: [] } }
  
  // Check if current project is closed
  const currentProject = projects?.find(p => p.id === selectedProjectId);
  const isProjectClosed = currentProject?.closed_date ? true : false;
  
  const [newStory, setNewStory] = useState({
    title: '',
    description: '',
    epic_id: null,
    effort: 5,
    business_value: 20,
  });
  const [creatingStory, setCreatingStory] = useState(false);

  // Track what we've already fetched to prevent infinite loops
  const lastFetchedRef = useRef({ projectId: null, storyIds: [] });

  // Load project epics and team members when project changes
  let projectTeamMembers = [];
  if (selectedProjectId && projects) {
    const currentProject = projects.find(p => p.id === selectedProjectId);
    projectTeamMembers = currentProject?.team_members || [];
  }

  React.useEffect(() => {
    if (selectedProjectId && projects) {
      const currentProject = projects.find(p => p.id === selectedProjectId);
      setProjectEpics(currentProject?.epics || []);
    }
  }, [selectedProjectId, projects]);

  // Filter by project first (memoized to prevent unnecessary re-renders)
  const projectStories = React.useMemo(() => 
    userStories.filter(s => s.project_id === selectedProjectId),
    [userStories, selectedProjectId]
  );

  // Fetch blocking info for all project stories - only trigger when project changes
  React.useEffect(() => {
    const fetchBlockingInfo = async () => {
      if (projectStories.length === 0) {
        setBlockingInfo({});
        lastFetchedRef.current = { projectId: null, storyIds: [] };
        return;
      }

      // Check if we've already fetched this exact project with these exact stories
      const currentStoryIds = projectStories.map(s => s.story_id).sort().join(',');
      if (
        lastFetchedRef.current.projectId === selectedProjectId &&
        lastFetchedRef.current.storyIds === currentStoryIds
      ) {
        // Already fetched these stories for this project, skip
        return;
      }

      // Mark that we're fetching this project
      lastFetchedRef.current = { projectId: selectedProjectId, storyIds: currentStoryIds };

      const info = {};
      try {
        // Fetch blocking info for all stories in parallel
        await Promise.all(
          projectStories.map(async (story) => {
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
  }, [projectStories, selectedProjectId]);

  // Get forecasted sprints for the current project
  const getForecastedSprints = React.useMemo(() => {
    return () => {
      if (!selectedProjectId || !projects || !sprints) {
        return [];
      }
      
      const project = projects.find(p => p.id === selectedProjectId);
      if (!project) {
        return [];
      }
      
      const forecastedCount = project.num_forecasted_sprints || 5;
      
      // Filter sprints by current project AND exclude backlog
      const projectSprints = sprints.filter(s => 
        s.project_id === selectedProjectId && 
        s.name !== 'Backlog'
      );
      
      // Sort sprints by number and limit to forecasted count
      const sortedSprints = projectSprints.sort((a, b) => {
        const numA = parseInt(a.name.split(' ').pop()) || 0;
        const numB = parseInt(b.name.split(' ').pop()) || 0;
        return numA - numB;
      });
      
      return sortedSprints.slice(0, forecastedCount);
    };
  }, [selectedProjectId, projects, sprints]);

  // Filter by assignee if selected
  const filterByAssignee = (stories) => {
    if (!selectedAssignee) return stories;
    if (selectedAssignee === 'unassigned') {
      return stories.filter(s => !s.assigned_to || s.assigned_to.length === 0);
    }
    return stories.filter(s => s.assigned_to?.some(a => a.id === selectedAssignee));
  };

  // Handle sprint assignment with proper status transitions
  const handleSprintChange = (storyId, sprintId) => {
    const story = projectStories.find(s => s.story_id === storyId);
    if (!story) return;
    
    // Check if trying to assign to a sprint
    if (sprintId) {
      const targetSprint = sprints?.find(s => s.id === sprintId);
      if (targetSprint && targetSprint.status === 'active') {
        // When toggle is OFF, prevent ANY story from being assigned to active sprint
        const allowBacklogToRunning = currentProject?.allow_backlog_to_running_sprint;
        if (!allowBacklogToRunning) {
          setError('Cannot assign stories to an active sprint');
          return;
        }
      }
      if (targetSprint && targetSprint.status === 'closed') {
        setError('Cannot assign stories to a closed sprint');
        return;
      }
      // For non-active, non-closed sprints: enforce "ready" status only
      if (targetSprint && targetSprint.status !== 'closed' && targetSprint.status !== 'active') {
        moveStoryToSprint(storyId, sprintId, 'ready');
        return;
      }
    }

    // If moving from backlog to a sprint, set status to "ready"
    // Note: When allow_backlog_to_running_sprint is enabled, we bypass workflow checks for this move
    if (!story.sprint_id && sprintId) {
      console.log('BacklogView: Moving from backlog to sprint, allow_backlog_to_running:', currentProject?.allow_backlog_to_running_sprint);
      moveStoryToSprint(storyId, sprintId, 'ready');
    }
    // If moving from sprint back to backlog, set status to "backlog"
    else if (story.sprint_id && !sprintId) {
      moveStoryToSprint(storyId, null, 'backlog');
    }
    // If moving between sprints, keep current status
    else {
      moveStoryToSprint(storyId, sprintId);
    }
  };

  // Wrapper for updateStoryStatus to enforce sprint constraints
  const handleStatusChange = (storyId, status) => {
    const story = projectStories.find(s => s.story_id === storyId);
    if (!story) return;
    
    // Prevent unnecessary updates if status is the same
    if (story.status === status) {
      return;
    }
    
    // ============ RULE 1: Stories without sprint can ONLY be in status='backlog' ============
    if (!story.sprint_id) {
      if (status !== 'backlog') {
        setError('⚠️ Unassigned backlog stories can only have "Backlog" status. Please assign to a sprint first to change status.');
        return;
      }
      // Trying to change from one status to backlog while already in backlog - this is caught above
      return;
    }

    // ============ RULE 2: Stories IN a sprint follow sprint-based transition rules ============
    const currentSprint = sprints?.find(s => s.id === story.sprint_id);
    
    // When toggle is on and sprint is active, treat it like a non-active sprint
    const effectiveSprintStatus = (currentSprint?.status === 'active' && currentProject?.allow_backlog_to_running_sprint)
      ? 'non-active'
      : currentSprint?.status;
    
    // Closed sprints: only allow reopening to backlog (which removes from sprint)
    if (effectiveSprintStatus === 'closed') {
      if (status !== 'backlog') {
        setError('⚠️ Closed sprints are locked. Only reopening stories back to backlog is allowed.');
        return;
      }
      // Allow moving to backlog = removing from sprint
      moveStoryToSprint(storyId, null, 'backlog');
      return;
    }

    // Non-active sprints (including active with toggle): only allow backlog ↔ ready transitions
    if (effectiveSprintStatus !== 'active') {
      const isBacklogReadyTransition = 
        (story.status === 'backlog' && status === 'ready') ||
        (story.status === 'ready' && status === 'backlog');
      
      if (!isBacklogReadyTransition) {
        setError('⚠️ Sprint only allows "Backlog ↔ Ready" transitions.');
        return;
      }
      // Valid backlog ↔ ready transition
      updateStoryStatus(storyId, status);
      return;
    }

    // Active sprints without toggle: use full workflow validation
    if (effectiveSprintStatus === 'active') {
      // Check if trying to move to backlog
      if (status === 'backlog') {
        setError('⚠️ Cannot move stories to backlog when in an active sprint. Story must be completed (final status) to close it, or close the sprint first.');
        return;
      }
      
      // Check if trying to close a story that's blocking others
      const isFinalStatus = projectStatuses?.some(s => s.status_name === status && s.is_final);
      if (isFinalStatus && (story.blocking || []).length > 0) {
        const blockedStories = story.blocking.join(', ');
        setError(`⚠️ Cannot close this story - it is blocking other stories: ${blockedStories}`);
        return;
      }
      // In active sprints without toggle, all other transitions allowed (backend will validate against workflow)
      updateStoryStatus(storyId, status);
      return;
    }

    // Fallback (shouldn't reach here)
    updateStoryStatus(storyId, status);
  };

  // Drop zone wrapper handler - allows dropping on table background areas
  const handleTableDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTableDrop = (e, sectionSprintId) => {
    e.preventDefault();
    if (!draggedStory) return;
    // When dropping on backlog section (sectionSprintId=null), move to backlog (no sprint)
    // When dropping on sprint section (sectionSprintId=number), move to that sprint  
    handleSprintChange(draggedStory.story_id, sectionSprintId ? parseInt(sectionSprintId) : null);
    setDraggedStory(null);
  };

  // Group stories by sprint for this project only
  const backlogStories = projectStories.filter((s) => !s.sprint_id || s.sprint_id === null);
  const sprintGroups = {};
  const activeSprints = [];
  
  // Filter sprints to only include those for the current project
  const projectSprints = sprints?.filter(s => 
    projectStories.some(s2 => s2.sprint_id === s.id) || 
    s.project_id === selectedProjectId
  ) || [];
  
  projectSprints?.forEach((sprint) => {
    // Skip sprints named 'Backlog' or with empty/null names
    if (sprint.name && sprint.name !== 'Backlog' && sprint.name.trim() !== '') {
      sprintGroups[sprint.id] = {
        name: sprint.name,
        status: sprint.status,
        stories: projectStories.filter((s) => s.sprint_id === sprint.id)
      };
      
      // Separate active sprint stories
      if (sprint.status === 'active') {
        activeSprints.push({
          id: sprint.id,
          name: sprint.name,
          stories: projectStories.filter((s) => s.sprint_id === sprint.id)
        });
      }
    }
  });
  
  // Calculate total count for this project
  const totalCount = hideCompleted 
    ? projectStories.filter(s => s.status !== 'done').length
    : projectStories.length;

  // Function to sort stories based on orderBy setting
  const sortStories = (stories) => {
    const sorted = [...stories];
    
    switch(orderBy) {
      case 'assignee_asc':
        return sorted.sort((a, b) => {
          const nameA = a.assigned_to?.[0]?.name || 'Unassigned';
          const nameB = b.assigned_to?.[0]?.name || 'Unassigned';
          return nameA.localeCompare(nameB);
        });
      case 'creation_date_asc':
        return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'epic_asc':
        return sorted.sort((a, b) => {
          const epicA = a.epic_obj?.name || 'Unassigned';
          const epicB = b.epic_obj?.name || 'Unassigned';
          return epicA.localeCompare(epicB);
        });
      case 'effort_asc':
        return sorted.sort((a, b) => a.effort - b.effort);
      case 'effort_desc':
        return sorted.sort((a, b) => b.effort - a.effort);
      case 'business_value_asc':
        return sorted.sort((a, b) => a.business_value - b.business_value);
      case 'business_value_desc':
        return sorted.sort((a, b) => b.business_value - a.business_value);
      default:
        return sorted;
    }
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    if (!newStory.title.trim()) return;

    setCreatingStory(true);
    try {
      await axios.post('http://localhost:8000/api/user-stories', {
        ...newStory,
        project_id: selectedProjectId,
        status: 'backlog',
        sprint_id: null,
      });
      setNewStory({
        title: '',
        description: '',
        epic_id: null,
        effort: 5,
        business_value: 20,
      });
      setShowCreateForm(false);
      // Refresh all data to get the new story
      await fetchAllData();
    } catch (err) {
      console.error('Failed to create story:', err);
      alert('Failed to create story');
    } finally {
      setCreatingStory(false);
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Delete this user story? This cannot be undone.')) return;
    try {
      await axios.delete(`http://localhost:8000/api/user-stories/${storyId}`);
      await fetchAllData();
    } catch (err) {
      console.error('Failed to delete story:', err);
      alert('Failed to delete story');
    }
  };

  return (
    <div className={clsx('space-y-6', isProjectClosed && 'opacity-70')}>
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-lg flex justify-between items-start gap-4">
          <div className="flex-1">{error}</div>
          <button onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex-shrink-0">
            <FiX size={18} />
          </button>
        </div>
      )}
      
      {isProjectClosed && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-lg flex items-center gap-2">
          <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={18} />
          <p className="text-sm font-medium">
            This project is closed and read-only. No changes can be made to stories.
          </p>
        </div>
      )}
      
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Backlog Details</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={isProjectClosed}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm flex items-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
          >
            <FiPlus size={18} />
            New User Story
          </button>
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
          <label className="flex items-center gap-2 cursor-pointer disabled:opacity-50">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              disabled={isProjectClosed}
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer disabled:cursor-not-allowed"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hide Completed</span>
          </label>
          <select
            value={orderBy}
            onChange={(e) => setOrderBy(e.target.value)}
            disabled={isProjectClosed}
            className="px-3 py-1 rounded text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="default">Order by - Default</option>
            <option value="assignee_asc">Order by - Assignee</option>
            <option value="creation_date_asc">Order by - Creation Date</option>
            <option value="epic_asc">Order by - Epic</option>
            <option value="effort_asc">Order by - Effort (Low to High)</option>
            <option value="effort_desc">Order by - Effort (High to Low)</option>
            <option value="business_value_asc">Order by - Business Value (Low to High)</option>
            <option value="business_value_desc">Order by - Business Value (High to Low)</option>
          </select>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total Stories: <span className="font-semibold text-gray-900 dark:text-white">{totalCount}</span>
          </div>
        </div>
      </div>

      {/* Create New Story Form */}
      {showCreateForm && !isProjectClosed && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New User Story</h3>
          <form onSubmit={handleCreateStory} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newStory.title}
                  onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="US title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Epic</label>
                <select
                  value={newStory.epic_id || ''}
                  onChange={(e) => setNewStory({ ...newStory, epic_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">No Epic</option>
                  {projectEpics.map((epic) => (
                    <option key={epic.id} value={epic.id}>
                      {epic.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effort (pts)</label>
                <FibonacciEffortSelector
                  value={newStory.effort}
                  onChange={(value) => setNewStory({ ...newStory, effort: value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Value</label>
                <FibonacciEffortSelector
                  value={newStory.business_value}
                  onChange={(value) => setNewStory({ ...newStory, business_value: value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={newStory.description}
                onChange={(e) => setNewStory({ ...newStory, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="US description"
                rows="3"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creatingStory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md font-medium transition"
              >
                {creatingStory ? 'Creating...' : 'Create Story'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-900 dark:text-white rounded-md font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Backlog Section */}
      {backlogStories.length > 0 && (() => {
        const filtered = filterByAssignee(backlogStories).filter(s => !hideCompleted || s.status !== 'done');
        const displayStories = sortStories(filtered).map(s => ({
          ...s,
          blocked_by: blockingInfo[s.story_id]?.blockedBy || [],
          blocking: blockingInfo[s.story_id]?.blocking || []
        }));
        return (
          <div
            onDragOver={handleTableDragOver}
            onDrop={(e) => handleTableDrop(e, null)}
            className="border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-2 mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Backlog ({displayStories.length})</h3>
            <BacklogTable 
              stories={displayStories} 
              sprints={sprints}
              projectStatuses={projectStatuses}
              onStatusChange={handleStatusChange} 
              onSprintChange={handleSprintChange}
              hideCompleted={hideCompleted}
              teamMembers={projectTeamMembers}
              onAssign={assignStory}
              onUnassign={unassignStory}
              onOpenDetail={setSelectedStoryDetail}
              onDelete={handleDeleteStory}
              setError={setError}
              getForecastedSprints={getForecastedSprints}
              targetSprintId={null}
              draggedStory={draggedStory}
              setDraggedStory={setDraggedStory}
              setReopenConfirmation={setReopenConfirmation}
              isProjectClosed={isProjectClosed}
              currentProject={currentProject}
            />
          </div>
        );
      })()}
      
      {/* Active Sprint Stories Section (Read-Only for Sprint Assignment) */}
      {activeSprints.length > 0 && activeSprints.map((activeSprint) => {
        const filtered = filterByAssignee(activeSprint.stories).filter(s => !hideCompleted || s.status !== 'done');
        const displayStories = sortStories(filtered).map(s => ({
          ...s,
          blocked_by: blockingInfo[s.story_id]?.blockedBy || [],
          blocking: blockingInfo[s.story_id]?.blocking || []
        }));
        return displayStories.length > 0 ? (
          <div
            key={activeSprint.id}
            onDragOver={handleTableDragOver}
            onDrop={(e) => handleTableDrop(e, activeSprint.id)}
            className="border-2 border-dashed border-yellow-300 dark:border-yellow-700 rounded-lg p-2 mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
              {activeSprint.name}
              {!currentProject?.allow_backlog_to_running_sprint && (
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded font-medium">
                  Active - Read Only
                </span>
              )}
              ({displayStories.length})
            </h3>
            <BacklogTable 
              stories={displayStories} 
              sprints={sprints}
              projectStatuses={projectStatuses}
              onStatusChange={handleStatusChange} 
              onSprintChange={handleSprintChange}
              hideCompleted={hideCompleted}
              teamMembers={projectTeamMembers}
              onAssign={assignStory}
              onUnassign={unassignStory}
              onOpenDetail={setSelectedStoryDetail}
              onDelete={handleDeleteStory}
              setError={setError}
              getForecastedSprints={getForecastedSprints}
              isReadOnlyForSprint={!currentProject?.allow_backlog_to_running_sprint}
              targetSprintId={activeSprint.id}
              draggedStory={draggedStory}
              setDraggedStory={setDraggedStory}
              setReopenConfirmation={setReopenConfirmation}
              isProjectClosed={isProjectClosed}
              currentProject={currentProject}
            />
          </div>
        ) : null;
      })}
      
      {/* Other Sprint Sections */}
      {Object.entries(sprintGroups).map(([sprintId, group]) => {
        // Skip active sprints since they're displayed above, and verify sprint name is valid
        if (group.status === 'active' || !group.name || group.name.trim() === '' || group.name === 'Backlog') return null;
        
        const filtered = filterByAssignee(group.stories).filter(s => !hideCompleted || s.status !== 'done');
        const displayStories = sortStories(filtered).map(s => ({
          ...s,
          blocked_by: blockingInfo[s.story_id]?.blockedBy || [],
          blocking: blockingInfo[s.story_id]?.blocking || []
        }));
        return displayStories.length > 0 ? (
          <div
            key={sprintId}
            onDragOver={handleTableDragOver}
            onDrop={(e) => handleTableDrop(e, parseInt(sprintId))}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-2 mb-6"
          >
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">{group.name} ({displayStories.length})</h3>
            <BacklogTable 
              stories={displayStories} 
              sprints={sprints}
              projectStatuses={projectStatuses}
              onStatusChange={handleStatusChange} 
              onSprintChange={handleSprintChange}
              hideCompleted={hideCompleted}
              teamMembers={projectTeamMembers}
              onAssign={assignStory}
              onUnassign={unassignStory}
              onOpenDetail={setSelectedStoryDetail}
              onDelete={handleDeleteStory}
              setError={setError}
              getForecastedSprints={getForecastedSprints}
              targetSprintId={parseInt(sprintId)}
              draggedStory={draggedStory}
              setDraggedStory={setDraggedStory}
              setReopenConfirmation={setReopenConfirmation}
              isProjectClosed={isProjectClosed}
              currentProject={currentProject}
            />
          </div>
        ) : null;
      })}

      {/* Story Detail Modal */}
      {selectedStoryDetail && (
        <StoryDetailView
          storyId={selectedStoryDetail}
          onClose={() => setSelectedStoryDetail(null)}
        />
      )}

      {/* Reopen Confirmation Dialog */}
      {reopenConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Reopen Story from Closed Sprint?
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              <strong>{reopenConfirmation.storyTitle}</strong> is in a closed sprint. Reopening it will move it back to the backlog.
            </p>
            {reopenConfirmation.isClosed && (
              <p className="text-amber-600 dark:text-amber-400 text-sm mb-4">
                ⚠️ This will permanently remove the story from the closed sprint and restore it to backlog status.
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setReopenConfirmation(null)}
                className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  moveStoryToSprint(reopenConfirmation.storyId, null, 'backlog');
                  setReopenConfirmation(null);
                }}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
              >
                Confirm Reopen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
