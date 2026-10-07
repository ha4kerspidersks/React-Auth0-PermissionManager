import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    isLoading: false,
    isAuthenticated: false,
    user: null,
    loginWithRedirect: jest.fn(),
    logout: jest.fn(),
  }),
  withAuthenticationRequired: (comp) => comp,
}));

test('renders app root container', () => {
  render(<App />);
  const appElement = document.getElementById('app');
  expect(appElement).toBeInTheDocument();
});
