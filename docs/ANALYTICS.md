# Analytics & Graphs Timeline Filtering Guide

## Overview

All analytics and graphs in the Agile Board follow a consistent timeframe logic to ensure meaningful data presentation:

- **If an active sprint exists** → Display data for the current active sprint
- **If no active sprint** → Fall back to the last closed sprint  
- **Alternative view** → Show entire project data (all sprints from beginning to today)

This ensures users always see the most relevant data without excessive historical context.

## Backend API Endpoints

### 1. Velocity Metrics

**Endpoint:** `GET /api/stats/velocity`

**Required Parameters:**
- `project_id` (integer) - Project ID

**Optional Query Parameters:**
- `timeframe` (string, default: `'auto'`)
  - `'auto'` - Active sprint if exists, else last closed sprint, else project data
  - `'active'` - Only active sprint (error 404 if none exists)
  - `'last_closed'` - Only last closed sprint (error 404 if none exists)
  - `'project'` - All sprints (entire project history)

**Response Example:**
```json
{
  "sprints": [
    {
      "sprint_id": 1,
      "sprint_name": "Sprint 1",
      "total_effort": 50,
      "completed_effort": 25,
      "in_progress_effort": 20,
      "backlog_effort": 5,
      "velocity": 25,
      "completion_percent": 50
    }
  ],
  "average_velocity": 25,
  "trend": "up",
  "timeframe": {
    "type": "active",
    "sprint_id": 1,
    "sprint_name": "Sprint 1",
    "status": "active",
    "start_date": "2026-04-13T10:00:00",
    "end_date": "2026-04-27T10:00:00"
  }
}
```

### 2. Sprint Statistics

**Endpoint:** `GET /api/stats/active-sprint`

**Required Parameters:**
- `project_id` (integer) - Project ID

**Optional Query Parameters:**
- `timeframe` (string, default: `'auto'`)
  - `'auto'` - Active sprint if exists, else last closed sprint (error if neither exists)
  - `'active'` - Only active sprint (error 404 if none exists)
  - `'last_closed'` - Only last closed sprint (error 404 if none exists)

**Response Example:**
```json
{
  "timeframe": {
    "type": "active",
    "sprint_id": 1,
    "sprint_name": "Sprint 1",
    "status": "active",
    "start_date": "2026-04-13T10:00:00",
    "end_date": "2026-04-27T10:00:00"
  },
  "sprint_id": 1,
  "sprint_name": "Sprint 1",
  "goal": "Implement user authentication",
  "total_stories": 15,
  "status_breakdown": {
    "backlog": 2,
    "ready": 3,
    "in_progress": 5,
    "done": 5
  },
  "effort_breakdown": {
    "total": 50,
    "completed": 25,
    "in_progress": 20,
    "remaining": 5
  }
}
```

## Frontend API Client

### Using statsAPI

The `statsAPI` service in `frontend/src/services/api.js` provides convenient methods:

```javascript
import { statsAPI } from '../services/api';

// Get velocity with auto timeframe (default)
const velocityData = await statsAPI.getVelocity(projectId);

// Get velocity for specific timeframe
const activeSprintVelocity = await statsAPI.getVelocity(projectId, 'active');
const closedSprintVelocity = await statsAPI.getVelocity(projectId, 'last_closed');
const projectVelocity = await statsAPI.getVelocity(projectId, 'project');

// Get sprint statistics (default: auto timeframe)
const sprintStats = await statsAPI.getActiveSprint(projectId);

// Get specific timeframe stats
const activeStats = await statsAPI.getActiveSprint(projectId, 'active');
```

## Implementation in React Components

### Pattern 1: Auto Timeframe (Recommended)

For most dashboards and graphs, use the `'auto'` timeframe to automatically show the most relevant data:

```javascript
import React, { useEffect, useState } from 'react';
import { statsAPI } from '../services/api';

export const VelocityChart = ({ projectId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Uses 'auto' timeframe by default
        const response = await statsAPI.getVelocity(projectId);
        setData(response.data);
        
        // Display timeframe info
        console.log('Showing data for:', response.data.timeframe.type);
        console.log('Sprint:', response.data.timeframe.sprint_name);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h3>{data.timeframe.sprint_name}</h3>
      <p>Average Velocity: {data.average_velocity}</p>
      <p>Trend: {data.trend}</p>
      {/* Render chart with data.sprints */}
    </div>
  );
};
```

### Pattern 2: Timeframe Selector

For advanced dashboards, provide a UI control to switch between timeframes:

