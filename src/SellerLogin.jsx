// SellerLogin.js
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

function SellerLogin() {
  const { loginWithRedirect } = useAuth0();
  

  return (
    <div>
      <h2>Seller Login</h2>
      <button onClick={() => loginWithRedirect({ appState: { targetUrl: '/seller' } })}>
        Login as Seller
      </button>
    </div>
  );
}

export default SellerLogin;
