import { useState, useEffect } from 'react';
import {
  BarChart2, ChevronLeft, ChevronRight, Calendar, Filter,
  Layers, Info, AlertTriangle, TrendingUp, Globe
} from 'lucide-react';
import api from '../api/axios';
import { useKeycloak } from '../KeycloakProvider';

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const statusColors = {
  'En cours':   { bar: '#6B9B2D' },
  'En attente': { bar: '#f59e0b' },
  'Terminé':    { bar: '#3b82f6' },
  'Suspendu':   { bar: '#94a3b8' },
  'default':    { bar: '#2D4A5C' },
};

const healthColors = {
  'Vert':    '#22c55e',
  'Orange':  '#f97316',
  'Rouge':   '#ef4444',
  'default': '#94a3b8',
};

const getDaysInYear = (year) => ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;

const dayOfYear = (date, year) => {
  const start = new Date(year, 0, 1);
  const d = new Date(date);
  return Math.floor((d - start) / 86400000);
};

const RoadmapView = () => {
  const { userInfo } = useKeycloak();
  const isChefProjet = userInfo?.role === 'CHEF_PROJET';

  const [projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [filterDirection, setFilterDirection] = useState('Toutes');
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    api.get('/projets')
      .then(r => {
        let list = r.data;
        if (isChefProjet && userInfo?.email) {
          list = list.filter(p =>
            p.chefDeProjet?.some(u => u.email?.toLowerCase() === userInfo.email.toLowerCase())
          );
        }
        setProjets(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isChefProjet, userInfo]);

  const daysInYear = getDaysInYear(year);
  const today = new Date();
  const todayDoy = today.getFullYear() === year ? dayOfYear(today, year) : -1;
  const todayPct = todayDoy >= 0 ? (todayDoy / daysInYear) * 100 : null;

  const directions = ['Toutes', ...new Set(projets.map(p => p.directionMetier).filter(Boolean))];
  const statuts = ['Tous', ...new Set(projets.map(p => p.statut).filter(Boolean))];

  let filtered = projets.filter(p => {
    if (filterStatut !== 'Tous' && p.statut !== filterStatut) return false;
    if (filterDirection !== 'Toutes' && p.directionMetier !== filterDirection) return false;
    return true;
  });

  const withDates    = filtered.filter(p => p.dateDebutPrevue && p.dateFinPrevue);
  const withoutDates = filtered.filter(p => !p.dateDebutPrevue || !p.dateFinPrevue);

  const getBar = (projet) => {
    const startD  = new Date(projet.dateDebutPrevue);
    const endD    = new Date(projet.dateFinPrevue);
    if (startD.getFullYear() > year || endD.getFullYear() < year) return null;
    const visStart = Math.max(0, dayOfYear(startD, year));
    const visEnd   = Math.min(daysInYear, dayOfYear(endD, year));
    if (visEnd < visStart) return null;
    const left  = (visStart / daysInYear) * 100;
    const width = ((visEnd - visStart) / daysInYear) * 100;
    const colors = statusColors[projet.statut] || statusColors.default;
    return { left: Math.max(0, Math.min(left, 100)), width: Math.max(0.3, width), colors };
  };

  const monthLines = [];
  for (let m = 0; m < 12; m++) {
    const doy = dayOfYear(new Date(year, m, 1), year);
    monthLines.push({ month: m, pct: (doy / daysInYear) * 100 });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
               style={{ borderColor:'#2D4A5C', borderTopColor:'transparent' }} />
          <p className="text-slate-500 font-medium">Chargement de la roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="gantt-header flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'rgba(255,255,255,0.1)' }}>
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Roadmap du Portefeuille</h1>
              <p className="text-sm" style={{ color:'rgba(255,255,255,0.6)' }}>
                {filtered.length} projet{filtered.length !== 1 ? 's' : ''} • Vue Gantt {year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setYear(y => y - 1)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 border border-white/20">
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <span className="text-2xl font-bold text-white min-w-16 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-white/10 border border-white/20">
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background:'rgba(255,255,255,0.1)' }}>
            <Filter style={{ width:14, height:14, color:'rgba(255,255,255,0.7)' }} />
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="bg-transparent text-white text-xs font-medium outline-none">
              {statuts.map(s => <option key={s} value={s} style={{ color:'#000' }}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background:'rgba(255,255,255,0.1)' }}>
            <Globe style={{ width:14, height:14, color:'rgba(255,255,255,0.7)' }} />
            <select value={filterDirection} onChange={e => setFilterDirection(e.target.value)} className="bg-transparent text-white text-xs font-medium outline-none">
              {directions.map(d => <option key={d} value={d} style={{ color:'#000' }}>{d}</option>)}
            </select>
          </div>
          <div className="ml-auto flex items-center gap-4 flex-wrap">
            {Object.entries(statusColors).filter(([k]) => k !== 'default').map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ background:v.bar }} />
                <span className="text-xs" style={{ color:'rgba(255,255,255,0.7)' }}>{k}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gantt body */}
      <div className="flex-1 overflow-auto bg-white gantt-container">

        {/* Sticky month header */}
        <div style={{ position:'sticky', top:0, zIndex:20, background:'white', borderBottom:'2px solid #e2e8f0', display:'flex', minWidth:900 }}>
          <div className="gantt-label flex-shrink-0" style={{ background:'#f8fafc', height:36, display:'flex', alignItems:'center' }}>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Projet</span>
          </div>
          <div style={{ flex:1, position:'relative', height:36 }}>
            {monthLines.map(({ month, pct }) => (
              <div key={month} style={{ position:'absolute', left:`${pct}%`, top:0, bottom:0 }}>
                {month > 0 && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:1, background:'#e2e8f0' }} />}
                <div style={{ position:'absolute', left:6, top:'50%', transform:'translateY(-50%)', fontSize:11, fontWeight:600, color:'#64748b', whiteSpace:'nowrap' }}>
                  {MONTHS_FR[month]}
                </div>
              </div>
            ))}
            {todayPct !== null && (
              <div style={{ position:'absolute', left:`${todayPct}%`, top:0, bottom:0, width:2, background:'rgba(239,68,68,0.25)' }} />
            )}
          </div>
        </div>

        {/* No projects */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <BarChart2 className="w-16 h-16 mb-4 text-slate-200" />
            <p className="text-lg font-semibold">Aucun projet à afficher</p>
            <p className="text-sm mt-1">Modifiez les filtres ou ajoutez des projets avec des dates.</p>
          </div>
        )}

        {/* Project rows with dates */}
        {withDates.map((projet, idx) => {
          const bar = getBar(projet);
          const avancement = projet.tauxAvancement || 0;
          return (
            <div key={projet.id} className="gantt-row" style={{ minWidth:900 }}>
              <div className="gantt-label">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: healthColors[projet.etatSante] || healthColors.default }} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate" title={projet.nom}>{projet.nom}</p>
                    <p className="text-[10px] text-slate-400">{projet.code} • {avancement}%</p>
                  </div>
                </div>
              </div>
              <div style={{ flex:1, position:'relative', height:48 }}>
                {monthLines.map(({ month, pct }) => month > 0 && (
                  <div key={month} style={{ position:'absolute', left:`${pct}%`, top:0, bottom:0, width:1, borderRight:'1px dashed #f1f5f9', pointerEvents:'none' }} />
                ))}
                {todayPct !== null && (
                  <div style={{ position:'absolute', left:`${todayPct}%`, top:0, bottom:0, width:2, background:'#ef4444', zIndex:5, pointerEvents:'none' }} />
                )}
                {bar && (
                  <div
                    className="gantt-bar"
                    style={{
                      left:`${bar.left}%`,
                      width:`${bar.width}%`,
                      background:`linear-gradient(90deg, ${bar.colors.bar}cc, ${bar.colors.bar})`,
                    }}
                    onMouseEnter={e => setTooltip({ x:e.clientX, y:e.clientY, projet })}
                    onMouseLeave={() => setTooltip(null)}
                    onMouseMove={e => setTooltip(t => t ? { ...t, x:e.clientX, y:e.clientY } : null)}
                  >
                    {bar.width > 5 && <span className="truncate text-[10px]">{projet.nom}</span>}
                    {/* Progress overlay */}
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${avancement}%`, background:'rgba(255,255,255,0.2)', borderRadius:6, pointerEvents:'none' }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Projects without dates */}
        {withoutDates.length > 0 && (
          <>
            <div style={{ background:'#fef9c3', borderBottom:'1px solid #fde68a', padding:'6px 16px', display:'flex', alignItems:'center', gap:8, minWidth:900 }}>
              <AlertTriangle style={{ width:14, height:14, color:'#d97706' }} />
              <span style={{ fontSize:11, fontWeight:600, color:'#d97706' }}>
                {withoutDates.length} projet{withoutDates.length > 1 ? 's' : ''} sans dates planifiées
              </span>
            </div>
            {withoutDates.map(projet => (
              <div key={projet.id} className="gantt-row" style={{ opacity:0.55, minWidth:900 }}>
                <div className="gantt-label">
                  <p className="text-xs font-bold text-slate-600 truncate">{projet.nom}</p>
                  <p className="text-[10px] text-slate-400">{projet.code} • Dates manquantes</p>
                </div>
                <div style={{ flex:1, display:'flex', alignItems:'center', padding:'0 16px' }}>
                  <span className="text-xs text-slate-400 italic">Aucune date planifiée</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="gantt-tooltip" style={{ left: tooltip.x + 16, top: tooltip.y - 10 }}>
          <p className="font-bold text-white mb-1">{tooltip.projet.nom}</p>
          <p style={{ color:'rgba(255,255,255,0.5)', fontSize:10 }} className="mb-2">{tooltip.projet.code}</p>
          <div className="space-y-1" style={{ fontSize:11 }}>
            {[
              ['Début', tooltip.projet.dateDebutPrevue ? new Date(tooltip.projet.dateDebutPrevue).toLocaleDateString('fr-FR') : '—'],
              ['Fin prévue', tooltip.projet.dateFinPrevue ? new Date(tooltip.projet.dateFinPrevue).toLocaleDateString('fr-FR') : '—'],
              ['Avancement', `${tooltip.projet.tauxAvancement || 0}%`],
              ['Météo', tooltip.projet.etatSante || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span style={{ color:'rgba(255,255,255,0.5)' }}>{k}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
            {tooltip.projet.chefDeProjet && tooltip.projet.chefDeProjet.length > 0 && (
              <div className="flex justify-between gap-4">
                <span style={{ color:'rgba(255,255,255,0.5)' }}>Chef</span>
                <span className="font-medium">{tooltip.projet.chefDeProjet.map(u => `${u.prenom} ${u.nom}`).join(', ')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoadmapView;
