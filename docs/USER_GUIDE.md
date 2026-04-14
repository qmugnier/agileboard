# User Guide

Learn how to use Agile Board for sprint planning and tracking.

## Overview

Agile Board provides four main workspaces:

1. **Kanban Board** - Manage story progress during active sprints
2. **Backlog** - Plan stories for upcoming sprints
3. **Analytics** - View sprint metrics and trends
4. **Configuration** - Manage projects, teams, and settings

## Kanban Board

The Kanban board displays the current active sprint with customizable status columns.

### Basic Operations

**Move a Story:** Drag a story card from one column to another to update its status.

**View Story Details:** Click a story card to see full details including:
- Description and acceptance criteria
- Assigned team members
- Dependencies (blocking/blocked by)
- Effort estimate and business value
- Created date

**Assign Team Members:** Click the card to expand, then click the assignee section to add/remove team members.

**Change Sprint:** Use the sprint selector at the top to switch between active and closed sprints.

### Sprint Status Indicators

- **Active Sprint** - Currently underway, team is actively working
- **Closed Sprint** - Completed, read-only view of final stories

## Backlog

The Backlog view manages stories outside of active sprints and allows you to plan future sprints.

### Organization

The backlog displays stories organized by:
- **Backlog** - Stories not yet assigned to any sprint
- **Active Sprint** - Stories in the currently running sprint (if one exists)
- **Other Sprints** - Stories in planned but not yet active sprints

### Common Tasks

**Create a New Story:**
1. Click "Create New Story" button
2. Enter story title and details
3. Set effort estimate and business value
4. Save

**Move Story to Sprint:**
1. Locate story in Backlog section
2. Use the sprint dropdown to select target sprint
3. Or drag the story to the target sprint section

**Move Story Back to Backlog:**
1. Select the story
2. Set sprint to "Backlog" via dropdown
3. Or drag to Backlog section

**Assign Story to Team Member:**
1. Click the story row to expand
2. Click assignee field to select team members
3. Multiple assignments are supported

**Update Story Status:**
- For backlog and non-active sprints: Only "Backlog" and "Ready" statuses allowed
- For active sprints: Full workflow transitions available if story is not blocked
- Click the status dropdown to change

**Delete a Story:**
1. Click the story to expand details
2. Click the delete icon (trash can)
3. Confirm deletion

### Story Properties

When creating or editing a story, set:

- **Title** - Short, descriptive name (required)
- **Description** - Detailed requirements and acceptance criteria
- **Epic** - Group related stories together
- **Effort** - Fibonacci sequence (1, 2, 3, 5, 8, 13, 21) representing complexity/time
- **Business Value** - 1-100 scale representing business importance
- **Sprint** - Which sprint the story belongs to
- **Status** - Current workflow state (Backlog, Ready, In Progress, Done, etc.)

### Dependencies

Track story relationships:
- **Blocks** - This story prevents other stories from starting
- **Blocked By** - This story cannot start until another is complete

If a story is blocking others, you cannot mark it as complete until dependencies are resolved.

## Analytics

View sprint metrics, velocity trends, and team performance.

### Dashboard Metrics

**Velocity Chart** - Shows effort completed per sprint over time. Use to forecast capacity for future sprints.

**Sprint Progress** - Pie chart showing story distribution by status in the current sprint.

**Effort Distribution** - Bar chart of effort by status (Backlog, Ready, In Progress, Done).

**Team Capacity** - View stories per team member and overall allocation.

**KPI Cards** - High-level metrics:
- Total stories in sprint
- Completion percentage
- Average story size
- Team members assigned

### Timeline Filtering

Analytics display follows this logic:

1. If an active sprint exists → show active sprint data
2. If no active sprint → show last closed sprint
3. Option to view all project data (full history)

## Configuration

Manage projects, teams, workflow, and system settings.

### Projects

**Create Project:**
1. Click "Create New Project"
2. Enter name and description
3. Optionally set as default
4. Save

**Edit Project:**
1. Select project from dropdown
2. Click edit button
3. Update settings
4. Save

