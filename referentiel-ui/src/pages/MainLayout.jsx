import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { LogOut, FolderKanban, Users, Settings, Activity, Database, ChevronDown, ShieldAlert } from 'lucide-react';
import { useKeycloak } from '../KeycloakProvider';

const MainLayout = () => {
  const location = useLocation();
  const [isProjectsMenuOpen, setIsProjectsMenuOpen] = useState(
    location.pathname.startsWith('/projects')
  );
  const { userInfo, logout } = useKeycloak();

  // Source fiable : rôle venant de PostgreSQL via /auth/sync
  const role = userInfo?.role; // 'ADMIN', 'PMO', 'CHEF_PROJET', 'EN_ATTENTE'
  const isAdmin      = role === 'ADMIN';
  const isPMO        = role === 'PMO';
  const isChefProjet = role === 'CHEF_PROJET';
  const isEnAttente  = role === 'EN_ATTENTE' || !role;

  // Infos affichage
  const nom      = userInfo?.nom    || '';
  const prenom   = userInfo?.prenom || '';
  const email    = userInfo?.email  || '';
  const initiales = prenom && nom
    ? `${prenom[0]}${nom[0]}`.toUpperCase()
    : email ? `${email[0]}${email[1] || ''}`.toUpperCase()
    : '??';
  const fullName = `${prenom} ${nom}`.trim() || email || 'Utilisateur';
  const roleLabel = {
    ADMIN:       '🔴 Administrateur',
    PMO:         '🔵 PMO',
    CHEF_PROJET: '🟢 Chef de Projet',
    EN_ATTENTE:  '⏳ En attente',
  }[role] || 'Utilisateur';

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Utilisateur en attente : page bloquée
  if (isEnAttente) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center bg-white p-10 rounded-2xl shadow-xl max-w-md">
          <ShieldAlert className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Compte en attente</h2>
          <p className="text-slate-500 mb-6">
            Votre compte est en attente de validation par un administrateur.
            Vous serez notifié lorsque votre accès sera activé.
          </p>
          <button
            onClick={logout}
            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{background:'#f1f5f8'}}>
      {/* Sidebar CDG */}
      <aside className="w-64 flex flex-col shadow-xl" style={{background:'#2D4A5C'}}>

        {/* En-tête : Logo + Nom app */}
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-5 border-b" style={{borderColor:'rgba(255,255,255,0.1)'}}>
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="CDG Logo" className="h-10 object-contain brightness-0 invert" />
            <div className="w-px h-8" style={{background:'rgba(255,255,255,0.25)'}} />
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm tracking-wide leading-tight">Référentiel SI</span>
              <span className="text-xs font-light" style={{color:'#6B9B2D', letterSpacing:'0.05em'}}>CDG • Système d’Information</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">

          {/* Dashboard — visible par tous */}
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
              isActive('/dashboard')
                ? 'text-white font-semibold'
                : 'hover:bg-white/10'
            }`}
            style={isActive('/dashboard') ? {background:'#6B9B2D', color:'white'} : {color:'rgba(255,255,255,0.8)'}}
          >
            <Activity className="w-5 h-5" />
            Dashboard
          </Link>

          {/* Projets — Chef de Projet (lecteur) et PMO (créateur/lecteur) */}
          {(isChefProjet || isPMO) && (
            <div>
              <button
                onClick={() => setIsProjectsMenuOpen(!isProjectsMenuOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                  isActive('/projects') ? 'font-semibold' : 'hover:bg-white/10'
                }`}
                style={isActive('/projects') ? {background:'#6B9B2D', color:'white'} : {color:'rgba(255,255,255,0.8)'}}
              >
                <div className="flex items-center gap-3">
                  <FolderKanban className="w-5 h-5" />
                  Projets
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isProjectsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProjectsMenuOpen && (
                <div className="pl-11 pr-3 py-1 space-y-1 mt-1">
                  <Link
                    to="/projects"
                    className="block px-3 py-2 text-xs font-medium rounded-lg transition-all hover:bg-white/10"
                    style={{color:'rgba(255,255,255,0.7)'}}
                  >
                    Liste des projets
                  </Link>
                  {isPMO && (
                    <Link
                      to="/projects"
                      state={{ openInitModal: true }}
                      className="block px-3 py-2 text-xs font-medium rounded-lg transition-all hover:bg-white/10"
                      style={{color:'#6B9B2D'}}
                    >
                      + Nouveau projet
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Ressources & Accès — Admin uniquement */}
          {isAdmin && (
            <Link
              to="/users"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                isActive('/users') ? 'font-semibold' : 'hover:bg-white/10'
              }`}
              style={isActive('/users') ? {background:'#6B9B2D', color:'white'} : {color:'rgba(255,255,255,0.8)'}}
            >
              <Users className="w-5 h-5" />
              Ressources &amp; Accès
            </Link>
          )}

          {/* Référentiels — Admin uniquement */}
          {isAdmin && (
            <Link
              to="/references"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                isActive('/references') ? 'font-semibold' : 'hover:bg-white/10'
              }`}
              style={isActive('/references') ? {background:'#6B9B2D', color:'white'} : {color:'rgba(255,255,255,0.8)'}}
            >
              <Database className="w-5 h-5" />
              Référentiels
            </Link>
          )}

        </nav>

        <div className="p-4 border-t" style={{borderColor:'rgba(255,255,255,0.1)'}}>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all font-medium text-sm hover:bg-white/10"
            style={{color:'rgba(255,255,255,0.7)'}}
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Zone de contenu principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0">
          {/* Fil d'Ariane / Titre page */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{color:'#2D4A5C'}}>CDG</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-slate-600">Référentiel SI</span>
          </div>

          {/* Info utilisateur */}
          <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-colors border border-transparent hover:border-slate-200">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-700">{fullName}</span>
              <span className="text-xs font-medium" style={{color:'#6B9B2D'}}>{roleLabel}</span>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{background:'#2D4A5C'}}>
              {initiales}
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
