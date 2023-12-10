import React, { useState, useEffect } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  Collapse,
  Container,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  Button,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Row, Col,
} from "reactstrap";
import { useAuth0 } from "@auth0/auth0-react";

const oktaLogout = () => {
  // Replace 'YOUR_OKTA_DOMAIN' with your actual Okta domain.
  
  const oktaDomain = 'trial-5003612.okta.com';
  
  // Replace 'http://localhost:3000/buyer' with your Okta post-logout redirect URL.
  const postLogoutRedirectUri = 'http://localhost:3000/buyer';
  // Construct the Okta logout URL with the redirect URI.
  const oktaLogoutUrl = `https://${oktaDomain}/login/signout?fromURI==${postLogoutRedirectUri}`;
  
  console.log(oktaLogoutUrl); // Add this line to check the generated URL
  // Redirect the user to the Okta logout URL.
  window.location.href = oktaLogoutUrl;
};


const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    user,
    isAuthenticated,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();
  const toggle = () => setIsOpen(!isOpen);


  const [jwtToken, setJwtToken] = useState(null); 
  const logoutWithRedirect = () =>
    logout({
        logoutParams: {
          returnTo: window.location.origin,
        }
    });

    console.log(user)

    useEffect(() => {
      const fetchJwtToken = async () => {
        if (isAuthenticated) {
          try {
            // Get the JWT token
            const token = await getAccessTokenSilently();
            console.log(token)
            setJwtToken(token); // Store the token in state
          } catch (error) {
            // Handle error here
            console.error("Error:", error);
          }
        }
      };
  
      fetchJwtToken();
    }, [isAuthenticated, getAccessTokenSilently]);

   
  
    // const handleApiRequest = async () => {
      
        // Check if the user is authenticated and if a JWT token is available
        if (isAuthenticated && jwtToken) {
      //  console.log(jwtToken)
      //  console.log(JSON.parse(atob(jwtToken.split('.')[1])));
      //  const tokendata = JSON.parse(atob(jwtToken.split('.')[1]));
      //     console.log(tokendata.permissions)
      //     {tokendata.permissions.map((permission, index) => (
      //       <h2 key={index}>Permission: {permission}</h2>
      //     ))}
        } else {
          console.error('User is not authenticated or JWT token is missing');
        }
    
    // };
  return (

    
    <div className="nav-container">
      <Navbar color="light" light expand="md" container={false}>
        <Container>
          <NavbarBrand className="logo" />
          <NavbarToggler onClick={toggle} />
          <Collapse isOpen={isOpen} navbar>
            <Nav className="mr-auto" navbar>
              <NavItem>
                <NavLink
                  tag={RouterNavLink}
                  to="/"
                  exact
                  activeClassName="router-link-exact-active"
                >
                  Home
                </NavLink>
              </NavItem>
            
            </Nav>
            
            <Row className="align-items-center profile-header mb-5 text-center text-md-left">
      
        
      </Row>
      <Row>{
        user ? (
      <img
      style={{borderRadius: "50%"}}
      src={user.picture}
      alt="Profile"
      className="nav-user-profile d-inline-block rounded-circle mr-3"
      width="50"
    />
   ) :<></>}
      {user ? (
  Object.entries(user).map(([key, val]) => {
    if(key != 'picture') {
      return (<h2 key={key}>
        {key} : {val}
      </h2>)
    }
  })
) : <></>}

          {(isAuthenticated && jwtToken) ? (<h2>
            
            JWT Token     :<br></br>  :    {jwtToken} 
            {JSON.parse(atob(jwtToken.split('.')[1])).permissions.map((permission, index) => (
            <h2 key={index}>Permission: {permission}</h2>
          ))}
          </h2>):<></>}
         

        
      </Row>


     

            {!isAuthenticated && (
              <Nav className="d-md-none" navbar>
                <NavItem>
                  <Button
                    id="qsLoginBtn"
                    color="primary"
                    block
                    onClick={() => loginWithRedirect({})}
                  >
                    Log in
                  </Button>
                </NavItem>
              </Nav>
            )}
            {isAuthenticated && (
              <Nav
                className="d-md-none justify-content-between"
                navbar
                style={{ minHeight: 170 }}
              >
                
             
                <NavItem>
                  <FontAwesomeIcon icon="power-off" className="mr-3" />
                  <RouterNavLink
                    to="#"
                    id="qsLogoutBtn"
                    onClick={() => logoutWithRedirect()}
                  >
                    Log out Auth0 
                  </RouterNavLink>
                </NavItem>
                <NavItem>
  <FontAwesomeIcon icon="power-off" className="mr-3" />
  <RouterNavLink
    to="#"
    id="oktaLogoutBtn"
    onClick={() => oktaLogout()}
  >
    Okta Logout
  </RouterNavLink>
</NavItem>

              </Nav>
            )}
          </Collapse>
        </Container>
      </Navbar>
    </div>
  );
};



export default NavBar;
