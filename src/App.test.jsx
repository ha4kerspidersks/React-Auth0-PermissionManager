import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';
import App from './App';

const mockLoginWithRedirect = vi.fn();
const mockLogout = vi.fn();
const mockGetAccessTokenSilently = vi.fn();

let mockAuthState = {
  isLoading: false,
  error: null,
  isAuthenticated: false,
  user: null,
  loginWithRedirect: mockLoginWithRedirect,
  logout: mockLogout,
  getAccessTokenSilently: mockGetAccessTokenSilently,
};

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => mockAuthState,
  withAuthenticationRequired: (comp) => comp,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthState = {
    isLoading: false,
    error: null,
    isAuthenticated: false,
    user: null,
    loginWithRedirect: mockLoginWithRedirect,
    logout: mockLogout,
    getAccessTokenSilently: mockGetAccessTokenSilently,
  };
});

test('renders app root container in default unauthenticated state', () => {
  render(<App />);
  const appElement = document.getElementById('app');
  expect(appElement).toBeInTheDocument();
  expect(screen.getByText('Welcome to Spark')).toBeInTheDocument();
  expect(screen.getByText('Login')).toBeInTheDocument();
});

test('handles login button click and triggers loginWithRedirect', () => {
  render(<App />);
  const loginButton = screen.getByText('Login');
  fireEvent.click(loginButton);
  expect(mockLoginWithRedirect).toHaveBeenCalledTimes(1);
});

test('renders loading state when Auth0 isLoading is true', () => {
  mockAuthState.isLoading = true;
  render(<App />);
  expect(screen.getByText('Loading')).toBeInTheDocument();
});

test('renders error state when Auth0 error occurs', () => {
  mockAuthState.error = new Error('OAuth authorization failure');
  render(<App />);
  expect(screen.getByText('Oops... OAuth authorization failure')).toBeInTheDocument();
});

test('renders authenticated user profile, claims, and decoded permissions', async () => {
  // Construct a valid synthetic JWT payload with permissions
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      sub: 'auth0|123456789',
      name: 'Test Engineer',
      email: 'engineer@example.com',
      permissions: ['read:spark', 'update:spark'],
    })
  );
  const signature = 'syntheticSignature';
  const syntheticJwt = `${header}.${payload}.${signature}`;

  mockGetAccessTokenSilently.mockResolvedValue(syntheticJwt);
  mockAuthState.isAuthenticated = true;
  mockAuthState.user = {
    sub: 'auth0|123456789',
    name: 'Test Engineer',
    email: 'engineer@example.com',
    picture: 'https://example.com/avatar.png',
  };

  render(<App />);

  // Verify user details
  expect(screen.getByText('name : Test Engineer')).toBeInTheDocument();
  expect(screen.getByText('email : engineer@example.com')).toBeInTheDocument();

  // Verify decoded RBAC permissions after silent token acquisition
  await waitFor(() => {
    expect(screen.getByText('Permission: read:spark')).toBeInTheDocument();
    expect(screen.getByText('Permission: update:spark')).toBeInTheDocument();
  });

  // Verify logout button triggers logout
  const logoutButton = screen.getByText('Log out');
  fireEvent.click(logoutButton);
  expect(mockLogout).toHaveBeenCalledTimes(1);
});
