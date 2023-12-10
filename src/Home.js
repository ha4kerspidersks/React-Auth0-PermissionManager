import React, { useState, useEffect } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useAuth0 } from "@auth0/auth0-react";

export default function Home() {
  const oktaLogout = () => {
    // Replace 'YOUR_OKTA_DOMAIN' with your actual Okta domain.

    const oktaDomain = "trial-5003612.okta.com";

    // Replace 'http://localhost:3000/buyer' with your Okta post-logout redirect URL.
    const postLogoutRedirectUri = "http://localhost:3000/";
    
    const oktaLogoutUrl = `https://${oktaDomain}/login/signout?fromURI==${postLogoutRedirectUri}`;

    // Redirect the user to the Okta logout URL.
    window.location.href = oktaLogoutUrl;
  };

  const {
    user,
    isAuthenticated,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();
  const [jwtToken, setJwtToken] = useState(null);

  const logoutWithRedirect = () =>
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });

  console.log(user);

  useEffect(() => {
    const fetchJwtToken = async () => {
      if (isAuthenticated) {
        try {
          // Get the JWT token
          const token = await getAccessTokenSilently();
          console.log(token);
          setJwtToken(token); // Store the token in state
        } catch (error) {
          // Handle error here
          console.error("Error:", error);
        }
      }
    };

    fetchJwtToken();
  }, [isAuthenticated, getAccessTokenSilently]);

  const AllLogout = () => {
    if(user){

      
      if(user.sub.split('|')[0] == 'okta') {
        oktaLogout({});
      }
      logoutWithRedirect();
    }
  }

  return (
    <section className="text-gray-600 body-font">
      <div
        className="h-screen w-screen mx-auto flex flex-col px-5 py-24 justify-center items-center"
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL}/background.jpg)`,
        }}
      >
        <div className="bg-white sm:w-1/3 flex flex-col items-center mb-10 p-4 rounded-lg">
          {user ? (
            <img
              style={{ borderRadius: "50%" }}
              src={user.picture}
              alt="Profile"
              className="object-cover object-center w-48 h-48"
            />
          ) : (
            <img
              alt="Spark"
              className="object-cover object-center w-80 h-80"
              src={process.env.PUBLIC_URL + "/spark.png"}
            />
          )}
          {!isAuthenticated ? (
            <>
              <h2 className="title-font text-2xl font-semibold text-gray-900 mt-6 mb-3">
                Welcome to Spark
              </h2>
              <button
                onClick={() => loginWithRedirect({})}
                className="flex mx-auto mt-6 text-white bg-indigo-500 border-0 py-2 px-5 focus:outline-none hover:bg-indigo-600 rounded"
              >
                Login
              </button>
            </>
          ) : (
            <>
            {user ? (
                Object.entries(user).map(([key, val]) => {
                  if (key != "picture") {
                    return (
                      <h2 key={key}>
                        {key} : {val}
                      </h2>
                    );
                  }
                })
              ) : (
                <></>
              )}
   <div className="w-full break-words">
  {jwtToken && <p>JwtToken: {jwtToken}</p>}
</div>
              {jwtToken && JSON.parse(atob(jwtToken.split(".")[1])).permissions.map(
                (permission, index) => (
                  <h2 key={index}>Permission: {permission}</h2>
                )
              )}
              <button
                onClick={() => AllLogout()}
                className="flex mx-auto mt-6 text-white bg-indigo-500 border-0 py-2 px-5 focus:outline-none hover:bg-indigo-600 rounded"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
