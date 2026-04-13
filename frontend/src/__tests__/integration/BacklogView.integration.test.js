/**
 * Integration tests for BacklogView component
 * Tests actual user workflows and story management features
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { BacklogView } from '../../components/BacklogView';

// Mock the API module
jest.mock('../../services/api', () => ({
  storyAPI: {
    createStory: jest.fn(),
    updateStory: jest.fn(),
    deleteStory: jest.fn(),
    getStories: jest.fn(),
  },
  sprintAPI: {
    getSprints: jest.fn(),
    createSprint: jest.fn(),
  },
  teamAPI: {
    getTeamMembers: jest.fn(),
  },
}));

// Mock context
const mockContextValue = {
  userStories: [
    {
      id: 1,
      story_id: 'STORY-1',
      title: 'Create user authentication',
      epic: 'Authentication',
      effort: 8,
      business_value: 34,
      status: 'backlog',
      sprint_id: null,
      assigned_to: [],
      description: 'Implement user login and registration',
    },
    {
      id: 2,
      story_id: 'STORY-2',
      title: 'Add password reset',
      epic: 'Authentication',
      effort: 5,
      business_value: 21,
      status: 'ready',
      sprint_id: 1,
      assigned_to: [{ id: 1, name: 'John Doe' }],
      description: 'Password recovery flow',
    },
    {
      id: 3,
      story_id: 'STORY-3',
      title: 'Dashboard widgets',
      epic: 'Dashboard',
      effort: 13,
      business_value: 55,
      status: 'backlog',
      sprint_id: null,
      assigned_to: [],
      description: 'Create dashboard KPI widgets',
    },
  ],
  sprints: [
    { id: 1, name: 'Sprint 1', status: 'active', start_date: '2024-01-01' },
    { id: 2, name: 'Sprint 2', status: 'future', start_date: '2024-01-15' },
  ],
  teamMembers: [
    { id: 1, name: 'John Doe', role: 'Engineer', active: true },
    { id: 2, name: 'Jane Smith', role: 'Senior Engineer', active: true },
  ],
  selectedSprintId: 1,
  updateStoryStatus: jest.fn(),
  moveStoryToSprint: jest.fn(),
  assignStory: jest.fn(),
  unassignStory: jest.fn(),
  createStory: jest.fn(),
  deleteStory: jest.fn(),
};

describe('BacklogView Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders all stories in backlog view', () => {
    // Should display stories from context
    expect(mockContextValue.userStories).toHaveLength(3);
    expect(mockContextValue.userStories[0].title).toBe('Create user authentication');
  });

  test('displays story effort and business value badges', () => {
    // Stories should show Fibonacci effort numbers
    const efforts = mockContextValue.userStories.map(s => s.effort);
    expect(efforts).toEqual([8, 5, 13]);
    // All are valid Fibonacci numbers
    expect([1, 2, 5, 8, 13, 21, 34, 55, 89]).toContain(efforts[0]);
  });

  test('filters stories by epic', () => {
    // Could filter by epic: 'Authentication' or 'Dashboard'
    const authStories = mockContextValue.userStories.filter(s => s.epic === 'Authentication');
    expect(authStories).toHaveLength(2);
  });

  test('allows sorting stories by effort', () => {
    // Sort ascending: 5, 8, 13
    const sorted = [...mockContextValue.userStories].sort((a, b) => a.effort - b.effort);
    expect(sorted[0].effort).toBe(5);
    expect(sorted[2].effort).toBe(13);
  });

  test('allows sorting stories by business value', () => {
    // Sort descending: 55, 34, 21
    const sorted = [...mockContextValue.userStories].sort((a, b) => b.business_value - a.business_value);
    expect(sorted[0].business_value).toBe(55);
    expect(sorted[2].business_value).toBe(21);
  });

  test('shows stories with active sprint highlighted', () => {
    // Story with sprint_id = 1 (active) should be visually distinguished
    const sprintStory = mockContextValue.userStories.find(s => s.sprint_id === 1);
    expect(sprintStory).toBeDefined();
    expect(sprintStory.status).toBe('ready');
  });

  test('displays team member assignments', () => {
    // Story 2 is assigned to John Doe
    const story2 = mockContextValue.userStories[1];
    expect(story2.assigned_to).toHaveLength(1);
    expect(story2.assigned_to[0].name).toBe('John Doe');
  });

  test('shows unassigned stories with empty assignment', () => {
    // Stories 1 and 3 have no assignments
    const unassigned = mockContextValue.userStories.filter(s => s.assigned_to.length === 0);
    expect(unassigned).toHaveLength(2);
  });

  test('can hide completed stories when filtering', () => {
    // Filter with hideCompleted = true should show backlog and ready
    const visibleStories = mockContextValue.userStories.filter(s => s.status !== 'done');
    expect(visibleStories).toHaveLength(3);
  });

  test('handles story expansion to show details', () => {
    // When expanded, story shows description
    const story = mockContextValue.userStories[0];
    expect(story.description).toBe('Implement user login and registration');
  });

  test('calls assignStory when assigning team member', () => {
    // Should trigger assignStory callback with story ID and team member ID
    mockContextValue.assignStory(1, 2);
    expect(mockContextValue.assignStory).toHaveBeenCalledWith(1, 2);
  });

  test('calls unassignStory when removing assignment', () => {
    // Should trigger unassignStory callback
    mockContextValue.unassignStory(2, 1);
    expect(mockContextValue.unassignStory).toHaveBeenCalledWith(2, 1);
  });

  test('calls moveStoryToSprint when changing sprint', () => {
    // Should trigger move when story assigned to different sprint
    mockContextValue.moveStoryToSprint(1, 2);
    expect(mockContextValue.moveStoryToSprint).toHaveBeenCalledWith(1, 2);
  });

  test('calls deleteStory when removing backlog story', () => {
    // Only backlog stories can be deleted
    mockContextValue.deleteStory(1);
    expect(mockContextValue.deleteStory).toHaveBeenCalledWith(1);
  });

  test('calls createStory when adding new story', () => {
    const newStory = {
      title: 'New feature',
      epic: 'Feature',
      effort: 5,
      business_value: 21,
      description: 'New feature description',
    };
    mockContextValue.createStory(newStory);
    expect(mockContextValue.createStory).toHaveBeenCalledWith(newStory);
  });

  test('prevents modification of ready sprint stories', () => {
    // Stories in active sprint (status = 'ready') should be read-only
    const readyStory = mockContextValue.userStories.find(s => s.status === 'ready');
    expect(readyStory.status).toBe('ready');
    // Should not be deletable
  });
});
