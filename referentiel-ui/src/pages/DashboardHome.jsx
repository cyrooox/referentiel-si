import { useState, useEffect } from 'react';
import {
  Activity, TrendingUp, AlertTriangle, DollarSign, Pin, PinOff,
  FolderKanban, Calendar, Star, Clock, ArrowRight, Zap, Target,
  BarChart2, CheckSquare, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useKeycloak } from '../KeycloakProvider';
import MaturityScoreBar from '../components/MaturityScoreBar';

/* ─── Admin Dashboard ─────────────────────────────────────── */
import { Shield, Users, Wifi, UserCheck, Briefcase } from 'lucide-react';

const AdminDashboard = ({ stats, utilisateurs }) => {
  const enAttenteList = utilisateurs.filter(u => u.role === 'EN_ATTENTE');
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-7 h-7" style={{color:'#2D4A5C'}} />
          Dashboard Administrateur
        </h2>
        <p className="text-slate-500 mt-1">Vue d'ensemble des utilisateurs et de l'activité système</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {[
          { label:'Total Utilisateurs', value: stats.totalUsers,      Icon: Users,     color:'#2D4A5C', bg:'#eef2f5' },
          { label:'En ligne',           value: stats.sessionsActives,  Icon: Wifi,      color:'#6B9B2D', bg:'#f2f6e8', pulse:true },
          { label:'En attente',         value: stats.enAttente,        Icon: Clock,     color: stats.enAttente>0?'#f97316':'#94a3b8', bg: stats.enAttente>0?'#fff7ed':'#f8fafc' },
          { label:'Administrateurs',    value: stats.admins,           Icon: Shield,    color:'#64748b', bg:'#f8fafc' },
        ].map(({ label, value, Icon, color, bg, pulse }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow fade-in-up">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0" style={{background: bg}}>
              <Icon className="w-7 h-7" style={{color}} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <p className="text-4xl font-extrabold" style={{color}}>{value}</p>
                {pulse && <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />actif
                </span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Répartition des rôles</h3>
          <div className="space-y-3">
            {[
              { label:'Chefs de Projet', count: stats.chefsDeProjet, color:'#6B9B2D', bg:'#f2f6e8', Icon: Briefcase },
              { label:'PMO',             count: stats.pmos,          color:'#2D4A5C', bg:'#eef2f5', Icon: UserCheck },
              { label:'Membres',         count: stats.membres||0,    color:'#D4AF37', bg:'#fef9c3', Icon: Users },
              { label:'Administrateurs', count: stats.admins,        color:'#64748b', bg:'#f8fafc', Icon: Shield },
              { label:'En attente',      count: stats.enAttente,     color:'#f97316', bg:'#fff7ed', Icon: Clock },
            ].map(({ label, count, color, bg, Icon }) => (
              <div key={label} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{background:bg}}>
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{color}} />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </div>
                <span className="text-lg font-extrabold" style={{color}}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Comptes en attente
            </h3>
            {enAttenteList.length > 0 && (
              <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">{enAttenteList.length}</span>
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
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{background:'#2D4A5C'}}>
                    {u.prenom?.[0]||'?'}{u.nom?.[0]||''}
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Tous les utilisateurs ({utilisateurs.length})</h3>
        </div>
        <ul className="divide-y divide-slate-50">
          {utilisateurs.map(u => {
            const rc = { ADMIN:{bg:'#eef2f5',color:'#2D4A5C'}, PMO:{bg:'#f2f6e8',color:'#6B9B2D'}, CHEF_PROJET:{bg:'#eff6ff',color:'#3b82f6'}, MEMBRE:{bg:'#fef9c3',color:'#854d0e'}, EN_ATTENTE:{bg:'#fff7ed',color:'#f97316'} }[u.role]||{bg:'#f8fafc',color:'#64748b'};
            return (
              <li key={u.id} className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{background:'#2D4A5C'}}>
                  {u.prenom?.[0]||'?'}{u.nom?.[0]||''}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{u.prenom} {u.nom}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full" style={{background:rc.bg,color:rc.color}}>
                  {u.role?.replace('ROLE_','')||'—'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

/* ─── PMO / Chef de Projet Dashboard ─────────────────────── */
const ProjectDashboard = ({ projets, userInfo, isPMO }) => {
  const navigate = useNavigate();
  const [pinnedIds, setPinnedIds] = useState([]);
  const [loadingPin, setLoadingPin] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/dashboard/config');
        setPinnedIds(res.data.pinnedProjectIds || []);
      } catch { /* silent */ }
    };
    fetchConfig();
  }, []);

  const togglePin = async (e, projectId) => {
    e.stopPropagation();
    setLoadingPin(true);
    try {
      if (pinnedIds.includes(projectId)) {
        await api.delete(`/dashboard/pin/${projectId}`);
        setPinnedIds(prev => prev.filter(id => id !== projectId));
      } else {
        await api.post(`/dashboard/pin/${projectId}`);
        setPinnedIds(prev => [...prev, projectId]);
      }
    } catch { /* silent */ }
    setLoadingPin(false);
  };

  const pinnedProjets  = projets.filter(p => pinnedIds.includes(p.id));
  const alertProjets   = projets.filter(p => p.etatSante === 'Orange' || p.etatSante === 'Rouge');
  const recentProjets  = [...projets].reverse().slice(0, 5);
  const totalBudgetI   = projets.reduce((a, p) => a + (p.budgetInitial  || 0), 0);
  const totalBudgetC   = projets.reduce((a, p) => a + (p.budgetConsomme || 0), 0);
  const pctBudget      = totalBudgetI === 0 ? 0 : Math.round((totalBudgetC / totalBudgetI) * 100);
  const avgMaturity    = projets.length === 0 ? 0 : Math.round(projets.reduce((a, p) => a + (p.maturityScore || 0), 0) / projets.length);
  const projetsTermines = projets.filter(p => p.statut === 'Terminé').length;

  const prenom = userInfo?.prenom || '';

  const healthColor = (sante) => {
    if (sante === 'Vert')   return { bg: '#f0fdf4', color: '#16a34a', dot: '#22c55e' };
    if (sante === 'Orange') return { bg: '#fff7ed', color: '#ea580c', dot: '#f97316' };
    return { bg: '#fef2f2', color: '#dc2626', dot: '#ef4444' };
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">

      {/* Greeting header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Bonjour {prenom} 👋
          </h2>
          <p className="text-slate-500 mt-1">
            {isPMO ? 'Vue portfolio PMO — ' : 'Vos projets — '}
            {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        {isPMO && (
          <button
            onClick={() => navigate('/roadmap')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2D4A5C, #6B9B2D)' }}
          >
            <BarChart2 className="w-4 h-4" />
            Voir Roadmap
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Projets total',    value: projets.length,    Icon: FolderKanban, color:'#2D4A5C', bg:'#eef2f5', sub: `${projetsTermines} terminé${projetsTermines>1?'s':''}` },
          { label: 'En alerte',        value: alertProjets.length, Icon: AlertTriangle, color: alertProjets.length>0?'#ef4444':'#22c55e', bg: alertProjets.length>0?'#fef2f2':'#f0fdf4', sub: 'météo rouge/orange' },
          { label: 'Budget consommé',  value: `${pctBudget}%`,   Icon: DollarSign,   color:'#6B9B2D', bg:'#f2f6e8', sub: `${(totalBudgetC/1000).toFixed(0)}k / ${(totalBudgetI/1000).toFixed(0)}k MAD` },
          { label: 'Maturité moyenne', value: `${avgMaturity}%`, Icon: Target,        color:'#7c3aed', bg:'#ede9fe', sub: 'complétude des fiches' },
        ].map(({ label, value, Icon, color, bg, sub }, i) => (
          <div key={label} className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-md transition-all fade-in-up stagger-${i+1}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{background:bg}}>
                <Icon className="w-5 h-5" style={{color}} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-800">{value}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Projets épinglés */}
      {pinnedProjets.length > 0 && (
        <div className="widget-card">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Star className="w-4 h-4" style={{color:'#f59e0b'}} />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Mes projets épinglés</h3>
            <span className="ml-auto text-xs text-slate-400">{pinnedProjets.length} projet{pinnedProjets.length>1?'s':''}</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pinnedProjets.map(p => {
              const hc = healthColor(p.etatSante);
              return (
                <div
                  key={p.id}
                  className="pinned-card group"
                  onClick={() => navigate(`/projects/edit/${p.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-400 tracking-wider">{p.code}</span>
                      <h4 className="font-semibold text-slate-800 text-sm mt-0.5 leading-tight">{p.nom}</h4>
                    </div>
                    <button
                      onClick={(e) => togglePin(e, p.id)}
                      className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded-lg hover:bg-slate-100"
                      title="Désépingler"
                    >
                      <PinOff style={{ width: 14, height: 14, color:'#94a3b8' }} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: hc.dot }}
                    />
                    <span className="text-xs" style={{ color: hc.color }}>{p.etatSante}</span>
                    <span className="text-xs text-slate-400 ml-auto">{p.tauxAvancement || 0}%</span>
                  </div>
                  <MaturityScoreBar score={p.maturityScore || 0} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projets récents */}
        <div className="widget-card">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Projets récents</h3>
            </div>
            <button
              className="text-xs font-semibold hover:underline"
              style={{ color:'#2D4A5C' }}
              onClick={() => navigate('/projects')}
            >
              Voir tous →
            </button>
          </div>
          {recentProjets.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Activity className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              <p className="text-sm italic">Aucun projet récent.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {recentProjets.map(p => {
                const isPinned = pinnedIds.includes(p.id);
                const hc = healthColor(p.etatSante);
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/projects/edit/${p.id}`)}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: hc.dot }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.nom}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{p.code}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">{p.tauxAvancement || 0}% avancement</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MaturityScoreBar score={p.maturityScore||0} size="sm" showLabel={false} />
                      <button
                        onClick={(e) => togglePin(e, p.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all p-1 rounded"
                        title={isPinned ? 'Désépingler' : 'Épingler'}
                      >
                        {isPinned
                          ? <PinOff style={{ width:14, height:14, color:'#f59e0b' }} />
                          : <Pin   style={{ width:14, height:14, color:'#94a3b8' }} />
                        }
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Projets en alerte */}
        <div className="widget-card">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Projets en alerte</h3>
            {alertProjets.length > 0 && (
              <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">
                {alertProjets.length}
              </span>
            )}
          </div>
          {alertProjets.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <CheckSquare className="w-10 h-10 mx-auto mb-2 text-green-200" />
              <p className="text-sm font-medium text-green-600">Tous les projets sont en bonne santé ✓</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {alertProjets.map(p => {
                const hc = healthColor(p.etatSante);
                const budgetPct = p.budgetInitial > 0 ? Math.round((p.budgetConsomme||0) / p.budgetInitial * 100) : 0;
                return (
                  <li
                    key={p.id}
                    className="px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    style={{ borderLeft: `3px solid ${hc.dot}` }}
                    onClick={() => navigate(`/projects/edit/${p.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{p.nom}</p>
                        <p className="text-xs text-slate-400">{p.code}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background:hc.bg, color:hc.color }}>
                        {p.etatSante}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span>Budget: {budgetPct}%</span>
                      <span>Avancement: {p.tauxAvancement || 0}%</span>
                      {p.chefDeProjet && p.chefDeProjet.length > 0 && (
                        <span>Chef: {p.chefDeProjet.map(u => `${u.prenom} ${u.nom}`).join(', ')}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Budget overview */}
      <div className="widget-card">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <DollarSign className="w-4 h-4" style={{ color:'#6B9B2D' }} />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Aperçu budgétaire du portefeuille</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Consommation globale</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold" style={{ color: pctBudget>90?'#ef4444':pctBudget>70?'#f97316':'#6B9B2D' }}>
                {pctBudget}%
              </span>
              <span className="text-xs text-slate-400">
                ({(totalBudgetC/1000000).toFixed(2)} M MAD / {(totalBudgetI/1000000).toFixed(2)} M MAD)
              </span>
            </div>
          </div>
          <div className="h-4 rounded-full overflow-hidden" style={{ background:'#f1f5f9' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(100, pctBudget)}%`,
                background: pctBudget>90
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : pctBudget>70
                  ? 'linear-gradient(90deg, #f97316, #ea580c)'
                  : 'linear-gradient(90deg, #6B9B2D, #8fc43b)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0</span>
            <span>{(totalBudgetI/1000000).toFixed(2)} M MAD</span>
          </div>
        </div>
      </div>

    </div>
  );
};

/* ─── Main DashboardHome ──────────────────────────────────── */
const DashboardHome = () => {
  const { userInfo } = useKeycloak();
  const isAdmin      = userInfo?.role === 'ADMIN';
  const isPMO        = userInfo?.role === 'PMO';
  const isChefProjet = userInfo?.role === 'CHEF_PROJET';

  const [stats, setStats]               = useState(null);
  const [projets, setProjets]           = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading]           = useState(true);

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
          let list = resProjets.data;
          if (userInfo?.role === 'CHEF_PROJET' && userInfo?.email) {
            list = list.filter(p =>
              p.chefDeProjet?.some(u => u.email?.toLowerCase() === userInfo.email.toLowerCase())
            );
          } else if (userInfo?.role === 'MEMBRE' && userInfo?.email) {
            list = list.filter(p =>
              p.membres?.some(m => m.email?.toLowerCase() === userInfo.email.toLowerCase())
            );
          }
          setProjets(list);
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
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
               style={{ borderColor:'#2D4A5C', borderTopColor:'transparent' }} />
          <p className="text-slate-500 font-medium">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (isAdmin && stats) {
    return <AdminDashboard stats={stats} utilisateurs={utilisateurs} />;
  }

  return <ProjectDashboard projets={projets} userInfo={userInfo} isPMO={isPMO} />;
};

export default DashboardHome;
