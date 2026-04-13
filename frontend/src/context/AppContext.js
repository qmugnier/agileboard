import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sprintAPI, userStoryAPI, teamMemberAPI, statsAPI, projectAPI } from '../services/api';
import { useAuth } from './AuthContext';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const { token } = useAuth();
  const [sprints, setSprints] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [activeSprint, setActiveSprint] = useState(null);
  const [velocityMetrics, setVelocityMetrics] = useState(null);
  const [projectWideMetrics, setProjectWideMetrics] = useState(null);  // Always project-wide, ignores timeframe
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('auto');

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [sprintsRes, teamRes, storiesRes, projectsRes] = await Promise.all([
        sprintAPI.getAll(),
        teamMemberAPI.getAll(),
        userStoryAPI.getAll(),
        projectAPI.getAll(),
      ]);

      setSprints(sprintsRes.data);
      setTeamMembers(teamRes.data);
      setUserStories(storiesRes.data);
      setProjects(projectsRes.data);
      
      // Try to restore selected project from localStorage first
      const savedProjectId = localStorage.getItem('selectedProjectId');
      let projectToSelect = null;
      
      if (savedProjectId) {
        projectToSelect = projectsRes.data.find(p => p.id === parseInt(savedProjectId));
      }
      
      // If saved project not found, use default project
      if (!projectToSelect) {
        projectToSelect = projectsRes.data.find(p => p.is_default) || projectsRes.data[0];
      }
      
      if (projectToSelect) {
        setSelectedProjectId(projectToSelect.id);
        localStorage.setItem('selectedProjectId', projectToSelect.id.toString());
        
        // Fetch project-specific data for the selected project
        try {
          const requests = [
            projectAPI.getStatuses(projectToSelect.id),
            statsAPI.getVelocity(projectToSelect.id, analyticsTimeframe).catch(() => ({ data: { sprints: [], average_velocity: 0, trend: 'down' } })),
            userStoryAPI.getAll(projectToSelect.id),
          ];
          
          // Only fetch activeRes for non-project timeframes
          if (analyticsTimeframe !== 'project') {
            requests.push(statsAPI.getActiveSprint(projectToSelect.id, analyticsTimeframe).catch(() => null));
          }
          
          const results = await Promise.all(requests);
          const [statusesRes, velocityRes, storiesRes, activeRes] = analyticsTimeframe !== 'project' 
            ? results 
            : [results[0], results[1], results[2], null];
          
          setProjectStatuses(statusesRes.data);
          setVelocityMetrics(velocityRes.data);
          setUserStories(storiesRes.data);
          setActiveSprint(activeRes?.data || null);
          
          if (activeRes?.data) {
            setSelectedSprintId(activeRes.data.sprint_id);
          } else if (sprintsRes.data.filter(s => s.project_id === projectToSelect.id).length > 0) {
            setSelectedSprintId(sprintsRes.data.filter(s => s.project_id === projectToSelect.id)[0].id);
          }
        } catch (err) {
          console.error('Failed to fetch project-specific data:', err);
        }
      }

      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [analyticsTimeframe]);

  useEffect(() => {
    fetchAllData();
    // Only run on mount - intentionally omitting fetchAllData dependency
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch data whenever token changes (after login/signup/logout)
  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token, fetchAllData]);

  // Persist selected project to localStorage whenever it changes and fetch project-specific data
  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem('selectedProjectId', selectedProjectId.toString());
      // Fetch sprints, metrics, active sprint, statuses, and stories for the selected project
      const fetchProjectData = async () => {
        try {
          const [sprintsRes, velocityRes, statusesRes, storiesRes] = await Promise.all([
            projectAPI.getSprints(selectedProjectId),
            statsAPI.getVelocity(selectedProjectId, analyticsTimeframe).catch(() => ({ data: { sprints: [], average_velocity: 0, trend: 'down' } })),
            projectAPI.getStatuses(selectedProjectId),
            userStoryAPI.getAll(selectedProjectId),
          ]);
          
          // Only call getActiveSprint for non-project timeframes
          let activeRes = null;
          if (analyticsTimeframe !== 'project') {
            activeRes = await statsAPI.getActiveSprint(selectedProjectId, analyticsTimeframe).catch(() => null);
          }
          
          setSprints(sprintsRes.data);
          setVelocityMetrics(velocityRes.data);
          setActiveSprint(activeRes?.data || null);
          setProjectStatuses(statusesRes.data);
          setUserStories(storiesRes.data);
          
          // Update selected sprint to active sprint if available
          if (activeRes?.data) {
            setSelectedSprintId(activeRes.data.sprint_id);
          } else if (sprintsRes.data.length > 0) {
            setSelectedSprintId(sprintsRes.data[0].id);
          }
        } catch (err) {
          console.error('Failed to fetch project data:', err);
        }
      };
      fetchProjectData();
    }
  }, [selectedProjectId, analyticsTimeframe]);

  // Refetch stats when timeframe changes
  useEffect(() => {
    if (selectedProjectId) {
      const refetchStats = async () => {
        try {
          let errorSet = false;
          const velocityRes = await statsAPI.getVelocity(selectedProjectId, analyticsTimeframe).catch((err) => {
            // Handle 404 or other errors gracefully
            if (err.response?.status === 404) {
              setError(`No ${analyticsTimeframe === 'last_closed' ? 'closed' : analyticsTimeframe} sprint available`);
            } else {
              setError(err.response?.data?.detail || 'Failed to load velocity metrics');
            }
            errorSet = true;
            return { data: { sprints: [], average_velocity: 0, trend: 'down', timeframe: {} } };
          });
          
          // Fetch project-wide metrics (always use 'project' timeframe for summary cells)
          const projectWideRes = await statsAPI.getVelocity(selectedProjectId, 'project').catch(() => (
            { data: { sprints: [], average_velocity: 0, trend: 'down', timeframe: {} } }
          ));
          
          // Only call getActiveSprint for non-project timeframes (project view has no single sprint)
          let activeRes = null;
          if (analyticsTimeframe !== 'project') {
            activeRes = await statsAPI.getActiveSprint(selectedProjectId, analyticsTimeframe).catch((err) => {
              // Don't override error from velocity if we already set one
              if (!errorSet) {
                if (err.response?.status === 404) {
                  setError(`No ${analyticsTimeframe === 'last_closed' ? 'closed' : analyticsTimeframe} sprint available`);
                } else {
                  setError(err.response?.data?.detail || 'Failed to load sprint data');
                }
              }
              return null;
            });
          }

          setVelocityMetrics(velocityRes.data);
          setProjectWideMetrics(projectWideRes.data);
          setActiveSprint(activeRes?.data || null);
          
          // Clear error if request succeeded
          if (velocityRes.data?.sprints?.length > 0 || activeRes?.data) {
            setError(null);
          }
        } catch (err) {
          console.error('Failed to refetch stats with new timeframe:', err);
          setError('Failed to load analytics data');
        }
      };
      refetchStats();
    }
  }, [selectedProjectId, analyticsTimeframe]);

  const updateStoryStatus = async (storyId, status) => {
    try {
      const res = await userStoryAPI.update(storyId, { status });
      setUserStories(userStories.map(s => s.story_id === storyId ? res.data : s));
      
      // Preserve the current selected sprint and project when refreshing
      const currentSprintId = selectedSprintId;
      const currentProjectId = selectedProjectId;
      
      setLoading(true);
      const requests = [
        sprintAPI.getAll(),
        teamMemberAPI.getAll(),
        userStoryAPI.getAll(),
        statsAPI.getVelocity(currentProjectId, analyticsTimeframe),
      ];
      
      // Only fetch activeRes for non-project timeframes
      if (analyticsTimeframe !== 'project') {
        requests.push(statsAPI.getActiveSprint(currentProjectId, analyticsTimeframe).catch(() => null));
      }
      
      const results = await Promise.all(requests);
      const [sprintsRes, teamRes, storiesRes, velocityRes, activeRes = null] = results;

      setSprints(sprintsRes.data);
      setTeamMembers(teamRes.data);
      setUserStories(storiesRes.data);
      setVelocityMetrics(velocityRes.data);
      setActiveSprint(activeRes?.data || null);
      
      // Keep the selected sprint and project the same
      setSelectedSprintId(currentSprintId);
      setSelectedProjectId(currentProjectId);
      setError(null);
      setLoading(false);
      
      // Extra refresh to ensure dashboard syncs (prevents race conditions)
      setTimeout(() => lightRefreshStories().catch(() => {}), 100);
      
      return res.data;
    } catch (err) {
      setLoading(false);
      const errorDetail = err.response?.data?.detail || 'Failed to update story';
      setError(errorDetail);
      throw err;
    }
  };

  const moveStoryToSprint = async (storyId, sprintId, status = null) => {
    try {
      const updateData = { sprint_id: sprintId };
      if (status) {
        updateData.status = status;
      }
      const res = await userStoryAPI.update(storyId, updateData);
      setUserStories(userStories.map(s => s.story_id === storyId ? res.data : s));
      
      // Preserve the current selected sprint and project when refreshing
      const currentSprintId = selectedSprintId;
      const currentProjectId = selectedProjectId;
      
      setLoading(true);
      const requests = [
        sprintAPI.getAll(),
        teamMemberAPI.getAll(),
        userStoryAPI.getAll(),
        statsAPI.getVelocity(currentProjectId, analyticsTimeframe).catch(() => ({ data: { sprints: [], average_velocity: 0, trend: 'down' } })),
      ];
      
      // Only fetch activeRes for non-project timeframes
      if (analyticsTimeframe !== 'project') {
        requests.push(statsAPI.getActiveSprint(currentProjectId, analyticsTimeframe).catch(() => null));
      }
      
      const results = await Promise.all(requests);
      const [sprintsRes, teamRes, storiesRes, velocityRes, activeRes = null] = results;

      setSprints(sprintsRes.data);
      setTeamMembers(teamRes.data);
      setUserStories(storiesRes.data);
      setVelocityMetrics(velocityRes.data);
      setActiveSprint(activeRes?.data || null);
      
      // Keep the selected sprint and project the same
      setSelectedSprintId(currentSprintId);
      setSelectedProjectId(currentProjectId);
      setError(null);
      setLoading(false);
      
      // Extra refresh to ensure dashboard syncs (prevents race conditions)
      setTimeout(() => lightRefreshStories().catch(() => {}), 100);
      
      return res.data;
    } catch (err) {
      setLoading(false);
      const errorDetail = err.response?.data?.detail || 'Failed to move story';
      setError(errorDetail);
      throw err;
    }
  };

  // Light refresh for non-blocking updates (like assignments)
  const lightRefreshStories = async () => {
    try {
      const storiesRes = await userStoryAPI.getAll();
      setUserStories(storiesRes.data);
    } catch (err) {
      console.error('Failed to refresh stories:', err);
    }
  };

  const assignStory = async (storyId, userId) => {
    try {
      // Get current story to check if it has an existing assignment
      const story = userStories.find(s => s.story_id === storyId);
      
      // If there's an existing assignment, unassign it first (single assignment only)
      if (story && story.assigned_to && story.assigned_to.length > 0) {
        const currentAssignee = story.assigned_to[0];
        if (currentAssignee.id !== userId) {
          // Different person being assigned, unassign the current one first
          await userStoryAPI.unassign(storyId, currentAssignee.id);
        } else {
          // Same person already assigned, do nothing
          return;
        }
      }
      
      // Now assign the new user
      await userStoryAPI.assign(storyId, userId);
      // Refresh stories in background without blocking UI
      lightRefreshStories();
    } catch (err) {
      const errorDetail = err.response?.data?.detail || 'Failed to assign story';
      setError(errorDetail);
      throw err;
    }
  };

  const unassignStory = async (storyId, userId) => {
    try {
      await userStoryAPI.unassign(storyId, userId);
      // Refresh stories in background without blocking UI
      lightRefreshStories();
    } catch (err) {
      const errorDetail = err.response?.data?.detail || 'Failed to unassign story';
      setError(errorDetail);
      throw err;
    }
  };

  const setProjectAndLoadStatuses = async (projectId) => {
    try {
      setSelectedProjectId(projectId);
      localStorage.setItem('selectedProjectId', projectId.toString());
      // Load statuses, velocity metrics, and active sprint for the project
      const requests = [
        projectAPI.getStatuses(projectId),
        statsAPI.getVelocity(projectId, analyticsTimeframe).catch(() => ({ data: { sprints: [], average_velocity: 0, trend: 'down' } })),
      ];
      
      let activeRes = null;
      if (analyticsTimeframe !== 'project') {
        requests.push(statsAPI.getActiveSprint(projectId, analyticsTimeframe).catch(() => null));
      }
      
      const results = await Promise.all(requests);
      const [statusesRes, velocityRes, ...rest] = results;
      if (analyticsTimeframe !== 'project') {
        [activeRes] = rest;
      }
      
      setProjectStatuses(statusesRes.data);
      setVelocityMetrics(velocityRes.data);
      setActiveSprint(activeRes?.data || null);
    } catch (err) {
      setError('Failed to load project data');
      console.error(err);
    }
  };

  // Light refresh for projects and team members without affecting selectedProjectId
  const refreshProjectsAndTeamMembers = async () => {
    try {
      const [projectsRes, teamRes] = await Promise.all([
        projectAPI.getAll(),
        teamMemberAPI.getAll(),
      ]);
      setProjects(projectsRes.data);
      setTeamMembers(teamRes.data);
    } catch (err) {
      console.error('Failed to refresh projects and team members:', err);
    }
  };

  const value = {
    sprints,
    projects,
    projectStatuses,
    userStories,
    teamMembers,
    activeSprint,
    velocityMetrics,
    projectWideMetrics,
    loading,
    error,
    selectedSprintId,
    setSelectedSprintId,
    selectedProjectId,
    analyticsTimeframe,
    setAnalyticsTimeframe,
    setProjectAndLoadStatuses,
    fetchAllData,
    updateStoryStatus,
    moveStoryToSprint,
    assignStory,
    unassignStory,
    lightRefreshStories,
    refreshProjectsAndTeamMembers,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
