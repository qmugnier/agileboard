import React, { useState, useEffect } from 'react';
import { FiEdit2, FiX, FiCheckCircle, FiCircle, FiTrash2, FiSend } from 'react-icons/fi';
import clsx from 'clsx';
import { useAppContext } from '../context/AppContext';
import { userStoryAPI, projectAPI } from '../services/api';
import { FibonacciEffortSelector } from './FibonacciEffortSelector';

export const StoryDetailView = ({ storyId, onClose }) => {
  const { userStories, lightRefreshStories } = useAppContext();
  const [story, setStory] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit form state
  const [editData, setEditData] = useState({});

  // Subtasks
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [subtaskDesc, setSubtaskDesc] = useState('');
  const [showSubtasks, setShowSubtasks] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  // History
  const [history, setHistory] = useState([]);

  // Dependencies
  const [dependencies, setDependencies] = useState([]);
  const [showDependencies, setShowDependencies] = useState(false);
  const [newDependencyId, setNewDependencyId] = useState('');
  const [newDependencyType, setNewDependencyType] = useState('depends_on');
  const [dependencySearchOpen, setDependencySearchOpen] = useState(false);
  const [dependencySearchQuery, setDependencySearchQuery] = useState('');

  // Epics
  const [epics, setEpics] = useState([]);

  // Project statuses
  const [projectStatuses, setProjectStatuses] = useState([]);

  // Close dependency dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dependencySearchOpen && !e.target.closest('[data-dependency-dropdown]')) {
        setDependencySearchOpen(false);
      }
    };
    if (dependencySearchOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dependencySearchOpen]);

  useEffect(() => {
    const loadStoryData = async () => {
      try {
        setLoading(true);
        const storyData = userStories.find(s => s.story_id === storyId);
        if (storyData) {
          setStory(storyData);
          setEditData(storyData);
          
          // Fetch epics and statuses for this project
          const [epicsRes, statusesRes] = await Promise.all([
            projectAPI.getEpics(storyData.project_id),
            projectAPI.getStatuses(storyData.project_id),
          ]);
          setEpics(epicsRes.data || []);
          setProjectStatuses(statusesRes.data || []);
        }

        const [subtasksRes, commentsRes, historyRes, depsRes] = await Promise.all([
          userStoryAPI.getSubtasks(storyId),
          userStoryAPI.getComments(storyId),
          userStoryAPI.getHistory(storyId),
          userStoryAPI.getDependencies(storyId).catch(() => ({ data: [] })),
        ]);

        const subtasksData = subtasksRes.data || [];
        const commentsData = commentsRes.data || [];
        const depsData = depsRes.data || [];

        setSubtasks(subtasksData);
        setComments(commentsData);
        // History is returned as an array, historyRes.data is the array
        setHistory(historyRes.data || []);
        setDependencies(depsData);
        
        // Auto-expand sections if there's at least one item
        setShowSubtasks(subtasksData.length > 0);
        setShowComments(commentsData.length > 0);
        setShowDependencies(depsData.length > 0);
        setError(null);
      } catch (err) {
        setError('Failed to load story details');
      } finally {
        setLoading(false);
      }
    };
    
    loadStoryData();
  }, [storyId, userStories]);

  // Check if current story status is a final status
  const isCurrentStatusFinal = () => {
    const currentStatus = projectStatuses.find(s => s.status_name === story.status);
    return currentStatus && currentStatus.is_final;
  };

  const handleSaveEdits = async () => {
    try {
      const updatePayload = {
        title: editData.title,
        description: editData.description,
        epic_id: editData.epic_id,
        business_value: editData.business_value,
        effort: editData.effort,
      };
      await userStoryAPI.update(storyId, updatePayload);
      setStory(editData);
      setEditMode(false);
      setError(null);
      // Refresh stories in global context to sync all changes
      await lightRefreshStories();
      await refreshHistory();
    } catch (err) {
      setError('Failed to update story');
    }
  };

  const refreshHistory = async () => {
    try {
      // Wait a bit to ensure backend has processed the action completely
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const historyRes = await userStoryAPI.getHistory(storyId);
      const newHistory = historyRes.data || [];
      setHistory(newHistory);
      console.log('✅ Activity log refreshed:', newHistory.length, 'entries');
    } catch (err) {
      console.error('❌ Failed to refresh history:', err);
      // Still show error but don't block the UI
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    try {
      console.log(`➕ Adding subtask: "${newSubtask}"`);
      
      const res = await userStoryAPI.createSubtask(storyId, {
        title: newSubtask,
        description: subtaskDesc,
        is_completed: false,
      });
      
      console.log(`✅ Subtask created:`, res.data);
      setSubtasks([...subtasks, res.data]);
      setNewSubtask('');
      setSubtaskDesc('');
      await refreshHistory();
    } catch (err) {
      console.error(`❌ Failed to create subtask:`, err);
      setError('Failed to create subtask');
    }
  };

  const handleToggleSubtask = async (subtaskId, isCompleted) => {
    try {
      const subtask = subtasks.find(s => s.id === subtaskId);
      console.log(`🔄 Toggle subtask ${subtaskId}: isCompleted ${isCompleted} → ${!isCompleted}`);
      
      const res = await userStoryAPI.updateSubtask(subtaskId, {
        ...subtask,
        is_completed: !isCompleted,
      });
      
      console.log(`✅ Subtask updated`, res.data);
      setSubtasks(subtasks.map(s => s.id === subtaskId ? res.data : s));
      await refreshHistory();
    } catch (err) {
      console.error(`❌ Failed to update subtask ${subtaskId}:`, err);
      setError('Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await userStoryAPI.deleteSubtask(subtaskId);
      setSubtasks(subtasks.filter(s => s.id !== subtaskId));
      await refreshHistory();
    } catch (err) {
      setError('Failed to delete subtask');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await userStoryAPI.createComment(storyId, {
        author: 'Current User',
        content: newComment,
      });
      setComments([res.data, ...comments]);
      setNewComment('');
      await refreshHistory();
    } catch (err) {
      setError('Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await userStoryAPI.deleteComment(commentId);
      setComments(comments.filter(c => c.id !== commentId));
      await refreshHistory();
    } catch (err) {
      setError('Failed to delete comment');
    }
  };

  const handleAddDependency = async () => {
    if (!newDependencyId.trim()) return;
    try {
      await userStoryAPI.addDependency(storyId, {
        dependency_story_id: newDependencyId,
        link_type: newDependencyType,
      });
      // Reload dependencies
      const depsRes = await userStoryAPI.getDependencies(storyId);
      setDependencies(depsRes.data || []);
      setNewDependencyId('');
      setNewDependencyType('depends_on');
      setDependencySearchQuery('');
      setDependencySearchOpen(false);
      setError(null);
    } catch (err) {
      setError(`Failed to add dependency: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleRemoveDependency = async (depStoryId) => {
    try {
      await userStoryAPI.removeDependency(storyId, depStoryId);
      setDependencies(dependencies.filter(d => d.dependency_story_id !== depStoryId));
      setError(null);
    } catch (err) {
      setError(`Failed to remove dependency: ${err.response?.data?.detail || err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full h-[95vh] flex flex-col max-h-screen">
        {/* Header */}
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">{story.story_id}</h2>
            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded flex-shrink-0">
              {story.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl flex-shrink-0 ml-2"
          >
            <FiX />
          </button>
        </div>

        {error && (
          <div className="mx-4 md:mx-6 mt-2 p-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded text-sm">
            {error}
          </div>
        )}

        {/* Main Content - Left Content + Right Timeline */}
        <div className="flex flex-1 overflow-hidden gap-4 md:gap-0">
          {/* Left Content - Story Details */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            <div className="space-y-3">
              {/* Story Details - Compact */}
              <div className="space-y-2 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Details</h3>
                  {isCurrentStatusFinal() ? (
                    <button
                      disabled
                      title="Cannot edit in final status. Change status to a working state first."
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded cursor-not-allowed"
                    >
                      <FiEdit2 size={14} />
                      Edit (Locked)
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditMode(!editMode)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
                    >
                      <FiEdit2 size={14} />
                      {editMode ? 'Cancel' : 'Edit'}
                    </button>
                  )}
                </div>

                {editMode ? (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                      <input
                        type="text"
                        value={editData.title || ''}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Epic</label>
                      <select
                        value={editData.epic_id || ''}
                        onChange={(e) => setEditData({ ...editData, epic_id: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="">No Epic</option>
                        {epics && epics.map((epic) => (
                          <option key={epic.id} value={epic.id}>{epic.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Effort</label>
                        <FibonacciEffortSelector
                          value={editData.effort || 5}
                          onChange={(value) => setEditData({ ...editData, effort: value })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Value</label>
                        <FibonacciEffortSelector
                          value={editData.business_value || 5}
                          onChange={(value) => setEditData({ ...editData, business_value: value })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                      <textarea
                        value={editData.description || ''}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        rows="2"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      />
                    </div>

                    <button
                      onClick={handleSaveEdits}
                      className="w-full px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm font-semibold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{story.title}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {story.epic_obj ? (
                        <span className="inline-block px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: story.epic_obj.color }}>
                          {story.epic_obj.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No epic</span>
                      )}
                      <span className="text-gray-600 dark:text-gray-400 text-xs">Effort: {story.effort} pts</span>
                      <span className="text-gray-600 dark:text-gray-400 text-xs">Value: {story.business_value}</span>
                    </div>
                    {story.description && (
                      <p className="text-gray-700 dark:text-gray-300 text-xs whitespace-pre-wrap line-clamp-2">{story.description}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Subtasks - Collapsible */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded">
                <button
                  onClick={() => setShowSubtasks(!showSubtasks)}
                  className="w-full p-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-xs font-semibold text-gray-900 dark:text-white"
                >
                  <span>Subtasks ({subtasks.length})</span>
                  <span>{showSubtasks ? '▼' : '▶'}</span>
                </button>

                {showSubtasks && (
                  <div className="p-2 border-t dark:border-gray-600 space-y-1">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-start gap-2 text-xs">
                        <button
                          onClick={() => handleToggleSubtask(subtask.id, subtask.is_completed)}
                          className="mt-0.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 flex-shrink-0"
                        >
                          {subtask.is_completed ? <FiCheckCircle className="text-green-500" size={14} /> : <FiCircle size={14} />}
                        </button>
                        <div className="flex-1">
                          <p className={clsx(subtask.is_completed && 'line-through text-gray-500')}>
                            {subtask.title}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 flex-shrink-0"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    ))}

                    <div className="space-y-1 p-1 bg-blue-50 dark:bg-blue-900/20 rounded mt-2">
                      <input
                        type="text"
                        value={newSubtask}
                        onChange={(e) => setNewSubtask(e.target.value)}
                        placeholder="Add subtask..."
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
                      />
                      <button
                        onClick={handleAddSubtask}
                        disabled={!newSubtask.trim()}
                        className="w-full px-2 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Dependencies - Collapsible */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded">
                <button
                  onClick={() => setShowDependencies(!showDependencies)}
                  className="w-full p-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-xs font-semibold text-gray-900 dark:text-white"
                >
                  <span>Dependencies ({dependencies.length})</span>
                  <span>{showDependencies ? '▼' : '▶'}</span>
                </button>

                {showDependencies && (
                  <div className="p-2 border-t dark:border-gray-600 space-y-2">
                    {/* Dependencies List */}
                    {dependencies.length > 0 ? (
                      <div className="space-y-1">
                        {dependencies.map((dep) => (
                          <div key={dep.dependency_story_id} className="flex items-start gap-2 text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-600">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {dep.dependency_story_id}
                              </div>
                              <p className="text-gray-600 dark:text-gray-400">{dep.dependency_title || 'Untitled'}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 text-xs rounded font-medium">
                                {dep.link_type}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveDependency(dep.dependency_story_id)}
                              className="text-red-500 hover:text-red-700 dark:hover:text-red-400 flex-shrink-0 mt-1"
                              title="Remove dependency"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-xs italic">No dependencies</p>
                    )}

                    {/* Add Dependency Form */}
                    <div className="space-y-1 p-1 bg-purple-50 dark:bg-purple-900/20 rounded mt-2 border border-purple-200 dark:border-purple-800">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Add Dependency</label>
                      
                      {/* Searchable Story Dropdown */}
                      <div className="relative" data-dependency-dropdown>
                        <button
                          type="button"
                          onClick={() => setDependencySearchOpen(!dependencySearchOpen)}
                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition"
                        >
                          <span className={newDependencyId ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
                            {newDependencyId ? `${newDependencyId}` : 'Select a story...'}
                          </span>
                          <span className="text-gray-400">▼</span>
                        </button>

                        {dependencySearchOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 shadow-lg z-10 max-h-48 overflow-y-auto">
                            <input
                              type="text"
                              placeholder="Search by ID or title..."
                              value={dependencySearchQuery}
                              onChange={(e) => setDependencySearchQuery(e.target.value)}
                              className="w-full px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sticky top-0"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="text-xs">
                              {userStories
                                .filter(s => {
                                  // Exclude current story
                                  if (s.story_id === storyId) return false;
                                  // Exclude already-linked dependencies
                                  if (dependencies.some(d => d.dependency_story_id === s.story_id)) return false;
                                  // Filter by search query
                                  const query = dependencySearchQuery.toLowerCase();
                                  return s.story_id.toLowerCase().includes(query) || 
                                         (s.title && s.title.toLowerCase().includes(query));
                                })
                                .slice(0, 20)
                                .map((s) => (
                                  <button
                                    key={s.story_id}
                                    type="button"
                                    onClick={() => {
                                      setNewDependencyId(s.story_id);
                                      setDependencySearchOpen(false);
                                      setDependencySearchQuery('');
                                    }}
                                    className="w-full text-left px-2 py-1.5 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="font-semibold text-gray-900 dark:text-white">{s.story_id}</div>
                                      <div className="text-gray-600 dark:text-gray-400 text-xs">{s.title}</div>
                                    </div>
                                  </button>
                                ))}
                              {userStories.filter(s => {
                                if (s.story_id === storyId) return false;
                                if (dependencies.some(d => d.dependency_story_id === s.story_id)) return false;
                                const query = dependencySearchQuery.toLowerCase();
                                return s.story_id.toLowerCase().includes(query) || 
                                       (s.title && s.title.toLowerCase().includes(query));
                              }).length === 0 && (
                                <div className="px-2 py-2 text-gray-500 dark:text-gray-400 text-center italic">
                                  No stories available
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <select
                        value={newDependencyType}
                        onChange={(e) => setNewDependencyType(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
                      >
                        <option value="depends_on">Depends On</option>
                        <option value="blocks">Blocks</option>
                        <option value="relates_to">Relates To</option>
                        <option value="duplicates">Duplicates</option>
                      </select>
                      <button
                        onClick={handleAddDependency}
                        disabled={!newDependencyId || !newDependencyType}
                        className="w-full px-2 py-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white rounded text-xs font-semibold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Comments - Collapsible */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded">
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="w-full p-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 rounded text-xs font-semibold text-gray-900 dark:text-white"
                >
                  <span>Comments ({comments.length})</span>
                  <span>{showComments ? '▼' : '▶'}</span>
                </button>

                {showComments && (
                  <div className="p-2 border-t dark:border-gray-600 space-y-1 max-h-40 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-1 bg-white dark:bg-gray-800 rounded text-xs border-l-2 border-gray-300 dark:border-gray-600">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{comment.author}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-xs">{new Date(comment.created_at).toLocaleString()}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-500 hover:text-red-700 dark:hover:text-red-400 flex-shrink-0"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mt-1 text-xs whitespace-pre-wrap line-clamp-2">{comment.content}</p>
                      </div>
                    ))}

                    <div className="space-y-1 p-1 bg-green-50 dark:bg-green-900/20 rounded mt-2">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add comment..."
                        rows="2"
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="w-full px-2 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <FiSend size={12} />
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Activity Log Timeline */}
          <div className="hidden md:flex md:w-72 flex-col border-l dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <div className="px-4 py-3 border-b dark:border-gray-700 flex-shrink-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Activity Log</h4>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-0">
                {history && history.length > 0 ? (
                  history.map((entry, idx) => {
                    const changeTypeIcons = {
                      status_changed: '📊',
                      assignee_changed: '👤',
                      sprint_changed: '📅',
                      comment_added: '💬',
                      comment_deleted: '❌',
                      subtask_created: '➕',
                      subtask_completed: '✅',
                      subtask_deleted: '🗑️',
                      subtask_updated: '🔄',
                    };
                    const icon = changeTypeIcons[entry.change_type] || '•';
                    
                    // Format change type label
                    const getChangeLabel = (type) => {
                      const labels = {
                        status_changed: 'Status Changed',
                        assignee_changed: 'Assignee Changed',
                        sprint_changed: 'Sprint Changed',
                        comment_added: 'Comment Added',
                        comment_deleted: 'Comment Deleted',
                        subtask_created: 'Subtask Created',
                        subtask_completed: 'Subtask Completed',
                        subtask_deleted: 'Subtask Deleted',
                        subtask_updated: 'Subtask Updated',
                      };
                      return labels[type] || type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1);
                    };
                    
                    return (
                      <div key={entry.id}>
                        <div className="relative flex gap-4">
                          {/* Timeline line */}
                          {idx < history.length - 1 && (
                            <div className="absolute left-4 top-8 h-8 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                          )}
                          
                          {/* Icon circle */}
                          <div className="flex flex-col items-center relative z-10">
                            <div className="w-9 h-9 bg-white dark:bg-gray-800 rounded-full border-2 border-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {icon}
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 pt-1 pb-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {getChangeLabel(entry.change_type)}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {entry.old_value && entry.new_value ? (
                                <>
                                  <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">{entry.old_value}</span>
                                  <span className="mx-1">→</span>
                                  <span className="font-mono bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-300">{entry.new_value}</span>
                                </>
                              ) : entry.new_value ? (
                                <span className="font-mono bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-300">{entry.new_value}</span>
                              ) : entry.old_value ? (
                                <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">{entry.old_value}</span>
                              ) : null}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 bg-white dark:bg-gray-800 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs">
                        ✨
                      </div>
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Created</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {story && new Date(story.created_at).toLocaleDateString()} at {story && new Date(story.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
