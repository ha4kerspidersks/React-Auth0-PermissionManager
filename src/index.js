// index.js or App.js
import React from 'react';
import ReactDOM from 'react-dom';
import { Auth0Provider } from '@auth0/auth0-react';
import App from './App';
import configJson from "./auth_config_new.json";
import "./index.css";

// const express = require('express');
// const app = express();

ReactDOM.render(
  <Auth0Provider

    domain={configJson.domain}
    clientId={configJson.clientId}
    authorizationParams={{
      redirect_uri: 'http://localhost:3000/buyer',
      scope: "openid profile read:spark update:spark",
      audience: configJson.audience,
    }}
  >
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </Auth0Provider>,
  document.getElementById('root')
);
