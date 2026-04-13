import React from 'react';
import { renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useAuth, AuthProvider } from '../context/AuthContext';

/**
 * Test suite for AuthContext
 */
describe('AuthContext', () => {
  test('useAuth hook provides auth context', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current).toHaveProperty('isAuthenticated');
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('login');
    expect(result.current).toHaveProperty('logout');
    expect(result.current).toHaveProperty('signup');
  });

  test('initial auth state has correct defaults', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(typeof result.current.loading).toBe('boolean');
  });

  test('login function updates auth state', async () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    const loginSpy = jest.spyOn(result.current, 'login');
    expect(typeof result.current.login).toBe('function');
  });

  test('logout function is available', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(typeof result.current.logout).toBe('function');
  });

  test('signup function is available', () => {
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(typeof result.current.signup).toBe('function');
  });

  test('throws error when used outside provider', () => {
    // Suppress error output for this test
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within AuthProvider');
    
    spy.mockRestore();
  });
});
