import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('stay_connected');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Sprints
export const sprintAPI = {
  getAll: () => api.get('/sprints'),
  getById: (id) => api.get(`/sprints/${id}`),
  create: (data) => api.post('/sprints', data),
  update: (id, data) => api.put(`/sprints/${id}`, data),
  delete: (id) => api.delete(`/sprints/${id}`),
  start: (id) => api.post(`/sprints/${id}/start`),
  end: (id) => api.post(`/sprints/${id}/end`),
  reopen: (id) => api.post(`/sprints/${id}/reopen`),
};

// User Stories
export const userStoryAPI = {
  getAll: (projectId, sprintId, status) => {
    const params = {};
    if (projectId) params.project_id = projectId;
    if (sprintId) params.sprint_id = sprintId;
    if (status) params.status = status;
    return api.get('/user-stories', { params });
  },
  getById: (id) => api.get(`/user-stories/${id}`),
  update: (id, data) => api.put(`/user-stories/${id}`, data),
  assign: (id, userId) => api.post(`/user-stories/${id}/assign`, { user_id: userId }),
  unassign: (id, userId) => api.post(`/user-stories/${id}/unassign`, { user_id: userId }),
  getHistory: (storyId) => api.get(`/user-stories/${storyId}/history`),
  
  // Dependencies
  getDependencies: (storyId) => api.get(`/user-stories/${storyId}/dependencies`),
  addDependency: (storyId, depData) => api.post(`/user-stories/${storyId}/dependencies`, depData),
  removeDependency: (storyId, depStoryId) => api.delete(`/user-stories/${storyId}/dependencies/${depStoryId}`),
  getBlockedBy: (storyId) => api.get(`/user-stories/${storyId}/blocked-by`),
  getBlocking: (storyId) => api.get(`/user-stories/${storyId}/blocking`),
  getStatusInfo: (storyId) => api.get(`/user-stories/${storyId}/status-info`),
  
  // Subtasks
  getSubtasks: (storyId) => api.get(`/user-stories/${storyId}/subtasks`),
  createSubtask: (storyId, data) => api.post(`/user-stories/${storyId}/subtasks`, data),
  updateSubtask: (subtaskId, data) => api.put(`/subtasks/${subtaskId}`, data),
  deleteSubtask: (subtaskId) => api.delete(`/subtasks/${subtaskId}`),
  
  // Comments
  getComments: (storyId) => api.get(`/user-stories/${storyId}/comments`),
  createComment: (storyId, data) => api.post(`/user-stories/${storyId}/comments`, data),
  updateComment: (commentId, data) => api.put(`/comments/${commentId}`, data),
  deleteComment: (commentId) => api.delete(`/comments/${commentId}`),
};

// Team Members
export const teamMemberAPI = {
  getAll: () => api.get('/team-members'),
  getById: (id) => api.get(`/team-members/${id}`),
  create: (data) => api.post('/team-members', data),
  update: (id, data) => api.put(`/team-members/${id}`, data),
  delete: (id) => api.delete(`/team-members/${id}`),
  resetPassword: (id, password) => api.post(`/team-members/${id}/reset-password`, { password }),
};

// Projects
export const projectAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getSprints: (projectId) => api.get(`/projects/${projectId}/sprints`),
  checkSprintReduction: (projectId, newSprintCount) => api.get(`/projects/${projectId}/check-sprint-reduction?new_sprint_count=${newSprintCount}`),  
  // Project Statuses
  getStatuses: (projectId) => api.get(`/projects/${projectId}/statuses`),
  createStatus: (projectId, data) => api.post(`/projects/${projectId}/statuses`, data),
  updateStatus: (projectId, statusId, data) => api.put(`/project-statuses/${projectId}/${statusId}`, data),
  deleteStatus: (projectId, statusId) => api.delete(`/project-statuses/${projectId}/${statusId}`),
  
  // Status Workflow Transitions
  getStatusWorkflow: (projectId) => api.get(`/projects/${projectId}/status-workflow`),
  getTransitions: (projectId) => api.get(`/projects/${projectId}/transitions`),
  createTransition: (fromStatusId, toStatusId) => api.post(`/project-statuses/${fromStatusId}/set-next/${toStatusId}`),
  deleteTransition: (fromStatusId, toStatusId) => api.delete(`/project-statuses/${fromStatusId}/set-next/${toStatusId}`),
  
  // Project Epics
  getEpics: (projectId) => api.get(`/projects/${projectId}/epics`),
  createEpic: (projectId, data) => api.post(`/projects/${projectId}/epics`, data),
  updateEpic: (epicId, data) => api.put(`/epics/${epicId}`, data),
  deleteEpic: (epicId) => api.delete(`/epics/${epicId}`),
  
  // Team Assignment
  assignTeam: (projectId, userId) => api.post(`/projects/${projectId}/assign-team`, { user_id: userId }),
  unassignTeam: (projectId, userId) => api.post(`/projects/${projectId}/unassign-team`, { user_id: userId }),
};

