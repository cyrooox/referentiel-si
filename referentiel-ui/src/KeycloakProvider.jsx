import { createContext, useContext, useEffect, useState } from 'react';
import keycloak from './keycloak';
import api from './api/axios';

const KeycloakContext = createContext(null);

export const useKeycloak = () => useContext(KeycloakContext);

export const KeycloakProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    keycloak
      .init({
        onLoad: 'login-required',       // Redirige vers Keycloak si non connecté
        checkLoginIframe: false,        // Évite des problèmes CORS en dev
        pkceMethod: 'S256',            // Sécurité renforcée
      })
      .then(async (auth) => {
        setAuthenticated(auth);

        if (auth) {
          // Debug : affiche le contenu du token pour vérification
          console.log('🔑 Token Keycloak parsé:', keycloak.tokenParsed);
          console.log('👤 Rôles:', keycloak.tokenParsed?.realm_access?.roles);
          console.log('📧 Email:', keycloak.tokenParsed?.email);

          // Synchronise l'utilisateur avec la BDD PostgreSQL
          try {
            const response = await api.post('/auth/sync');
            setUserInfo(response.data);
          } catch (err) {
            console.error('Erreur sync utilisateur:', err);
          }
        }

        setInitialized(true);
      })
      .catch((err) => {
        console.error('Keycloak init failed:', err);
        setInitialized(true);
      });

    // Rafraîchir le token toutes les 4 minutes (avant expiration de 5 min)
    const refreshInterval = setInterval(() => {
      keycloak.updateToken(60).catch(() => {
        console.warn('Session expirée, déconnexion...');
        keycloak.logout();
      });
    }, 4 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  const logout = () => {
    localStorage.removeItem('jwt_token');
    keycloak.logout({ redirectUri: window.location.origin });
  };

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-600 font-medium">Connexion en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <KeycloakContext.Provider
      value={{
        keycloak,
        authenticated,
        userInfo,
        logout,
        token: keycloak.token,
      }}
    >
      {children}
    </KeycloakContext.Provider>
  );
};
