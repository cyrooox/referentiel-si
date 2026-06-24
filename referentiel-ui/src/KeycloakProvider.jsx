import { createContext, useContext, useEffect, useState } from 'react';
import keycloak from './keycloak';
import api from './api/axios';
import TotpSetup from './components/TotpSetup';
import MfaVerification from './components/MfaVerification';

const KeycloakContext = createContext(null);

export const useKeycloak = () => useContext(KeycloakContext);

export const KeycloakProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // États 2FA TOTP
  const [totpSetupRequired, setTotpSetupRequired] = useState(false);   // Première fois → scanner QR
  const [totpVerifyRequired, setTotpVerifyRequired] = useState(false);  // Connexions suivantes → saisir code
  const [mfaEmail, setMfaEmail] = useState('');

  useEffect(() => {
    keycloak
      .init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        pkceMethod: 'S256',
      })
      .then(async (auth) => {
        setAuthenticated(auth);

        if (auth) {
          console.log('🔑 Token Keycloak parsé:', keycloak.tokenParsed);
          console.log('👤 Rôles:', keycloak.tokenParsed?.realm_access?.roles);
          console.log('📧 Email:', keycloak.tokenParsed?.email);

          // Synchronise l'utilisateur avec la BDD PostgreSQL
          try {
            const response = await api.post('/auth/sync');
            const data = response.data;

            if (data.totpSetupRequired) {
              // Première connexion Microsoft → configurer le 2FA TOTP
              setTotpSetupRequired(true);
              setMfaEmail(data.email);
            } else if (data.totpVerifyRequired) {
              // 2FA déjà activé → vérifier le code
              setTotpVerifyRequired(true);
              setMfaEmail(data.email);
            } else {
              // Utilisateur local → connexion directe
              setUserInfo(data);
            }
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

    // Rafraîchir le token toutes les 4 minutes
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

  // ── Écran de chargement ────────────────────────────────────────────────
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

  // ── Setup TOTP (première connexion Microsoft) ──────────────────────────
  if (totpSetupRequired) {
    return (
      <TotpSetup
        email={mfaEmail}
        onActivated={(userData) => {
          setUserInfo(userData);
          setTotpSetupRequired(false);
        }}
        onLogout={logout}
      />
    );
  }

  // ── Vérification TOTP (connexions suivantes) ───────────────────────────
  if (totpVerifyRequired) {
    return (
      <MfaVerification
        email={mfaEmail}
        onVerified={(userData) => {
          setUserInfo(userData);
          setTotpVerifyRequired(false);
        }}
        onLogout={logout}
      />
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
