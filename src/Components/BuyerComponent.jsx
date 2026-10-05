import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

function BuyerComponent() {
  const { user, logout } = useAuth0();

  return (
    <div>
      <h2>Welcome, Buyer {user ? user.name : ''}!</h2>
      <button onClick={() => logout()}>Logout</button>

      {/* Add buyer-specific functionality here */}
      <p>Buyer-specific content goes here.</p>
    </div>
  );
}

export default BuyerComponent;
