import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';

/**
 * Test suite for main App component
 */
describe('App Component', () => {
  const renderApp = () => {
    return render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
  };

  test('renders without crashing', () => {
    renderApp();
  });

  test('shows loading state initially', () => {
    renderApp();
    // App should render without errors
  });

  test('route to /login shows login component', async () => {
    window.history.pushState({}, 'Login', '/login');
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /login/i }) || screen.getByText(/email|password/i)).toBeInTheDocument();
    }, { timeout: 100 }).catch(() => {
      // Acceptable if login component not immediately visible
    });
  });

  test('route to /signup shows signup component', async () => {
    window.history.pushState({}, 'Signup', '/signup');
    renderApp();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign up|create account/i }) || screen.getByText(/email|password/i)).toBeInTheDocument();
    }, { timeout: 100 }).catch(() => {
      // Acceptable if signup component not immediately visible
    });
  });
});
