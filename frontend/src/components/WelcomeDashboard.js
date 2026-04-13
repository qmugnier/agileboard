import React, { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import clsx from 'clsx';
import { FiCheckCircle, FiClock, FiAlertCircle, FiTrendingUp, FiZap } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

export const WelcomeDashboard = () => {
  const { user } = useAuth();
  const { userStories, teamMembers, projects, sprints } = useAppContext();
  const { isDark } = useTheme();

  // Get current user's team member by ID (user object has team_member_id)
  const currentTeamMember = user?.team_member_id ? teamMembers.find((tm) => tm.id === user.team_member_id) : null;

  // Get final status names across all projects
  const finalStatusNames = useMemo(() => {
    const finalStatuses = new Set();
    // Collect all final statuses from stories
    userStories.forEach(story => {
      // Check if story's status corresponds to a final status
      // We'll check based on common final status markers
      if (story.status === 'done') {
        finalStatuses.add(story.status);
      }
    });
    return Array.from(finalStatuses);
  }, [userStories]);

  // Filter stories assigned to current user - GLOBAL across all projects with active sprints
  const myStories = useMemo(() => {
    if (!currentTeamMember) return [];
    
    // Get projects that have active sprints
    const projectsWithActiveSprints = new Set();
    sprints.forEach(sprint => {
      if (sprint.status === 'active') {
        projectsWithActiveSprints.add(sprint.project_id);
      }
    });
    
    // Filter stories: assigned to me AND in a project with active sprint
    return userStories.filter((story) => {
      const isInProjectWithActiveSprint = projectsWithActiveSprints.has(story.project_id);
      const isAssignedToMe = story.assigned_to?.some((member) => member.id === currentTeamMember.id);
      return isAssignedToMe && isInProjectWithActiveSprint;
    });
  }, [userStories, sprints, currentTeamMember]);

  // Calculate project activity metrics - all projects user is assigned to
  const projectMetrics = useMemo(() => {
    if (!currentTeamMember) return [];
    
    const metrics = [];
    projects.forEach((project) => {
      const projectStories = userStories.filter((s) => 
        s.project_id === project.id && s.assigned_to?.some((m) => m.id === currentTeamMember.id)
      );
      
      if (projectStories.length > 0) {
        const total = projectStories.length;
        const completed = projectStories.filter((s) => s.status === 'done').length;
        const inProgress = projectStories.filter((s) => s.status === 'in_progress').length;
        const completionPercent = Math.round((completed / total) * 100);
        const activityLevel = (inProgress / total) * 100; // Higher if more in progress
        
        metrics.push({
          projectId: project.id,
          projectName: project.name,
          total,
          completed,
          inProgress,
          completionPercent,
          activityLevel: Math.min(100, activityLevel * 1.5), // Scale for better visualization
        });
      }
    });
    
    return metrics.sort((a, b) => b.activityLevel - a.activityLevel);
  }, [userStories, projects, currentTeamMember]);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      total: myStories.length,
      ongoing: myStories.filter((s) => s.status !== 'done' && !finalStatusNames.includes(s.status)).length,
      closed: myStories.filter((s) => finalStatusNames.includes(s.status) || s.status === 'done').length,
      newlyAssigned: myStories.filter((s) => {
        const createdDate = new Date(s.created_at || now);
        return createdDate > oneWeekAgo && !finalStatusNames.includes(s.status) && s.status !== 'done';
      }).length,
      inProgress: myStories.filter((s) => s.status !== 'done' && !finalStatusNames.includes(s.status)).length,
    };
  }, [myStories, finalStatusNames]);

  // Group stories by status
  const storiesByStatus = useMemo(() => {
    return {
      // Ready to Start: backlog or ready status
      ready: myStories.filter((s) => s.status === 'backlog' || s.status === 'ready'),
      // In Progress: not done and not final statuses
      in_progress: myStories.filter((s) => s.status !== 'done' && !finalStatusNames.includes(s.status)),
      // Completed: final status or done
      done: myStories.filter((s) => finalStatusNames.includes(s.status) || s.status === 'done'),
    };
  }, [myStories, finalStatusNames]);

  const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
    <div
      onClick={onClick}
      className={clsx(
        'p-4 rounded-lg border transition cursor-pointer',
        isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={clsx('text-sm font-medium', isDark ? 'text-slate-400' : 'text-gray-600')}>{label}</p>
          <p className={clsx('text-3xl font-bold mt-1', `text-${color}-600 dark:text-${color}-400`)}>{value}</p>
        </div>
        <Icon size={32} className={`text-${color}-600 dark:text-${color}-400 opacity-50`} />
      </div>
    </div>
  );

  const Speedometer = ({ project }) => {
    const getActivityStatus = (level) => {
      if (level < 33) return { status: 'Low', color: 'text-blue-600 dark:text-blue-400', barColor: 'bg-blue-600', bgColor: isDark ? 'bg-blue-900/20' : 'bg-blue-100' };
      if (level < 66) return { status: 'Medium', color: 'text-amber-600 dark:text-amber-400', barColor: 'bg-amber-500', bgColor: isDark ? 'bg-amber-900/20' : 'bg-amber-100' };
      return { status: 'High', color: 'text-red-600 dark:text-red-400', barColor: 'bg-red-500', bgColor: isDark ? 'bg-red-900/20' : 'bg-red-100' };
    };
    
    const activityStatus = getActivityStatus(project.activityLevel);
    
    return (
      <div className={clsx('p-5 rounded-lg border transition', isDark ? 'bg-slate-800 border-slate-700 hover:border-slate-600' : 'bg-white border-gray-200 hover:border-gray-300')}>
        <h4 className={clsx('font-semibold mb-4', isDark ? 'text-white' : 'text-gray-900')}>{project.projectName}</h4>
        
        {/* Activity Gauge */}
        <div className="mb-5">
          {/* Percentage Display */}
          <div className={clsx('p-4 rounded-lg mb-4 text-center', activityStatus.bgColor)}>
            <p className={clsx('text-4xl font-bold', activityStatus.color)}>
              {Math.round(project.activityLevel)}%
            </p>
            <p className={clsx('text-sm font-medium mt-1', isDark ? 'text-slate-300' : 'text-gray-700')}>
              {activityStatus.status} Activity
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className={clsx('w-full h-3 rounded-full overflow-hidden border', isDark ? 'bg-slate-700 border-slate-600' : 'bg-gray-200 border-gray-300')}>
            <div 
              className={clsx('h-full transition-all duration-300 ease-out', activityStatus.barColor)}
              style={{ width: `${project.activityLevel}%` }}
            />
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className={clsx('p-3 rounded-lg text-center', isDark ? 'bg-slate-700/50' : 'bg-gray-100')}>
            <p className={clsx('text-sm text-gray-600 dark:text-slate-400')}>Completed</p>
            <p className={clsx('text-xl font-bold mt-1', isDark ? 'text-white' : 'text-gray-900')}>{project.completed}</p>
          </div>
          <div className={clsx('p-3 rounded-lg text-center', isDark ? 'bg-slate-700/50' : 'bg-gray-100')}>
            <p className={clsx('text-sm text-gray-600 dark:text-slate-400')}>In Progress</p>
            <p className={clsx('text-xl font-bold mt-1', isDark ? 'text-white' : 'text-gray-900')}>{project.inProgress}</p>
          </div>
        </div>
      </div>
    );
  };

  const StoryItem = ({ story }) => (
    <div className={clsx('p-3 rounded-lg border transition', isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-gray-200 hover:bg-gray-50')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={clsx('font-medium truncate', isDark ? 'text-white' : 'text-gray-900')}>{story.title}</p>
          <p className={clsx('text-xs mt-1', isDark ? 'text-slate-400' : 'text-gray-500')}>{story.story_id}</p>
        </div>
        <span
          className={clsx(
            'px-2 py-1 rounded text-xs font-semibold whitespace-nowrap',
            story.status === 'done'
              ? isDark
                ? 'bg-green-900/30 text-green-300'
                : 'bg-green-100 text-green-800'
              : story.status === 'in_progress'
                ? isDark
                  ? 'bg-blue-900/30 text-blue-300'
                  : 'bg-blue-100 text-blue-800'
                : isDark
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-gray-200 text-gray-800'
          )}
        >
          {story.status}
        </span>
      </div>
      {story.effort && (
        <p className={clsx('text-xs mt-2', isDark ? 'text-slate-400' : 'text-gray-500')}>Effort: {story.effort} points</p>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className={clsx('text-3xl font-bold', isDark ? 'text-white' : 'text-gray-900')}>
          Welcome back, {user?.team_member?.name || user?.email || 'User'}! 👋
        </h1>
        <p className={clsx('mt-2', isDark ? 'text-slate-400' : 'text-gray-600')}>
          Global view of your work across all active sprints
        </p>
      </div>

      {/* Project Speedometers */}
      {projectMetrics.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FiZap className={isDark ? 'text-slate-300' : 'text-gray-700'} />
            <h2 className={clsx('text-xl font-semibold', isDark ? 'text-white' : 'text-gray-900')}>Project Activity</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {projectMetrics.map((project) => (
              <Speedometer key={project.projectId} project={project} />
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={FiCheckCircle} label="Total Assigned" value={stats.total} color="blue" />
        <StatCard icon={FiClock} label="Ongoing" value={stats.ongoing} color="amber" />
        <StatCard icon={FiTrendingUp} label="In Progress" value={stats.inProgress} color="purple" />
        <StatCard icon={FiAlertCircle} label="Newly Assigned" value={stats.newlyAssigned} color="rose" />
        <StatCard icon={FiCheckCircle} label="Completed" value={stats.closed} color="emerald" />
      </div>

      {/* Stories by Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ready Column */}
        <div className={clsx('p-4 rounded-lg border', isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200')}>
          <div className="mb-4">
            <h3 className={clsx('font-semibold text-lg', isDark ? 'text-white' : 'text-gray-900')}>Ready to Start</h3>
            <p className={clsx('text-sm', isDark ? 'text-slate-400' : 'text-gray-600')}>{storiesByStatus.ready.length} stories</p>
          </div>
          <div className="space-y-2">
            {storiesByStatus.ready.length > 0 ? (
              storiesByStatus.ready.map((story) => <StoryItem key={story.story_id} story={story} />)
            ) : (
              <p className={clsx('text-sm text-center py-4', isDark ? 'text-slate-400' : 'text-gray-500')}>No stories in this status</p>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div className={clsx('p-4 rounded-lg border', isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200')}>
          <div className="mb-4">
            <h3 className={clsx('font-semibold text-lg', isDark ? 'text-white' : 'text-gray-900')}>In Progress</h3>
            <p className={clsx('text-sm', isDark ? 'text-slate-400' : 'text-gray-600')}>{storiesByStatus.in_progress.length} stories</p>
          </div>
          <div className="space-y-2">
            {storiesByStatus.in_progress.length > 0 ? (
              storiesByStatus.in_progress.map((story) => <StoryItem key={story.story_id} story={story} />)
            ) : (
              <p className={clsx('text-sm text-center py-4', isDark ? 'text-slate-400' : 'text-gray-500')}>No stories in this status</p>
            )}
          </div>
        </div>

        {/* Done Column */}
        <div className={clsx('p-4 rounded-lg border', isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-200')}>
          <div className="mb-4">
            <h3 className={clsx('font-semibold text-lg', isDark ? 'text-white' : 'text-gray-900')}>Completed</h3>
            <p className={clsx('text-sm', isDark ? 'text-slate-400' : 'text-gray-600')}>{storiesByStatus.done.length} stories</p>
          </div>
          <div className="space-y-2">
            {storiesByStatus.done.length > 0 ? (
              storiesByStatus.done.map((story) => <StoryItem key={story.story_id} story={story} />)
            ) : (
              <p className={clsx('text-sm text-center py-4', isDark ? 'text-slate-400' : 'text-gray-500')}>No completed stories yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {myStories.length === 0 && (
        <div className={clsx('text-center py-12 rounded-lg border-2 border-dashed', isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-300 bg-gray-50')}>
          <p className={clsx('text-lg font-medium', isDark ? 'text-slate-300' : 'text-gray-700')}>No stories assigned to you yet</p>
          <p className={clsx('mt-1', isDark ? 'text-slate-400' : 'text-gray-600')}>Check back soon or ask your team lead for assignments</p>
        </div>
      )}
    </div>
  );
};
