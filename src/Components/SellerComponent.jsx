import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

function SellerComponent() {
  const { user, logout } = useAuth0();

  return (
    <div>
      <h2>Welcome, Seller {user ? user.name : ''}!</h2>
      <button onClick={() => logout()}>Logout</button>

      {/* Add seller-specific functionality here */}
      <p>Seller-specific content goes here.</p>
    </div>
  );
}

export default SellerComponent;