// Daily Updates
export const dailyUpdateAPI = {
  create: (data) => api.post('/daily-updates', data),
  getByStory: (storyId) => api.get(`/daily-updates/${storyId}`),
};

// Statistics
export const statsAPI = {
  /**
   * Get velocity metrics for a project
   * @param {number} projectId - Project ID (required)
   * @param {string} timeframe - 'auto' (default), 'active', 'last_closed', or 'project'
   *   - 'auto': Current active sprint if exists, else last closed sprint, else project data
   *   - 'active': Only active sprint (error if none exists)
   *   - 'last_closed': Only last closed sprint (error if none exists)
   *   - 'project': All sprints in project (entire history)
   */
  getVelocity: (projectId, timeframe = 'auto') => {
    if (!projectId) {
      throw new Error('projectId is required for velocity metrics');
    }
    return api.get(`/stats/velocity?project_id=${projectId}&timeframe=${timeframe}`);
  },

  /**
   * Get sprint statistics for the specified timeframe
   * @param {number} projectId - Project ID (required)
   * @param {string} timeframe - 'auto' (default), 'active', or 'last_closed'
   *   - 'auto': Current active sprint if exists, else last closed sprint
   *   - 'active': Only active sprint (error if none exists)
   *   - 'last_closed': Only last closed sprint (error if none exists)
   */
  getActiveSprint: (projectId, timeframe = 'auto') => {
    if (!projectId) {
      throw new Error('projectId is required for sprint stats');
    }
    return api.get(`/stats/active-sprint?project_id=${projectId}&timeframe=${timeframe}`);
  },
  
  /**
   * Get daily breakdown for a specific sprint
   * @param {number} sprintId - Sprint ID (required)
   * @returns {Promise} Sprint daily breakdown data with daily data points
   */
  getSprintDailyBreakdown: (sprintId) => {
    if (!sprintId) {
      throw new Error('sprintId is required for daily breakdown');
    }
    return api.get(`/stats/sprint-daily-breakdown?sprint_id=${sprintId}`);
  },
};

// Import
export const importAPI = {
  uploadCSV: (file, projectId) => {
    const formData = new FormData();
    formData.append('file', file);
    const url = projectId ? `/import/csv?project_id=${projectId}` : '/import/csv';
    return api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Export
export const exportAPI = {
  getProjectJira: (projectId, includeDependencies = false) =>
    api.get(`/export/jira-compatible/project?project_id=${projectId}&include_dependencies=${includeDependencies}`),
  
  getSprintJira: (sprintId) =>
    api.get(`/export/jira-compatible/sprint?sprint_id=${sprintId}`),
  
  validateExport: (projectId) =>
    api.get(`/export/validation?project_id=${projectId}`),
  
  markSynced: (storyId, jiraIssueKey) =>
    api.post(`/export/mark-synced?story_id=${storyId}&jira_issue_key=${jiraIssueKey}`),
  
  getFormatInfo: () =>
    api.get('/export/format-info'),
};

// Configuration Management (Roles, Positions, Departments)
export const configAPI = {
  // Roles
  getRoles: (projectId = null) => {
    const params = projectId ? { project_id: projectId } : {};
    return api.get('/config/roles', { params });
  },
  createRole: (data, projectId = null) => {
    const params = projectId ? { project_id: projectId } : {};
    return api.post('/config/roles', data, { params });
  },
  updateRole: (id, data) => api.put(`/config/roles/${id}`, data),
  deleteRole: (id) => api.delete(`/config/roles/${id}`),

  // Positions
  getPositions: (projectId = null) => {
    const params = projectId ? { project_id: projectId } : {};
    return api.get('/config/positions', { params });
  },
  createPosition: (data, projectId = null) => {
    const params = projectId ? { project_id: projectId } : {};
    return api.post('/config/positions', data, { params });
  },
  updatePosition: (id, data) => api.put(`/config/positions/${id}`, data),
  deletePosition: (id) => api.delete(`/config/positions/${id}`),

  // Departments
  getDepartments: (projectId = null) => {
    const params = projectId ? { project_id: projectId } : {};
    return api.get('/config/departments', { params });
  },
  createDepartment: (data, projectId = null) => {
    const params = projectId ? { project_id: projectId } : {};
    return api.post('/config/departments', data, { params });
  },
  updateDepartment: (id, data) => api.put(`/config/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/config/departments/${id}`),
};

export default api;