**Delete Project:**
1. Click "Delete Project"
2. Confirm - this cannot be undone

**Close Project:**
1. Click "Close Project"
2. Active sprint will auto-close
3. Non-done stories move to backlog
4. Project becomes read-only

### Team Members

**Add Team Member:**
1. Go to Team Members tab
2. Click "Add Team Member"
3. Enter name and optional role
4. Assign to projects
5. Save

**Edit Team Member:**
1. Click edit icon next to member
2. Update information
3. Save

**Remove Team Member:**
1. Click delete icon next to member
2. Confirm - existing assignments are preserved

### Statuses and Workflow

**Create Custom Status:**
1. Go to Statuses tab
2. Click "Create New Status"
3. Enter name and select color
4. Mark as "Final Status" if this is a completion state
5. Save

**Define Transitions:**
1. Go to Workflow tab
2. Select from status and to status
3. Allow or deny transition
4. Save

**Default Workflow** includes:
- Backlog (starting point)
- Ready (prepared for work)
- In Progress (actively being worked)
- Done (completed/final)

Customize this to match your team's process.

### Sprints

**Create Sprint:**
1. Go to Sprint Settings
2. Click "Create New Sprint"
3. Enter name and duration
4. Save

**Configure Sprint Duration:**
1. In Sprint Settings, set "Default Sprint Duration"
2. This applies to new sprints by default
3. Can override per sprint

**Close/Activate Sprints:**
- Active sprint shows current work
- One sprint can be active at a time
- Closing a sprint moves incomplete stories to backlog
- Closed sprints become read-only

### Advanced Settings

**Import/Export:**
- Import stories from CSV file
- Export stories to CSV
- See [CSV_IMPORT_GUIDE.md](CSV_IMPORT_GUIDE.md) for details

**Toggle: Backlog to Active Sprint**
- When enabled: Allows moving stories directly from backlog to active sprint
- When disabled: Only non-active sprints can receive backlog stories
- Useful for teams that want to protect active sprint boundaries

## Common Workflows

### Typical Sprint Planning

1. In Configuration, verify team members are assigned to the project
2. Create next sprint with desired duration
3. Go to Backlog
4. Review and prioritize stories in Backlog section
5. Drag highest priority stories to the new sprint
6. Assign estimated effort and business value
7. Assign team members to stories
8. When ready, activate the sprint

### During Sprint Execution

1. Daily: Check Kanban Board for current progress
2. Use drag-and-drop to move stories as work progresses
3. Update story status to keep board current
4. Use Analytics to see if sprint is on pace
5. Manage blockers and dependencies as they arise

### Sprint Closure

1. When sprint period ends, go to Configuration
2. Click "Close Sprint"
3. Incomplete stories automatically move to backlog
4. View completed sprint in Analytics for historical data
5. Create next sprint and repeat planning

### Reporting

1. Go to Analytics
2. View velocity chart to see team performance trends
3. Select different timeframes to compare sprints
4. Export sprint data via Configuration > Export

## Tips and Best Practices

- **Keep Stories Small** - Aim for 1-week effort or less for better tracking
- **Set Business Value** - This helps prioritize when capacity is limited
- **Assign Early** - Assign team members during sprint planning, not during execution
- **Update Daily** - Keep story status current for accurate burndown
- **Review Dependencies** - Check for blocked stories before sprint starts
- **Use Epics** - Group related stories for better organization
- **Archive Old Sprints** - Close completed sprints to keep system responsive

## Troubleshooting

**Can't see active sprint on Kanban Board:**
- Check that a sprint has been activated in Configuration
- Verify sprint has at least one story assigned

**Can't move story to active sprint:**
- If toggle "Backlog to Active Sprint" is off, move to non-active sprint first
- Check that target sprint is not closed

**Dependencies not showing:**
- Ensure other stories exist with matching IDs
- Check story IDs are set correctly

**Velocity chart is empty:**
- Need at least one closed sprint with completed stories
- Check that analytics timeframe includes closed sprints

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more issues.
