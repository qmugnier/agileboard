import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAppContext } from '../context/AppContext';
import { TimeframeSelector, TimeframeInfo } from './TimeframeSelector';
import { statsAPI } from '../services/api';
import clsx from 'clsx';

const StatCard = ({ label, value, unit = '', trend, color = 'blue' }) => {
  const colors = {
    blue: 'from-blue-600 to-blue-400',
    green: 'from-green-600 to-green-400',
    purple: 'from-purple-600 to-purple-400',
    orange: 'from-orange-600 to-orange-400',
    cyan: 'from-cyan-600 to-cyan-400',
  };

  return (
    <div className={clsx('bg-gradient-to-br', colors[color], 'text-white rounded-lg p-6 shadow-lg')}>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
      {unit && <p className="text-xs opacity-75 mt-1">{unit}</p>}
      {trend && (
        <p className={clsx('text-xs font-semibold mt-2', trend === 'up' ? 'text-green-200' : 'text-red-200')}>
          {trend === 'up' ? 'Trending Up' : 'Trending Down'}
        </p>
      )}
    </div>
  );
};

export const Dashboard = () => {
  const { velocityMetrics, projectWideMetrics, analyticsTimeframe, setAnalyticsTimeframe, error, userStories = [] } = useAppContext();
  const [sprintDetails, setSprintDetails] = useState(null);
  const [dailyBreakdown, setDailyBreakdown] = useState(null);

  // Fetch sprint details - NOT filtered by selected project
  // This shows global metrics across all projects
  useEffect(() => {
    if (analyticsTimeframe === 'project') {
      setSprintDetails(null);
      setDailyBreakdown(null);
      return;
    }

    const fetchSprintDetails = async () => {
      try {
        // Fetch active sprint data (globally, across all projects)
        const response = await statsAPI.getActiveSprint(null, analyticsTimeframe);
        setSprintDetails(response.data);
        
        // Fetch daily breakdown for this specific sprint
        if (response.data?.sprint_id) {
          try {
            const dailyRes = await statsAPI.getSprintDailyBreakdown(response.data.sprint_id);
            setDailyBreakdown(dailyRes.data);
          } catch (err) {
            console.warn(`Failed to fetch daily breakdown for sprint ${response.data.sprint_id}:`, err.message);
            setDailyBreakdown(null);
          }
        }
      } catch (err) {
        // Silent fail - charts will show "no data" message
        console.warn('Failed to fetch sprint details:', err.message);
        setSprintDetails(null);
        setDailyBreakdown(null);
      }
    };

    fetchSprintDetails();
  }, [analyticsTimeframe]);

  // Check if we have any data at all
  const hasData = velocityMetrics && velocityMetrics.sprints && velocityMetrics.sprints.length > 0;

  // Determine if we should show day-based or sprint-based charts
  const isSprintView = analyticsTimeframe !== 'project' && sprintDetails;
  const isProjectView = analyticsTimeframe === 'project' || velocityMetrics?.timeframe?.type === 'project';

  // Day-based chart data (when viewing a specific sprint)
  const dayChartData = dailyBreakdown ? dailyBreakdown.days.map(d => ({
    name: d.day,
    velocity: d.completed_effort,
    completed: d.completed_effort,
    inProgress: d.in_progress_effort,
    remaining: d.remaining_effort,
    total: d.completed_effort + d.in_progress_effort + d.remaining_effort,
    completion: d.remaining_effort === 0 && d.in_progress_effort === 0 ? 100 : 
                Math.round((d.completed_effort / Math.max(1, d.completed_effort + d.in_progress_effort + d.remaining_effort)) * 100) || 0,
  })) : [];

  // Sprint-based chart data (when viewing project)
  const sprintChartData = hasData ? velocityMetrics.sprints.map(s => ({
    name: s.sprint_name,
    velocity: s.velocity,
    completed: s.completed_effort,
    total: s.total_effort,
    completion: s.completion_percent,
  })) : [];

  const currentSprintData = isSprintView ? (dayChartData.length > 0 ? dayChartData[dayChartData.length - 1] : null) : (sprintChartData.length > 0 ? sprintChartData[sprintChartData.length - 1] : null);

  // Calculate current sprint completion
  const currentSprintCompletion = sprintDetails && sprintDetails.effort_breakdown ? (() => {
    const total = sprintDetails.effort_breakdown.total;
    if (total === 0) return 0;
    return Math.round((sprintDetails.effort_breakdown.completed / total) * 100);
  })() : (currentSprintData?.completion || 0);

  // Effort breakdown (uses timeframe-aware sprint details)
  const effortData = sprintDetails && sprintDetails.effort_breakdown ? [
    { name: 'Completed', value: sprintDetails.effort_breakdown.completed || 0, fill: '#10b981' },
    { name: 'In Progress', value: sprintDetails.effort_breakdown.in_progress || 0, fill: '#f59e0b' },
    { name: 'Remaining', value: sprintDetails.effort_breakdown.remaining || 0, fill: '#ef4444' },
  ] : [];

  // Story count breakdown (uses timeframe-aware sprint details)
  const storyCountData = sprintDetails && sprintDetails.status_breakdown ? [
    { name: 'Backlog', value: sprintDetails.status_breakdown.backlog || 0, fill: '#6b7280' },
    { name: 'Ready', value: sprintDetails.status_breakdown.ready || 0, fill: '#0ea5e9' },
    { name: 'In Progress', value: sprintDetails.status_breakdown.in_progress || 0, fill: '#f59e0b' },
    { name: 'Done', value: sprintDetails.status_breakdown.done || 0, fill: '#10b981' },
  ] : [];

  // For project view, aggregate story status from all project stories
  const projectStoryStatusData = isProjectView && userStories.length > 0 ? (() => {
    const backlog = userStories.filter(s => s.status === 'backlog').length;
    const ready = userStories.filter(s => s.status === 'ready').length;
    const inProgress = userStories.filter(s => s.status === 'in_progress').length;
    const done = userStories.filter(s => s.status === 'done').length;
    return [
      { name: 'Backlog', value: backlog, fill: '#6b7280' },
      { name: 'Ready', value: ready, fill: '#0ea5e9' },
      { name: 'In Progress', value: inProgress, fill: '#f59e0b' },
      { name: 'Done', value: done, fill: '#10b981' },
    ].filter(d => d.value > 0);
  })() : [];

  // For project view, show aggregated effort data
  const projectEffortData = isProjectView && hasData ? (() => {
    const completed = velocityMetrics.sprints.reduce((sum, s) => sum + s.completed_effort, 0);
    const inProgress = velocityMetrics.sprints.reduce((sum, s) => sum + (s.in_progress_effort || 0), 0);
    const remaining = velocityMetrics.sprints.reduce((sum, s) => sum + (s.backlog_effort || 0), 0);
    return [
      { name: 'Completed', value: completed, fill: '#10b981' },
      { name: 'In Progress', value: inProgress, fill: '#f59e0b' },
      { name: 'Remaining', value: remaining, fill: '#ef4444' },
    ].filter(d => d.value > 0);
  })() : [];

  // Show empty state if no data
  if (!hasData && !sprintDetails && !isProjectView) {
    return (
      <div className="space-y-6 dark:bg-gray-900 p-4 rounded-lg">
        {/* Timeframe Selector - Always visible */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Analytics Timeframe</h3>
            <TimeframeSelector
              value={analyticsTimeframe}
              onChange={setAnalyticsTimeframe}
              className="min-w-[200px]"
            />
          </div>
          <TimeframeInfo timeframe={velocityMetrics?.timeframe} compact={true} />
        </div>

        {/* Error from failed timeframe request */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-300 text-sm">
              <strong>Unable to load data:</strong> {error}
            </p>
            <p className="text-red-600 dark:text-red-400 text-xs mt-2">
              Try selecting a different timeframe or create sprints with data.
            </p>
          </div>
        )}

        {/* No data message */}
        {!error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-2">No project data available yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Create sprints and stories to see metrics</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 dark:bg-gray-900 p-4 rounded-lg">
      {/* Timeframe Selector */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Analytics Timeframe</h3>
          <TimeframeSelector
            value={analyticsTimeframe}
            onChange={setAnalyticsTimeframe}
            className="min-w-[200px]"
          />
        </div>
        <TimeframeInfo timeframe={velocityMetrics?.timeframe} compact={true} />
      </div>

      {/* Error message if data load failed */}
      {error && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-amber-700 dark:text-amber-300 text-sm">
            <strong>Note:</strong> {error} - Try selecting a different timeframe.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Average Velocity"
          value={Math.round(projectWideMetrics?.average_velocity || 0)}
          unit="story points"
          color="blue"
          trend={projectWideMetrics?.trend}
        />
        <StatCard
          label="Current Sprint"
          value={currentSprintCompletion}
          unit="% Complete"
          color="green"
        />
        <StatCard
          label="Total Sprints"
          value={projectWideMetrics?.sprints?.length || 0}
          unit="sprints"
          color="purple"
        />
        <StatCard
          label="Completed Tasks"
          value={projectWideMetrics?.sprints?.reduce((sum, s) => sum + (s.completed_stories || 0), 0) || 0}
          unit="stories"
          color="cyan"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Velocity Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6 border dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
            {isSprintView ? 'Daily Effort' : 'Velocity Trend'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={isSprintView ? dayChartData : sprintChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px' }}
                labelStyle={{ color: '#1f2937' }}
              />
              <Legend />
              {isSprintView ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Completed Effort"
                  />
                  <Line
                    type="monotone"
                    dataKey="remaining"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 3 }}
                    activeDot={{ r: 5 }}
                    name="Remaining Effort"
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="velocity"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={{ fill: '#0ea5e9', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Completed Points"
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Total Points"
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sprint Completion / Daily Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6 border dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
            {isSprintView ? 'Daily Sprint Progress' : 'Sprint Progress'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={isSprintView ? dayChartData : sprintChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px' }}
                labelStyle={{ color: '#1f2937' }}
              />
              <Legend />
              {isSprintView ? (
                <>
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                  <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="In Progress" />
                  <Bar dataKey="remaining" stackId="a" fill="#ef4444" name="Remaining" />
                </>
              ) : (
                <>
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                  <Bar dataKey="total" stackId="a" fill="#d1d5db" name="Total" />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Effort Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6 border dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Effort Distribution</h3>
          {effortData.length > 0 || projectEffortData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={effortData.length > 0 ? effortData : projectEffortData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {(effortData.length > 0 ? effortData : projectEffortData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No sprint data available for this timeframe. {analyticsTimeframe !== 'project' ? 'Select a different timeframe or ' : ''}Start a sprint to see effort distribution.</p>
            </div>
          )}
        </div>

        {/* Story Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6 border dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Story Status</h3>
          {(storyCountData.length > 0 || projectStoryStatusData.length > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={isProjectView ? projectStoryStatusData : storyCountData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {(isProjectView ? projectStoryStatusData : storyCountData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>No story data available{isProjectView ? '' : ' for this timeframe'}. {analyticsTimeframe !== 'project' ? 'Select a different timeframe or ' : ''}Create or move stories to see status breakdown.</p>
            </div>
          )}
        </div>
      </div>

      {/* Burndown Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-lg p-6 border dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
          {isProjectView ? 'Product Burndown (All Sprints)' : 'Sprint Burndown (Daily)'}
        </h3>
        {isProjectView && hasData ? (() => {
          // Product Burndown Chart: shows total remaining product backlog over sprints
          const totalOriginalBacklog = velocityMetrics.sprints.reduce((sum, s) => sum + s.total_effort, 0);
          let cumulativeCompleted = 0;
          
          const productBurndownData = velocityMetrics.sprints.map(s => {
            cumulativeCompleted += s.completed_effort;
            return {
              name: s.sprint_name,
              remaining: Math.max(0, totalOriginalBacklog - cumulativeCompleted),
              completed: cumulativeCompleted,
              total: totalOriginalBacklog,
            };
          });
          
          if (productBurndownData.length === 0) {
            return (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <p>No sprints in project yet.</p>
              </div>
            );
          }
          
          return (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={productBurndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" label={{ value: 'Remaining Product Backlog (pts)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  labelStyle={{ color: '#1f2937' }}
                  formatter={(value, name) => {
                    if (name === 'remaining') return `${value} pts remaining`;
                    if (name === 'total') return `${value} pts total backlog`;
                    return value;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="remaining"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Product Backlog Remaining"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Original Backlog"
                />
              </LineChart>
            </ResponsiveContainer>
          );
        })() : (sprintDetails && sprintDetails.effort_breakdown ? (() => {
          const totalEffort = sprintDetails.effort_breakdown.total;
          
          if (totalEffort === 0) {
            return (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <p>No stories in this sprint yet.</p>
              </div>
            );
          }
          
          // Sprint Burndown Chart: shows remaining work by day within the sprint
          // Use backend's daily breakdown which correctly handles active sprint filtering
          
          // Calculate total sprint duration for ideal burndown line
          const startDate = new Date(sprintDetails.timeframe.start_date);
          const endDate = new Date(sprintDetails.timeframe.end_date);
          let totalSprintDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
          totalSprintDays = Math.max(1, totalSprintDays);
          
          // Build chart data from backend's daily breakdown
          const sprintBurndownData = dailyBreakdown && dailyBreakdown.days ? 
            dailyBreakdown.days.map((day, dayIndex) => {
              // Ideal burndown: straight line from total to 0 over sprint duration
              const idealRemaining = Math.max(0, totalEffort - (totalEffort / totalSprintDays) * dayIndex);
              
              return {
                day: day.day,
                ideal: Math.round(idealRemaining * 10) / 10,
                actual: Math.round(day.remaining_effort * 10) / 10,
              };
            }) 
            : [];
          
          return (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sprintBurndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" label={{ value: 'Remaining Effort (pts)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px' }}
                  labelStyle={{ color: '#1f2937' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ideal"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Ideal Burndown"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ fill: '#0ea5e9', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Actual Progress"
                />
              </LineChart>
            </ResponsiveContainer>
          );
        })() : (
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>No data available{isProjectView ? '' : ' for this timeframe'}. {analyticsTimeframe !== 'project' ? 'Select a different timeframe or ' : ''}Start a sprint to see burndown data.</p>
          </div>
        ))}
      </div>
    </div>
  );
};