```javascript
import React, { useState, useEffect } from 'react';
import { statsAPI } from '../services/api';

export const AnalyticsDashboard = ({ projectId }) => {
  const [timeframe, setTimeframe] = useState('auto');
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await statsAPI.getVelocity(projectId, timeframe);
        setData(response.data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      }
    };

    fetchData();
  }, [projectId, timeframe]);

  return (
    <div>
      {/* Timeframe Selector */}
      <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
        <option value="auto">Auto (Active Sprint / Last Closed)</option>
        <option value="active">Current Active Sprint Only</option>
        <option value="last_closed">Last Closed Sprint</option>
        <option value="project">Entire Project</option>
      </select>

      {/* Display current timeframe */}
      {data && (
        <div>
          <p>Timeframe: {data.timeframe.type}</p>
          {data.timeframe.sprint_name && (
            <p>Sprint: {data.timeframe.sprint_name} ({data.timeframe.status})</p>
          )}
          {data.timeframe.sprint_count > 1 && (
            <p>Sprints Shown: {data.timeframe.sprint_count}</p>
          )}
        </div>
      )}

      {/* Render analytics charts here */}
    </div>
  );
};
```

### Pattern 3: Error Handling

When requesting specific timeframes that might not exist:

```javascript
export const ActiveSprintChart = ({ projectId }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Request only active sprint (will error if none)
        const response = await statsAPI.getActiveSprint(projectId, 'active');
        setData(response.data);
      } catch (err) {
        // Handle 404 gracefully
        if (err.response?.status === 404) {
          setError('No active sprint found. Please start a sprint first.');
        } else {
          setError('Failed to fetch sprint data');
        }
      }
    };

    fetchData();
  }, [projectId]);

  if (error) {
    return <div className="alert alert-warning">{error}</div>;
  }

  return data ? <SprintStats data={data} /> : <LoadingSpinner />;
};
```

## Timeframe Logic Reference

### Timeline Selection Flowchart

```
User requests analytics
    ↓
Is timeframe='auto'? (default)
    ├─ YES → Is there an active sprint?
    │          ├─ YES → Show active sprint data
    │          └─ NO → Is there a last closed sprint?
    │                   ├─ YES → Show last closed sprint data
    │                   └─ NO → Show all project data
    │
    ├─ 'active' → Show active sprint only (404 if none)
    │
    ├─ 'last_closed' → Show last closed sprint only (404 if none)
    │
    └─ 'project' → Show all sprints (entire history)
```

### Response Timeframe Field

Every analytics response includes a `timeframe` object that indicates which data is being shown:

```javascript
// For specific sprint
timeframe: {
  type: "active|last_closed",
  sprint_id: 1,
  sprint_name: "Sprint 1",
  status: "active|closed",
  start_date: "ISO datetime",
  end_date: "ISO datetime"
}

// For project-wide data
timeframe: {
  type: "project",
  description: "All sprints in project",
  sprint_count: 5
}
```

## Best Practices

1. **Always use 'auto' timeframe by default** - Let the system intelligently pick the best data
2. **Display timeframe info to users** - Show which sprint/timeframe is being displayed
3. **Provide fallback UI** - If no active sprint and no closed sprint, prompt user to start a sprint
4. **Handle 404 errors gracefully** - When requesting specific timeframes that don't exist
5. **Cache timeframe responses** - Use React Query or SWR to avoid unnecessary API calls
6. **Update on sprint changes** - Re-fetch analytics when sprint status changes

## Migration Guide

### Before (Old API)
```javascript
// Old: Always showed all sprints
const data = await statsAPI.getVelocity(projectId);
```

### After (New API)
```javascript
// New: Smart auto-selection by default
const data = await statsAPI.getVelocity(projectId);  // Same call!

// Or explicitly specify timeframe
const data = await statsAPI.getVelocity(projectId, 'active');
```

The API is backwards compatible - existing code without the timeframe parameter will default to `'auto'`.

## Testing

### Test Cases for Analytics

1. **Auto timeframe with active sprint** - Should show active sprint data
2. **Auto timeframe with no active, but closed sprint** - Should show last closed sprint
3. **Auto timeframe with no sprints** - Should show project-wide data
4. **Active timeframe with no active sprint** - Should return 404
5. **Project timeframe** - Should always show all sprints
6. **Timeframe info included in response** - Verify correct timeframe metadata

## Future Enhancements

- [ ] Add burndown chart endpoint with same timeframe logic
- [ ] Add cumulative flow diagram with timeframe support
- [ ] Add cycle time analytics with timeframe filtering
- [ ] Add forecasting based on project vs. active sprint historical data
- [ ] Export analytics data with timeframe specification
