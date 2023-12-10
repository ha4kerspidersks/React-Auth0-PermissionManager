const express = require('express');
const path = require('path');
const app = express();
// const { auth } = require('express-oauth2-jwt-bearer');

const { auth } = require('express-openid-connect');
const config={
  domain:configJson.domain,
    clientId:configJson.clientId,
  authorizationParams:{
    redirect_uri: 'http://localhost:3000/buyer',
    scope: "openid profile read:spark update:spark manage:all",
    audience: configJson.audience,
  },
};
app.use(
  auth({config
  })
)

const port = process.env.PORT || 8080;

// const jwtCheck = auth({
//   audience: 'https://rolebaseapi',
//   issuerBaseURL: 'https://ab-chokshi-dev-7.us.auth0.com/',
//   tokenSigningAlg: 'RS256'
// });

// Apply JWT authentication to all requests
// app.use(jwtCheck);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

// Define your API endpoints
app.get('/api1', function (req, res) {
  // res.render("profile",{
  //   userProfile:JSON.stringify(req.oidc.user,null,2),
  //   idToken:req.oidc.idToken,
  //   accessToken:req.oidc.accessToken.access_token,
  //   Tittle:"Profile page",

  // })
  res.send("Done");

});

// Handle all other requests by serving the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(port, () => {
  console.log('Running on port', port);
});
