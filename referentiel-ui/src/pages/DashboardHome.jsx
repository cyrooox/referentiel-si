import { useState, useEffect } from 'react';
import { Activity, Users, Wifi, UserCheck, Clock, Shield, Briefcase, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import { useKeycloak } from '../KeycloakProvider';

const DashboardHome = () => {
  const { userInfo } = useKeycloak();
  const isAdmin      = userInfo?.role === 'ADMIN';
  const isPMO        = userInfo?.role === 'PMO';
  const isChefProjet = userInfo?.role === 'CHEF_PROJET';

  const [stats, setStats]         = useState(null);   // admin stats
  const [projets, setProjets]     = useState([]);      // PMO / chef
  const [utilisateurs, setUtilisateurs] = useState([]); // for recent users list
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const [resStats, resUsers] = await Promise.all([
            api.get('/auth/stats'),
            api.get('/utilisateurs')
          ]);
          setStats(resStats.data);
          setUtilisateurs(resUsers.data);
        } else {
          const resProjets = await api.get('/projets');
          setProjets(resProjets.data);
        }
      } catch (e) {
        console.error('Erreur chargement dashboard', e);
      } finally {
        setLoading(false);
      }
    };
    if (userInfo) load();
  }, [userInfo, isAdmin]);

  if (loading || !userInfo) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3"
               style={{borderColor:'#2D4A5C', borderTopColor:'transparent'}} />
          <p className="text-slate-500 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  /* ===================== DASHBOARD ADMIN ===================== */
  if (isAdmin && stats) {
    const enAttenteList = utilisateurs.filter(u => u.role === 'EN_ATTENTE');

    return (
      <div className="p-8 max-w-7xl mx-auto">

        {/* En-tête */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-7 h-7" style={{color:'#2D4A5C'}} />
            Dashboard Administrateur
          </h2>
          <p className="text-slate-500 mt-1">Vue d'ensemble des utilisateurs et de l'activité système</p>
        </div>

        {/* === LIGNE 1 : Indicateurs principaux === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">

          {/* Total utilisateurs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                 style={{background:'#eef2f5'}}>
              <Users className="w-7 h-7" style={{color:'#2D4A5C'}} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Utilisateurs</p>
              <p className="text-4xl font-extrabold mt-0.5" style={{color:'#2D4A5C'}}>{stats.totalUsers}</p>
            </div>
          </div>

          {/* Utilisateurs en ligne */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                 style={{background:'#f2f6e8'}}>
              <Wifi className="w-7 h-7" style={{color:'#6B9B2D'}} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">En ligne</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <p className="text-4xl font-extrabold" style={{color:'#6B9B2D'}}>{stats.sessionsActives}</p>
                <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                  actif
                </span>
              </div>
            </div>
          </div>

          {/* En attente de validation */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                 style={{background:'#fff7ed'}}>
              <Clock className="w-7 h-7 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">En attente</p>
              <p className={`text-4xl font-extrabold mt-0.5 ${stats.enAttente > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                {stats.enAttente}
              </p>
            </div>
          </div>

          {/* Admins */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                 style={{background:'#f8f8f8'}}>
              <Shield className="w-7 h-7 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Administrateurs</p>
              <p className="text-4xl font-extrabold text-slate-800 mt-0.5">{stats.admins}</p>
            </div>
          </div>
        </div>

        {/* === LIGNE 2 : Répartition rôles + En attente === */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

          {/* Répartition par rôle */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Répartition des rôles</h3>
            <div className="space-y-3">
              {[
                { label: 'Chefs de Projet', count: stats.chefsDeProjet, color: '#6B9B2D', bg: '#f2f6e8', Icon: Briefcase },
                { label: 'PMO',             count: stats.pmos,          color: '#2D4A5C', bg: '#eef2f5', Icon: UserCheck },
                { label: 'Administrateurs', count: stats.admins,        color: '#64748b', bg: '#f8fafc', Icon: Shield },
                { label: 'En attente',      count: stats.enAttente,     color: '#f97316', bg: '#fff7ed', Icon: Clock },
              ].map(({ label, count, color, bg, Icon }) => (
                <div key={label} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{background: bg}}>
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{color}} />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </div>
                  <span className="text-lg font-extrabold" style={{color}}>{count}</span>
                </div>
              ))}
            </div>
            {/* Barre de proportion */}
            <div className="mt-4 h-2.5 rounded-full overflow-hidden flex gap-0.5" style={{background:'#f1f5f9'}}>
              {stats.totalUsers > 0 && (
                <>
                  <div style={{width:`${(stats.chefsDeProjet/stats.totalUsers)*100}%`, background:'#6B9B2D'}} className="h-full transition-all" title={`Chefs: ${stats.chefsDeProjet}`} />
                  <div style={{width:`${(stats.pmos/stats.totalUsers)*100}%`, background:'#2D4A5C'}} className="h-full transition-all" title={`PMO: ${stats.pmos}`} />
                  <div style={{width:`${(stats.admins/stats.totalUsers)*100}%`, background:'#64748b'}} className="h-full transition-all" title={`Admin: ${stats.admins}`} />
                  <div style={{width:`${(stats.enAttente/stats.totalUsers)*100}%`, background:'#f97316'}} className="h-full transition-all" title={`Attente: ${stats.enAttente}`} />
                </>
              )}
            </div>
          </div>

          {/* Comptes en attente de validation */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                Comptes en attente de validation
              </h3>
              {enAttenteList.length > 0 && (
                <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">
                  {enAttenteList.length}
                </span>
              )}
            </div>
            {enAttenteList.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <UserCheck className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                <p className="text-sm">Aucun compte en attente ✓</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {enAttenteList.map(u => (
                  <li key={u.id} className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                         style={{background:'#2D4A5C'}}>
                      {(u.prenom?.[0] || '?')}{(u.nom?.[0] || '')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{u.prenom} {u.nom}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">En attente</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* === Tous les utilisateurs === */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Tous les utilisateurs ({utilisateurs.length})
            </h3>
          </div>
          <ul className="divide-y divide-slate-50">
            {utilisateurs.map(u => {
              const roleColors = {
                ADMIN:       { bg: '#eef2f5', color: '#2D4A5C' },
                PMO:         { bg: '#f2f6e8', color: '#6B9B2D' },
                CHEF_PROJET: { bg: '#eff6ff', color: '#3b82f6' },
                EN_ATTENTE:  { bg: '#fff7ed', color: '#f97316' },
              };
              const rc = roleColors[u.role] || { bg: '#f8fafc', color: '#64748b' };
              return (
                <li key={u.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                       style={{background:'#2D4A5C'}}>
                    {(u.prenom?.[0] || '?')}{(u.nom?.[0] || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{u.prenom} {u.nom}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full"
                        style={{background: rc.bg, color: rc.color}}>
                    {u.role?.replace('ROLE_', '') || '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  /* ============= DASHBOARD PMO / CHEF DE PROJET ============= */
  const projetsActifs  = projets.length;
  const projetsAlerte  = projets.filter(p => p.etatSante === 'Orange' || p.etatSante === 'Rouge').length;
  const totalBudgetI   = projets.reduce((a, p) => a + (p.budgetInitial  || 0), 0);
  const totalBudgetC   = projets.reduce((a, p) => a + (p.budgetConsomme || 0), 0);
  const pctBudget      = totalBudgetI === 0 ? 0 : Math.round((totalBudgetC / totalBudgetI) * 100);
  const projetsRecents = [...projets].reverse().slice(0, 3);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard des Projets</h2>
        <p className="text-slate-500 mt-1">Gérez votre portefeuille de projets et vos indicateurs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projets Actifs</h3>
          <div className="mt-2 text-4xl font-extrabold text-slate-800">{projetsActifs}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Projets en Alerte</h3>
          <div className={`mt-2 text-4xl font-extrabold ${projetsAlerte > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {projetsAlerte}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Budget Consommé</h3>
          <div className="mt-2 text-4xl font-extrabold text-slate-800">{pctBudget}%</div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3">
            <div className="h-2 rounded-full" style={{width:`${pctBudget}%`, background:'#6B9B2D'}} />
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">Projets Récents</h3>
        </div>
        {projetsRecents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Activity className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="italic">Aucun projet récent.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {projetsRecents.map(p => (
              <li key={p.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-800">{p.nom}</p>
                  <p className="text-xs text-slate-400">{p.code}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  p.etatSante === 'Vert' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>{p.etatSante}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;
