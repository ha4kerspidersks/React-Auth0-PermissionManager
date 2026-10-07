import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import SellerLogin from './SellerLogin';
import BuyerWelcome from './BuyerWelcome';
import authConfig from './auth_config_new.json';

const mockLoginWithRedirect = vi.fn();

vi.mock('@auth0/auth0-react', () => ({
  useAuth0: () => ({
    loginWithRedirect: mockLoginWithRedirect,
  }),
}));

test('validates auth_config_new.json contains required Auth0 properties', () => {
  expect(authConfig).toBeDefined();
  expect(authConfig.domain).toBe('dev-ha4kerspider.us.auth0.com');
  expect(authConfig.clientId).toBe('QCwHSLljw267L0JWAvNoLFTR4TeeFSfl');
  expect(authConfig.audience).toBe('https://rolebaseapi');
});

test('SellerLogin renders heading and login button that triggers redirect', () => {
  render(<SellerLogin />);
  expect(screen.getByText('Seller Login')).toBeInTheDocument();
  const sellerButton = screen.getByText('Login as Seller');
  fireEvent.click(sellerButton);
  expect(mockLoginWithRedirect).toHaveBeenCalledWith({
    appState: { targetUrl: '/seller' },
  });
});

test('BuyerWelcome renders welcome message', () => {
  render(<BuyerWelcome />);
  expect(screen.getByText('Welcome Buyer')).toBeInTheDocument();
});

test('JWT permission decoding correctly extracts permission array', () => {
  const permissions = ['read:spark', 'update:spark', 'admin:spark'];
  const payload = btoa(JSON.stringify({ permissions }));
  const token = `header.${payload}.signature`;

  const decoded = JSON.parse(atob(token.split('.')[1]));
  expect(decoded.permissions).toEqual(permissions);
  expect(decoded.permissions).toHaveLength(3);
});
