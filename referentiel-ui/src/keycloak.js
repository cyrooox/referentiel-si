import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8180',
  realm: 'referentiel-realm',
  clientId: 'referentiel-client',
});

export default keycloak;
