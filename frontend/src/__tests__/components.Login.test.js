import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Login from '../components/Login';
import { AuthProvider } from '../context/AuthContext';

// Mock useNavigate before importing components that use it
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});


/**
 * Test suite for Login component
 */
describe('Login Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('renders login form', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    );
    
    // Check that the component rendered
    expect(screen.queryByText('Agile Board') || screen.queryByText('Sign in')).toBeInTheDocument();
  });
});
