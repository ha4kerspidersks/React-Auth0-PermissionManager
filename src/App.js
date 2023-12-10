import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { useAuth0, withAuthenticationRequired } from '@auth0/auth0-react';
import BuyerLogin from './BuyerLogin';
import SellerLogin from './SellerLogin';
import Home from './Home';
import BuyerWelcome from './BuyerWelcome'; // Import your welcome component

const App = () => {
  const { isLoading, error } = useAuth0();

  if (error) {
    return <div>Oops... {error.message}</div>;
  }

  if (isLoading) {
    return <div>Loading</div>;
  }

  

  return (
    <Router>
      <div id="app" className="d-flex flex-column h-100">
        {/* <div>
          <button onClick={() => window.location.href = '/buyer'}>Buyer</button>
          <button onClick={() => window.location.href = '/seller'}>Seller</button>
        </div> */}
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/buyer" component={BuyerLogin} />
          <Route path="/seller" component={SellerLogin} />
          {/* Add a route for the BuyerWelcome component */}
         
        </Switch>
      </div>
    </Router>
  );
};

export default App;
