import React from 'react';
import { render } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import App from './App';

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isLoading: false,
    isAuthenticated: false,
    error: null,
    loginWithRedirect: vi.fn(),
    logout: vi.fn(),
    getAccessTokenSilently: vi.fn(),
  }),
  withAuthenticationRequired: (component) => component,
}));

test('renders App component without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeDefined();
});

