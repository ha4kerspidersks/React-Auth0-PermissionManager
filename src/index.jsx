import React from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import configJson from './auth_config_new.json';
import './index.css';

const domain = import.meta.env.VITE_AUTH0_DOMAIN || configJson.domain;
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID || configJson.clientId;
const audience = import.meta.env.VITE_AUTH0_AUDIENCE || configJson.audience;
const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI || 'http://localhost:3000/buyer';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        scope: 'openid profile read:spark update:spark',
        audience: audience,
      }}
    >
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </Auth0Provider>
  );
}
