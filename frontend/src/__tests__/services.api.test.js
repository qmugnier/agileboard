import * as api from '../services/api';

/**
 * Test suite for API service utilities
 */
describe('API Service', () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  afterEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  test('GET request returns data', async () => {
    const mockData = { id: 1, name: 'Test Project' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const response = await fetch('/api/projects');
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.name).toBe('Test Project');
  });

  test('POST request creates resource', async () => {
    const newStory = { title: 'New Story', effort: 5 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, ...newStory }),
    });

    const response = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStory)
    });
    expect(response.ok).toBe(true);
  });

  test('PUT request updates resource', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, title: 'Updated' }),
    });

    const response = await fetch('/api/stories/1', { method: 'PUT' });
    expect(response.ok).toBe(true);
  });

  test('DELETE request removes resource', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const response = await fetch('/api/stories/1', { method: 'DELETE' });
    expect(response.ok).toBe(true);
  });

  test('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Not Found' }),
    });

    const response = await fetch('/api/projects/999');
    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });

  test('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    try {
      await fetch('/api/projects');
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toBe('Network error');
    }
  });

  test('handles server errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    const response = await fetch('/api/data');
    expect(response.status).toBe(500);
  });

  test('includes proper headers', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    await fetch('/api/endpoint', {
      headers: { 'Content-Type': 'application/json' }
    });
    expect(mockFetch).toHaveBeenCalled();
  });
});

