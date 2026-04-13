    import React, { useState } from 'react';
import { FiX, FiPlus, FiEdit2, FiTrash2, FiUpload } from 'react-icons/fi';
import clsx from 'clsx';
import { useAppContext } from '../context/AppContext';
import { projectAPI, importAPI, exportAPI } from '../services/api';
import WorkflowDesigner from './WorkflowDesigner';
import { TeamManagement } from './TeamManagement';
import MemberAssignmentTable from './MemberAssignmentTable';
import ConfigurationManagement from './ConfigurationManagement';

// Function to generate random colors
const getRandomColor = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B4D1', '#A8E6CF'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const ConfigurationView = () => {
  const { userStories, teamMembers, fetchAllData, refreshProjectsAndTeamMembers, setProjectAndLoadStatuses, selectedProjectId } = useAppContext();
  const [activeTab, setActiveTabState] = useState(() => {
    // Restore activeTab from localStorage on mount
    return localStorage.getItem('configActiveTab') || 'projects';
  });
  
  // Preserve activeTab to localStorage whenever it changes
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem('configActiveTab', tab);
  };
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form states - Initialize colors with random values on mount
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState(() => getRandomColor());
  const [newStatusIsFinal, setNewStatusIsFinal] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  
  // Epic form states - Initialize colors with random values on mount
  const [projectEpics, setProjectEpics] = useState([]);
  const [newEpicName, setNewEpicName] = useState('');
  const [newEpicColor, setNewEpicColor] = useState(() => getRandomColor());
  const [newEpicDesc, setNewEpicDesc] = useState('');
  const [editingEpic, setEditingEpic] = useState(null);
  
  // Import states
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importDropActive, setImportDropActive] = useState(false);

  // Export states
  const [exportLoading, setExportLoading] = useState(false);
  const [, setExportData] = useState(null); // Setter used in export handler
  const [exportValidation, setExportValidation] = useState(null);
  const [includeDependencies, setIncludeDependencies] = useState(true);

  // Sprint forecasting states
  const [numForecastedSprints, setNumForecastedSprints] = useState(5);
  const [defaultSprintDurationDays, setDefaultSprintDurationDays] = useState(14);
  const [sprintSettingsSaving, setSprintSettingsSaving] = useState(false);

  // Track member assignments count {memberId: count}
  const [memberAssignmentCounts, setMemberAssignmentCounts] = useState({});

  // Member assignment table sorting and filtering
  const [memberSortBy, setMemberSortBy] = useState('name');
  const [memberSortOrder, setMemberSortOrder] = useState('asc');
  const [memberFilterAssigned, setMemberFilterAssigned] = useState(null);

  // Define loadProjectStatuses BEFORE any useEffect that uses it
  const loadProjectStatuses = React.useCallback(async (projectId) => {
    try {
      const response = await projectAPI.getStatuses(projectId);
      setProjectStatuses(response.data);
      // Also load epics for the project
      const epicsResponse = await projectAPI.getEpics(projectId);
      setProjectEpics(epicsResponse.data);
      // Load sprint settings
      const projectResponse = await projectAPI.getById(projectId);
      setNumForecastedSprints(projectResponse.data.num_forecasted_sprints || 5);
      setDefaultSprintDurationDays(projectResponse.data.default_sprint_duration_days || 14);
    } catch (err) {
      console.error('Failed to load project statuses/epics/settings', err);
    }
  }, []);

  const loadProjects = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getAll();
      setProjects(response.data);
      if (response.data.length > 0 && !selectedProject) {
        // Only auto-select if no project is currently selected
        const projectToSelect = response.data.find(p => p.is_default) || response.data[0];
        setSelectedProject(projectToSelect.id);
        loadProjectStatuses(projectToSelect.id);
      }
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [loadProjectStatuses, selectedProject]);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Sync local selectedProject with global selectedProjectId when changed from elsewhere
  React.useEffect(() => {
    if (selectedProjectId && selectedProject !== selectedProjectId) {
      setSelectedProject(selectedProjectId);
      loadProjectStatuses(selectedProjectId);
    }
  }, [selectedProjectId, selectedProject, loadProjectStatuses]);

  // Calculate member assignment counts for the selected project
  React.useEffect(() => {
    if (!selectedProject || !userStories) {
      setMemberAssignmentCounts({});
      return;
    }

    const projectStories = userStories.filter(s => s.project_id === selectedProject);
    const counts = {};

    // Count assignments for each team member
    projectStories.forEach(story => {
      if (story.assigned_to && story.assigned_to.length > 0) {
        story.assigned_to.forEach(member => {
          // Handle both TeamMember objects and raw IDs
          const memberId = typeof member === 'object' ? member.id : member;
          counts[memberId] = (counts[memberId] || 0) + 1;
        });
      }
    });

    setMemberAssignmentCounts(counts);
  }, [selectedProject, userStories]);

  // Count stories using a specific status
  const getStatusUsageCount = (statusName) => {
    if (!selectedProject) return 0;
    const projectStories = userStories.filter(s => s.project_id === selectedProject);
    return projectStories.filter(s => s.status === statusName).length;
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const response = await projectAPI.create({
        name: newProjectName,
        description: newProjectDesc,
        is_default: false
      });
      setProjects([...projects, response.data]);
      setNewProjectName('');
      setNewProjectDesc('');
      setSelectedProject(response.data.id);
      loadProjectStatuses(response.data.id);
      // Refresh global AppContext projects list (lightweight, no loading state)
      await refreshProjectsAndTeamMembers();
    } catch (err) {
      setError('Failed to create project');
      console.error(err);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;

    try {
      await projectAPI.delete(projectId);
      
      // Update local state
      const remainingProjects = projects.filter(p => p.id !== projectId);
      setProjects(remainingProjects);
      
      // Update local selected project if needed
      if (selectedProject === projectId) {
        setSelectedProject(remainingProjects[0]?.id || null);
      }
      
      // Update global context: if deleted project was selected, switch to another one
      if (selectedProjectId === projectId && remainingProjects.length > 0) {
        // Switch to first available project in global context
        await setProjectAndLoadStatuses(remainingProjects[0].id);
      } else if (selectedProjectId === projectId) {
        // No projects left, clear selection
        localStorage.removeItem('selectedProjectId');
      }
      
      // Refresh global context to update projects list everywhere
      await refreshProjectsAndTeamMembers();
      
      setError('✓ Project deleted successfully');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to delete project';
      setError(errorMsg);
      console.error(err);
    }
  };

  const handleUpdateSprintSettings = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSprintSettingsSaving(true);
    try {
      const currentProjectId = selectedProject;
      // Save to localStorage FIRST so fetchAllData will restore this project
      localStorage.setItem('selectedProjectId', currentProjectId.toString());
      
      // Validate sprint reduction
      const validation = await projectAPI.checkSprintReduction(selectedProject, numForecastedSprints);
      if (!validation.data.allowed) {
        setError(validation.data.message);
        setSprintSettingsSaving(false);
        return;
      }

      // If validation passed, update the project
      await projectAPI.update(selectedProject, {
        num_forecasted_sprints: numForecastedSprints,
        default_sprint_duration_days: defaultSprintDurationDays
      });
      
      // Refresh projects and global data to update all dropdowns
      console.log('Refreshing projects and data after sprint settings update...');
      await loadProjects();
      await refreshProjectsAndTeamMembers();
      await fetchAllData();
      
      setError('✓ Sprint settings updated successfully');
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to update sprint settings');
      }
      console.error(err);
    } finally {
      setSprintSettingsSaving(false);
    }
  };

  const handleCreateStatus = async (e) => {
    e.preventDefault();
    if (!selectedProject || !newStatusName.trim()) return;

    try {
      const response = await projectAPI.createStatus(selectedProject, {
        status_name: newStatusName,
        color: newStatusColor,
        order: projectStatuses.length + 1,
        is_locked: false,
        is_final: newStatusIsFinal
      });
      setProjectStatuses([...projectStatuses, response.data]);
      setNewStatusName('');
      setNewStatusColor(getRandomColor());
      setNewStatusIsFinal(false);
    } catch (err) {
      setError('Failed to create status');
      console.error(err);
    }
  };

  const handleUpdateStatus = async (statusId, updates) => {
    try {
      const response = await projectAPI.updateStatus(selectedProject, statusId, updates);
      setProjectStatuses(projectStatuses.map(s => s.id === statusId ? response.data : s));
      setEditingStatus(null);
    } catch (err) {
      setError('Failed to update status');
      console.error(err);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    if (!window.confirm('Delete this status?')) return;

    try {
      await projectAPI.deleteStatus(selectedProject, statusId);
      setProjectStatuses(projectStatuses.filter(s => s.id !== statusId));
    } catch (err) {
      setError('Failed to delete status');
      console.error(err);
    }
  };

  // Epic handlers
  const handleCreateEpic = async (e) => {
    e.preventDefault();
    if (!selectedProject || !newEpicName.trim()) return;

    try {
      const currentProjectId = selectedProject;
      // Save to localStorage FIRST so fetchAllData will restore this project
      localStorage.setItem('selectedProjectId', currentProjectId.toString());
      
      await projectAPI.createEpic(selectedProject, {
        name: newEpicName,
        color: newEpicColor,
        description: newEpicDesc
      });
      
      // Reset form with random color immediately (don't add to local state)
      setNewEpicName('');
      setNewEpicColor(getRandomColor());
      setNewEpicDesc('');
      
      // Refresh global context to sync epic changes
      await fetchAllData();
    } catch (err) {
      setError('Failed to create epic');
      console.error(err);
    }
  };

  const handleUpdateEpic = async (epicId, updates) => {
    try {
      const currentProjectId = selectedProject;
      // Save to localStorage FIRST so fetchAllData will restore this project
      localStorage.setItem('selectedProjectId', currentProjectId.toString());
      
      const response = await projectAPI.updateEpic(epicId, updates);
      // Refresh global context to sync epic changes (includes localStorage restoration)
      await fetchAllData();
      setProjectEpics(projectEpics.map(e => e.id === epicId ? response.data : e));
      setEditingEpic(null);
    } catch (err) {
      setError('Failed to update epic');
      console.error(err);
    }
  };

  const handleDeleteEpic = async (epicId) => {
    if (!window.confirm('Delete this epic?')) return;
    
    try {
      await projectAPI.deleteEpic(epicId);
      // Update local state without refreshing global context
      setProjectEpics(projectEpics.filter(e => e.id !== epicId));
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data.detail || 'Cannot delete epic: stories are assigned to it');
      } else {
        setError('Failed to delete epic');
      }
      console.error(err);
    }
  };

  const handleToggleProjectMember = async (projectId, memberId, isCurrentlyAssigned) => {
    try {
      if (isCurrentlyAssigned) {
        // Remove member from project
        await projectAPI.unassignTeam(projectId, memberId);
      } else {
        // Add member to project
        await projectAPI.assignTeam(projectId, memberId);
      }
      
      // Reload projects locally without affecting selectedProjectId in ConfigurationView
      const response = await projectAPI.getAll();
      setProjects(response.data);
      
      // Refresh global context with updated projects and team members
      // This won't affect the global selectedProjectId
      await refreshProjectsAndTeamMembers();
      
      // Reload statuses for the current project
      await loadProjectStatuses(projectId);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || (isCurrentlyAssigned ? 'Failed to remove team member' : 'Failed to add team member');
      setError(errorMsg);
      console.error(err);
    }
  };

  // Parse and validate CSV structure
  const validateCSVStructure = (text) => {
    try {
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        return { valid: false, error: 'CSV file is empty or has only headers' };
      }

      // Parse header
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Detect CSV format
      const isUserStoryFormat = 
        header.includes('epic') && 
        header.includes('story id') && 
        header.includes('user story') && 
        header.includes('description') && 
        header.includes('business value') && 
        header.includes('effort');
        
      const isOldFormat = 
        header.includes('story id') && 
        header.includes('user story') && 
        header.includes('description') && 
        header.includes('business value') && 
        header.includes('effort');
        
      const isNewFormat = 
        header.includes('name') && 
        header.includes('description') && 
        header.includes('priority');
      
      if (!isUserStoryFormat && !isOldFormat && !isNewFormat) {
        return { 
          valid: false, 
          error: `Unrecognized CSV format. Supported formats:\n` +
            `1. User Story: Epic, Story ID, User Story, Description, Business Value, Effort, Dependencies\n` +
            `2. Legacy: Story ID, User Story, Description, Business Value, Effort\n` +
            `3. New: name, description, priority (low/medium/high), story_points (optional), epic_id (optional)` 
        };
      }

      // Get column indices based on detected format
      const getColumnIndex = (colName) => header.indexOf(colName.toLowerCase());
      
      const errors = [];

      // Validate data rows
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // Skip empty lines
        
        const values = lines[i].split(',').map(v => v.trim());
        const rowNum = i + 1;

        if (isUserStoryFormat) {
          // User Story format validation
          const storyIdIdx = getColumnIndex('Story ID');
          const userStoryIdx = getColumnIndex('User Story');
          const descIdx = getColumnIndex('Description');
          const bvIdx = getColumnIndex('Business Value');
          const effortIdx = getColumnIndex('Effort');
          
          // Check required fields
          if (!values[storyIdIdx] || !values[storyIdIdx].trim()) {
            errors.push(`Row ${rowNum}: Story ID is empty`);
          }
          if (!values[userStoryIdx] || !values[userStoryIdx].trim()) {
            errors.push(`Row ${rowNum}: User Story is empty`);
          }
          if (!values[descIdx] || !values[descIdx].trim()) {
            errors.push(`Row ${rowNum}: Description is empty`);
          }
          
          // Validate numeric fields
          if (values[bvIdx] && values[bvIdx].trim()) {
            const bv = parseInt(values[bvIdx]);
            if (isNaN(bv) || bv < 0) {
              errors.push(`Row ${rowNum}: Business Value "${values[bvIdx]}" must be a non-negative number`);
            }
          } else {
            errors.push(`Row ${rowNum}: Business Value is empty`);
          }
          
          if (values[effortIdx] && values[effortIdx].trim()) {
            const effort = parseInt(values[effortIdx]);
            if (isNaN(effort) || effort < 0) {
              errors.push(`Row ${rowNum}: Effort "${values[effortIdx]}" must be a non-negative number`);
            }
          } else {
            errors.push(`Row ${rowNum}: Effort is empty`);
          }
          
        } else if (isOldFormat) {
          // Old format validation (without Epic requirement)
          const storyIdIdx = getColumnIndex('Story ID');
          const userStoryIdx = getColumnIndex('User Story');
          const descIdx = getColumnIndex('Description');
          const bvIdx = getColumnIndex('Business Value');
          const effortIdx = getColumnIndex('Effort');
          
          // Check required fields
          if (!values[storyIdIdx] || !values[storyIdIdx].trim()) {
            errors.push(`Row ${rowNum}: Story ID is empty`);
          }
          if (!values[userStoryIdx] || !values[userStoryIdx].trim()) {
            errors.push(`Row ${rowNum}: User Story is empty`);
          }
          if (!values[descIdx] || !values[descIdx].trim()) {
            errors.push(`Row ${rowNum}: Description is empty`);
          }
          
          // Validate numeric fields
          if (values[bvIdx] && values[bvIdx].trim()) {
            const bv = parseInt(values[bvIdx]);
            if (isNaN(bv) || bv < 0) {
              errors.push(`Row ${rowNum}: Business Value "${values[bvIdx]}" must be a non-negative number`);
            }
          } else {
            errors.push(`Row ${rowNum}: Business Value is empty`);
          }
          
          if (values[effortIdx] && values[effortIdx].trim()) {
            const effort = parseInt(values[effortIdx]);
            if (isNaN(effort) || effort < 0) {
              errors.push(`Row ${rowNum}: Effort "${values[effortIdx]}" must be a non-negative number`);
            }
          } else {
            errors.push(`Row ${rowNum}: Effort is empty`);
          }
          
        } else if (isNewFormat) {
          // New format validation
          const nameIdx = getColumnIndex('name');
          const descIdx = getColumnIndex('description');
          const priorityIdx = getColumnIndex('priority');
          const spIdx = getColumnIndex('story_points');
          const epicIdx = getColumnIndex('epic_id');

          // Check name
          if (!values[nameIdx] || !values[nameIdx].trim()) {
            errors.push(`Row ${rowNum}: name is empty`);
          }

          // Check description
          if (!values[descIdx] || !values[descIdx].trim()) {
            errors.push(`Row ${rowNum}: description is empty`);
          }

          // Check priority
          const priority = values[priorityIdx]?.toLowerCase().trim();
          if (!priority) {
            errors.push(`Row ${rowNum}: priority is empty`);
          } else if (!['low', 'medium', 'high'].includes(priority)) {
            errors.push(`Row ${rowNum}: priority "${values[priorityIdx]}" is invalid (must be: low, medium, or high)`);
          }

          // Validate story_points (optional but must be number if provided)
          if (spIdx >= 0 && values[spIdx] && values[spIdx].trim()) {
            const sp = parseFloat(values[spIdx]);
            if (isNaN(sp) || sp <= 0) {
              errors.push(`Row ${rowNum}: story_points "${values[spIdx]}" must be a positive number`);
            }
          }

          // Validate epic_id (optional but must be number if provided)
          if (epicIdx >= 0 && values[epicIdx] && values[epicIdx].trim()) {
            const eid = parseInt(values[epicIdx]);
            if (isNaN(eid) || eid <= 0) {
              errors.push(`Row ${rowNum}: epic_id "${values[epicIdx]}" must be a positive integer`);
            }
          }
        }

        // Limit errors to first 10 rows to avoid overwhelming user
        if (errors.length >= 10) {
          errors.push('... and more errors');
          break;
        }
      }

      if (errors.length > 0) {
        return { 
          valid: false, 
          error: `CSV validation errors:\n${errors.slice(0, 10).join('\n')}` 
        };
      }

      return { valid: true, lineCount: lines.length - 1 };
    } catch (err) {
      return { valid: false, error: `Failed to parse CSV: ${err.message}` };
    }
  };

  // === EXPORT HANDLERS ===
  const handleExportProject = async (format) => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }

    setExportLoading(true);
    setError('');

    try {
      const response = await exportAPI.getProjectJira(selectedProject, includeDependencies);
      
      if (response.data.success) {
        setExportData(response.data.data);
        setExportValidation(response.data.validation);
        
        // Trigger download
        const dataStr = JSON.stringify(response.data.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedProject}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        setError(`✓ Exported project successfully. ${response.data.validation.story_count} stories exported.`);
        setTimeout(() => setError(''), 5000);
      } else {
        setError(response.data.error || 'Export failed');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to export';
      setError(errorMsg);
      console.error(err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleValidateExport = async () => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }

    setExportLoading(true);

    try {
      const response = await exportAPI.validateExport(selectedProject);
      setExportValidation(response.data);

      if (response.data.ready_for_export) {
        setError(`✓ Project is ready for export. ${response.data.story_count} stories validated.`);
      } else {
        const errorList = response.data.errors.join('\n');
        setError(`Export validation failed:\n${errorList}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Validation failed');
      console.error(err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportCSV = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setError('Please select a CSV file');
      return;
    }

    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }

    setImportLoading(true);
    setError('');

    try {
      // Read and validate CSV structure
      const fileText = await importFile.text();
      const validation = validateCSVStructure(fileText);
      
      if (!validation.valid) {
        setError(validation.error);
        setImportLoading(false);
        return;
      }

      // If validation passed, upload to backend with project_id
      const response = await importAPI.uploadCSV(importFile, selectedProject);
      if (response.data.success) {
        // Refresh data after import
        await fetchAllData();
        setImportFile(null);
        // Show success message
        setError(`✓ Successfully imported ${validation.lineCount} user stories to project`);
        setTimeout(() => {
          setError('');
        }, 3000);
      } else {
        setError(response.data.error || 'Import failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to import CSV');
      console.error(err);
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError('');
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please select a valid CSV file (must have .csv extension)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('CSV file is too large (max 5MB)');
      return;
    }
    
    setImportFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImportDropActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImportDropActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImportDropActive(false);
    setError('');
    
    const file = e.dataTransfer.files?.[0];
    if (!file) {
      setError('No file detected');
      return;
    }
    
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please drop a valid CSV file (must have .csv extension)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('CSV file is too large (max 5MB)');
      return;
    }
    
    setImportFile(file);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-4 rounded-lg flex justify-between items-start gap-4">
          <div className="flex-1 whitespace-pre-wrap text-sm">{error}</div>
          <button onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 flex-shrink-0">
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-300 dark:border-gray-700">
        {['projects', 'team', 'statuses', 'workflow', 'epics', 'sprint-settings', 'settings', 'import', 'export'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 font-medium capitalized border-b-2 transition',
              activeTab === tab
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            )}
          >
            {tab === 'sprint-settings' ? 'Sprint Settings' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Projects</h3>
          
          <form onSubmit={handleCreateProject} className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Project name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-2"
            >
              <FiPlus size={18} /> Create Project
            </button>
          </form>

          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading projects...</div>
          ) : projects.length > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={clsx(
                      'p-4 rounded-lg border-2 cursor-pointer transition',
                      selectedProject === project.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-300'
                    )}
                    onClick={() => {
                      setProjectAndLoadStatuses(project.id);
                      setSelectedProject(project.id);
                      loadProjectStatuses(project.id);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {project.name}
                          {project.is_default && (
                            <span className="ml-2 text-xs bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </h4>
                        {project.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{project.description}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {project.team_members?.length || 0} team members • {project.statuses?.length || 0} statuses
                        </p>
                      </div>
                      {!project.is_default && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Team Assignment Section */}
              {selectedProject && (
                <div className="bg-purple-50 dark:bg-gray-700 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Manage Team Members
                  </h4>
                  <MemberAssignmentTable
                    teamMembers={teamMembers || []}
                    projectMembers={projects.find(p => p.id === selectedProject)?.team_members || []}
                    memberAssignmentCounts={memberAssignmentCounts}
                    onToggleMember={(memberId, isAssigned) => 
                      handleToggleProjectMember(selectedProject, memberId, isAssigned)
                    }
                    loading={loading}
                    sortBy={memberSortBy}
                    sortOrder={memberSortOrder}
                    onSortChange={(column, order) => {
                      setMemberSortBy(column);
                      setMemberSortOrder(order);
                    }}
                    filterAssigned={memberFilterAssigned}
                    onFilterChange={setMemberFilterAssigned}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No projects yet</div>
          )}
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <TeamManagement />
      )}

      {/* Status Tab */}
      {activeTab === 'statuses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Project Statuses & Colors
            </h3>
            {selectedProject && (
              <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded">
                Project: {projects.find(p => p.id === selectedProject)?.name}
              </div>
            )}
          </div>
          
          {selectedProject ? (
            <>
              <form onSubmit={handleCreateStatus} className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg space-y-3">
                <div className="flex gap-4 items-end">
                  <input
                    type="text"
                    placeholder="Status name (e.g., Testing, Review)"
                    value={newStatusName}
                    onChange={(e) => setNewStatusName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <input
                    type="color"
                    value={newStatusColor}
                    onChange={(e) => setNewStatusColor(e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    title="Status color"
                  />
                  <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-500 transition">
                    <input
                      type="checkbox"
                      checked={newStatusIsFinal}
                      onChange={(e) => setNewStatusIsFinal(e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer"
                      title="Mark as final/closing status"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Final</span>
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-2"
                  >
                    <FiPlus size={18} /> Add
                  </button>
                </div>
              </form>

              {projectStatuses.length > 0 ? (
                <div className="space-y-2">
                  {projectStatuses.map((status) => {
                    const usageCount = getStatusUsageCount(status.status_name);
                    const canDelete = !['ready', 'in_progress', 'done'].includes(status.status_name) && usageCount === 0;
                    
                    return (
                      <div
                        key={status.id}
                        className="p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: status.color }}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{status.status_name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500">{status.color}</p>
                              <div className="flex gap-3 mt-1">
                                {status.is_locked && (
                                  <p className="text-xs text-orange-600 dark:text-orange-400">🔒 Locked</p>
                                )}
                                {status.is_final && (
                                  <p className="text-xs text-green-600 dark:text-green-400">✓ Final</p>
                                )}
                                {usageCount > 0 && (
                                  <p className="text-xs text-yellow-600 dark:text-yellow-400">📊 Used in {usageCount} story/stories</p>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingStatus === status.id ? (
                              <input
                                type="color"
                                defaultValue={status.color}
                                onBlur={(e) => {
                                  if (e.target.value !== status.color) {
                                    handleUpdateStatus(status.id, { color: e.target.value });
                                  } else {
                                    setEditingStatus(null);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => setEditingStatus(status.id)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition"
                                title="Edit color"
                              >
                                <FiEdit2 size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteStatus(status.id)}
                              disabled={!canDelete}
                              className={clsx(
                                'p-2 rounded transition',
                                canDelete
                                  ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-gray-700 cursor-pointer'
                                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                              )}
                              title={canDelete ? 'Delete status' : (usageCount > 0 ? 'Cannot delete: status in use' : 'Cannot delete default status')}
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">No statuses configured</div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No project selected</div>
          )}
        </div>
      )}

      {/* Workflow Tab */}
      {activeTab === 'workflow' && (
        <div className="h-screen flex flex-col">
          {selectedProject ? (
            projectStatuses && projectStatuses.length > 0 ? (
              <WorkflowDesigner
                projectId={selectedProject}
                projects={projects}
                statuses={projectStatuses}
                onWorkflowUpdate={() => {
                  // Refresh statuses after workflow update
                  if (selectedProject) {
                    projectAPI.getStatuses(selectedProject).then(res => {
                      setProjectStatuses(res.data || []);
                    });
                  }
                }}
                setError={setError}
              />
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Loading workflow...
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              Select a project to configure workflow
            </div>
          )}
        </div>
      )}

      {/* Epics Tab */}
      {activeTab === 'epics' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Project Epics</h3>
            {selectedProject && (
              <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded">
                Project: {projects.find(p => p.id === selectedProject)?.name}
              </div>
            )}
          </div>

          {selectedProject ? (
            <>
              <form onSubmit={handleCreateEpic} className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Epic name (e.g., Authentication, Dashboard)"
                    value={newEpicName}
                    onChange={(e) => setNewEpicName(e.target.value)}
                    className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                  <input
                    type="color"
                    value={newEpicColor}
                    onChange={(e) => setNewEpicColor(e.target.value)}
                    className="w-full h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                </div>
                <textarea
                  placeholder="Description (optional)"
                  value={newEpicDesc}
                  onChange={(e) => setNewEpicDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  rows="2"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-2"
                >
                  <FiPlus size={18} /> Create Epic
                </button>
              </form>

              {projectEpics.length > 0 ? (
                <div className="space-y-2">
                  {projectEpics.map((epic) => {
                    const storyCount = userStories.filter(s => s.epic_id === epic.id).length;
                    const canDelete = storyCount === 0;

                    return (
                      <div
                        key={epic.id}
                        className="p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div
                              className="w-8 h-8 rounded border-2 border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: epic.color }}
                            />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{epic.name}</p>
                              {epic.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{epic.description}</p>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{epic.color}</p>
                              {storyCount > 0 && (
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">📊 Used in {storyCount} story/stories</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingEpic === epic.id ? (
                              <input
                                type="color"
                                defaultValue={epic.color}
                                onBlur={(e) => {
                                  if (e.target.value !== epic.color) {
                                    handleUpdateEpic(epic.id, { color: e.target.value });
                                  } else {
                                    setEditingEpic(null);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.target.blur();
                                  }
                                }}
                                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => setEditingEpic(epic.id)}
                                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-gray-700 rounded transition"
                                title="Edit color"
                              >
                                <FiEdit2 size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEpic(epic.id)}
                              disabled={!canDelete}
                              className={clsx(
                                'p-2 rounded transition',
                                canDelete
                                  ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-gray-700 cursor-pointer'
                                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                              )}
                              title={canDelete ? 'Delete epic' : 'Cannot delete: stories are assigned to this epic'}
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">No epics configured</div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No project selected</div>
          )}
        </div>
      )}

      {/* Sprint Settings Tab */}
      {activeTab === 'sprint-settings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sprint Planning</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Configure sprint forecasting and default duration. These settings apply when starting a new sprint.
              </p>
            </div>
            {selectedProject && (
              <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded">
                Project: {projects.find(p => p.id === selectedProject)?.name}
              </div>
            )}
          </div>

          {selectedProject ? (
            <form onSubmit={handleUpdateSprintSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Number of Forecasted Sprints */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Number of Forecasted Sprints
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={numForecastedSprints}
                    onChange={(e) => setNumForecastedSprints(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Total number of sprints planned for this project
                  </p>
                </div>

                {/* Default Sprint Duration */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Default Sprint Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={defaultSprintDurationDays}
                    onChange={(e) => setDefaultSprintDurationDays(Math.max(1, parseInt(e.target.value) || 14))}
                    className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Default duration in days. When a sprint starts, this duration automatically calculates the end date.
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>💡 How it works:</strong> When you start a sprint, if no end date is set, one will be automatically calculated by adding {defaultSprintDurationDays} days to the start date.
                </p>
              </div>

              {/* Save Button */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={sprintSettingsSaving}
                  className={`px-4 py-2 rounded font-medium transition ${
                    sprintSettingsSaving
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                >
                  {sprintSettingsSaving ? 'Saving...' : 'Save Sprint Settings'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No project selected</div>
          )}
        </div>
      )}

      {/* Import CSV Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Import User Stories from CSV</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Upload a CSV file to import user stories into your project. The system supports three CSV formats and will auto-detect the format based on headers. Supported formats: User Story (Epic, Story ID, User Story, Description, Business Value, Effort, Dependencies), Legacy (Story ID, User Story, Description, Business Value, Effort), or Simple (name, description, priority, story_points optional, epic_id optional).
              </p>
            </div>
            {selectedProject && (
              <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded whitespace-nowrap">
                Project: {projects.find(p => p.id === selectedProject)?.name}
              </div>
            )}
          </div>

          {selectedProject ? (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  importDropActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 hover:border-blue-400'
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-file-input"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <FiUpload size={32} className="text-blue-600 dark:text-blue-400" />
                    <p className="font-medium text-gray-900 dark:text-white">
                      {importFile ? importFile.name : 'Drag CSV file here or click to select'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {importFile ? `${(importFile.size / 1024).toFixed(2)} KB` : 'CSV format only'}
                    </p>
                  </div>
                </label>
              </div>

              {/* Import Button */}
              <div className="flex gap-2">
                <button
                  onClick={handleImportCSV}
                  disabled={importLoading || !importFile}
                  className={`px-4 py-2 rounded font-medium flex items-center gap-2 transition ${
                    importLoading || !importFile
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                >
                  {importLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border border-white border-t-transparent" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <FiUpload size={18} />
                      Import Stories
                    </>
                  )}
                </button>
                {importFile && (
                  <button
                    onClick={() => setImportFile(null)}
                    disabled={importLoading}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Sample CSV Guide */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-2">📋 Sample CSV Format:</p>
                <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-x-auto text-gray-900 dark:text-gray-300">
{`Epic,Story ID,User Story,Description,Business Value,Effort,Dependencies
Authentication,US1.1,"As a user I want to log in so I can access my account","Implement secure login form with email/password validation",8,5,
Dashboard,US2.1,"As a user I want to see my dashboard so I can view my progress","Create main dashboard with KPI cards and charts",13,8,US1.1
Profile,US3.1,"As a user I want to manage my profile so I can update my information","User profile settings page with avatar upload",5,3,US1.1,US2.1`}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No project selected</div>
          )}
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export to Jira</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Export your project data in Jira-compatible JSON format. All user stories, epics, sprints and relationships will be included.
              </p>
            </div>
            {selectedProject && (
              <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm rounded whitespace-nowrap">
                Project: {projects.find(p => p.id === selectedProject)?.name}
              </div>
            )}
          </div>

          {selectedProject ? (
            <div className="space-y-4">
              {/* Export Options */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600 space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDependencies}
                      onChange={(e) => setIncludeDependencies(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include story dependencies & links</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  When enabled, story dependencies are exported as Jira issue links.
                </p>
              </div>

              {/* Validation Status */}
              {exportValidation && (
                <div className={`p-4 rounded-lg border-2 ${
                  exportValidation.ready_for_export
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                    : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
                }`}>
                  <p className="font-medium mb-2 text-sm">
                    {exportValidation.ready_for_export ? '✓ Ready for export' : '⚠️ Validation warnings'}
                  </p>
                  <p className="text-xs mb-3">
                    {exportValidation.story_count} stories in project
                  </p>
                  {exportValidation.errors && exportValidation.errors.length > 0 && (
                    <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                      {exportValidation.errors.map((e, i) => <p key={i}>• {e}</p>)}
                    </div>
                  )}
                  {exportValidation.warnings && exportValidation.warnings.length > 0 && (
                    <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 mt-2">
                      {exportValidation.warnings.slice(0, 5).map((w, i) => <p key={i}>• {w}</p>)}
                      {exportValidation.warnings.length > 5 && (
                        <p>... and {exportValidation.warnings.length - 5} more warnings</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleValidateExport}
                  disabled={exportLoading}
                  className={`px-4 py-2 rounded font-medium transition ${
                    exportLoading
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white cursor-pointer'
                  }`}
                >
                  {exportLoading ? 'Validating...' : 'Validate Export'}
                </button>

                <button
                  onClick={() => handleExportProject('jira')}
                  disabled={exportLoading || (exportValidation && !exportValidation.ready_for_export)}
                  className={`px-4 py-2 rounded font-medium transition ${
                    exportLoading || (exportValidation && !exportValidation.ready_for_export)
                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                >
                  {exportLoading ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border border-white border-t-transparent mr-2" />
                      Exporting...
                    </>
                  ) : (
                    '📥 Export to Jira JSON'
                  )}
                </button>
              </div>

              {/* Export Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>📋 Export includes:</strong> Epics, User Stories (as Issues), Sprints, Story Points, Business Value (custom field), Assignments, Dates, and Story Dependencies.
                </p>
              </div>

              {/* Data Fields Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Field Mappings:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Story ID</span>
                    <p className="text-gray-600 dark:text-gray-400">→ Issue Key</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Title</span>
                    <p className="text-gray-600 dark:text-gray-400">→ Summary</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Effort</span>
                    <p className="text-gray-600 dark:text-gray-400">→ Story Points</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Business Value</span>
                    <p className="text-gray-600 dark:text-gray-400">→ Custom Field</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Status</span>
                    <p className="text-gray-600 dark:text-gray-400">→ Jira Status</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Epic</span>
                    <p className="text-gray-600 dark:text-gray-400">→ Epic Link</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">No project selected</div>
          )}
        </div>
      )}

      {/* Settings Tab - Configuration Management */}
      {activeTab === 'settings' && (
        <ConfigurationManagement />
      )}
    </div>
  );
};

export default ConfigurationView;
