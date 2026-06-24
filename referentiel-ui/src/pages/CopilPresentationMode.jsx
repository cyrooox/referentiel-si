import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  MonitorPlay,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmt = (n) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n ?? 0);

const healthConfig = {
  VERT: { emoji: '🟢', label: 'Bon état', color: '#22c55e', glow: '0 0 32px #22c55e66' },
  ORANGE: { emoji: '🟠', label: 'Attention', color: '#f97316', glow: '0 0 32px #f9731666' },
  ROUGE: { emoji: '🔴', label: 'Critique', color: '#ef4444', glow: '0 0 32px #ef444466' },
};

const statusColors = {
  EN_COURS: { bg: '#6B9B2D22', color: '#6B9B2D', label: 'En cours' },
  EN_ATTENTE: { bg: '#f59e0b22', color: '#f59e0b', label: 'En attente' },
  TERMINE: { bg: '#3b82f622', color: '#3b82f6', label: 'Terminé' },
  SUSPENDU: { bg: '#ef444422', color: '#ef4444', label: 'Suspendu' },
};

const FILTERS = [
  { key: 'ALL', label: 'Tous' },
  { key: 'EN_COURS', label: 'En cours' },
  { key: 'EN_ATTENTE', label: 'En attente' },
  { key: 'TERMINE', label: 'Terminé' },
];

/* ─── project slide ─────────────────────────────────────── */
function ProjectSlide({ projet, index, total, isEntering }) {
  const health = healthConfig[projet.sante ?? 'VERT'] ?? healthConfig['VERT'];
  const statusCfg = statusColors[projet.statut] ?? { bg: '#ffffff22', color: '#94a3b8', label: projet.statut };
  const progress = Math.min(100, Math.max(0, projet.tauxAvancement ?? 0));
  const budgetPct = projet.budgetInitial > 0
    ? Math.min(100, Math.round(((projet.budgetConsomme ?? 0) / projet.budgetInitial) * 100))
    : 0;

  return (
    <div
      className={`copil-card ${isEntering ? 'copilSlide' : ''}`}
      style={{
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        borderRadius: 28,
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '44px 52px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        animation: isEntering ? 'copilSlideIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
      }}
    >
      {/* ── top badge row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ background: '#2D4A5Ccc', color: '#94a3b8', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: '1px solid #2D4A5C', letterSpacing: '0.06em' }}>
          {projet.code}
        </span>
        {projet.type && (
          <span style={{ background: '#6B9B2D22', color: '#6B9B2D', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, border: '1px solid #6B9B2D44' }}>
            {projet.type}
          </span>
        )}
        <span style={{ background: statusCfg.bg, color: statusCfg.color, fontSize: 12, fontWeight: 700, padding: '4px 14px', borderRadius: 20, marginLeft: 'auto' }}>
          {statusCfg.label}
        </span>
      </div>

      {/* ── project name + health ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 32 }}>
        <h2
          style={{
            color: '#f8fafc',
            fontSize: 36,
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.2,
            flex: 1,
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
          }}
        >
          {projet.nom}
        </h2>

        {/* Health indicator */}
        <div
          className="copil-health-indicator"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: health.color + '22',
              border: `3px solid ${health.color}`,
              boxShadow: health.glow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            {health.emoji}
          </div>
          <span style={{ fontSize: 11, color: health.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {health.label}
          </span>
        </div>
      </div>

      {/* ── progress bar ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avancement global</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{progress}%</span>
        </div>
        <div
          className="copil-progress-bar"
          style={{ height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 7, overflow: 'hidden' }}
        >
          <div
            className="copil-progress-fill"
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6B9B2D, #8bc34a, #6B9B2D)',
              backgroundSize: '200% 100%',
              borderRadius: 7,
              animation: 'shimmer 2.5s linear infinite',
              transition: 'width 0.8s ease',
              boxShadow: '0 0 12px rgba(107,155,45,0.6)',
            }}
          />
        </div>
      </div>

      {/* ── 3 KPI cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Budget consommé', value: `${budgetPct}%`, sub: `${fmt(projet.budgetConsomme)} / ${fmt(projet.budgetInitial)}`, color: '#f59e0b', bg: '#f59e0b18' },
          { label: "Taux d'avancement", value: `${progress}%`, sub: projet.phase ?? 'N/A', color: '#6B9B2D', bg: '#6B9B2D18' },
          { label: 'Phase courante', value: projet.phase ?? '—', sub: ' ', color: '#8b5cf6', bg: '#8b5cf618' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: kpi.bg,
              borderRadius: 14,
              padding: '16px 18px',
              border: `1px solid ${kpi.color}33`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{kpi.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── bottom meta ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
        {[
          { label: 'Chef de projet', value: (projet.chefDeProjet && projet.chefDeProjet.length > 0) ? projet.chefDeProjet.map(u => `${u.prenom} ${u.nom}`).join(', ') : (projet.nomChefDeProjet || '—') },
          { label: 'Début prévu', value: fmtDate(projet.dateDebutPrevue) },
          { label: 'Fin prévue', value: fmtDate(projet.dateFinPrevue) },
          { label: 'Direction métier', value: projet.directionMetier ?? '—' },
        ].map((item) => (
          <div key={item.label}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────── */
export default function CopilPresentationMode() {
  const [projets, setProjets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);

  /* ── fetch ── */
  useEffect(() => {
    api.get('/projets')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data.content ?? []);
        setProjets(list);
        setFiltered(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── filter ── */
  useEffect(() => {
    const f = activeFilter === 'ALL' ? projets : projets.filter((p) => p.statut === activeFilter);
    setFiltered(f);
    setCurrentIdx(0);
  }, [activeFilter, projets]);

  /* ── navigation ── */
  const navigate = useCallback((dir) => {
    setIsEntering(false);
    setTimeout(() => {
      setCurrentIdx((i) => {
        if (dir === 'next') return Math.min(i + 1, filtered.length - 1);
        return Math.max(i - 1, 0);
      });
      setIsEntering(true);
    }, 50);
  }, [filtered.length]);

  /* ── keyboard ── */
  useEffect(() => {
    const handler = (e) => {
      if (!showPresentation) return;
      if (e.key === 'ArrowRight') navigate('next');
      if (e.key === 'ArrowLeft') navigate('prev');
      if (e.key === 'Escape') exitPresentation();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showPresentation, navigate]);

  /* ── fullscreen ── */
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const enterPresentation = () => {
    setShowPresentation(true);
    setIsEntering(true);
    document.documentElement.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
  };

  const exitPresentation = () => {
    setShowPresentation(false);
    if (document.fullscreenElement) document.exitFullscreen?.();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  const current = filtered[currentIdx];

  /* ─── loading state ─── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #6B9B2D', borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── presentation overlay ─── */
  if (showPresentation) {
    return (
      <div
        className="copil-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0a0f1a',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Inter', sans-serif",
          userSelect: 'none',
        }}
      >
        {/* ── top bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}
        >
          {/* CDG branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2D4A5C, #6B9B2D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>CDG</span>
            </div>
            <span style={{ color: '#475569', fontSize: 12, fontWeight: 600 }}>Référentiel SI — Mode COPIL</span>
          </div>

          {/* filter chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: `1px solid ${activeFilter === f.key ? '#6B9B2D' : 'rgba(255,255,255,0.1)'}`,
                  background: activeFilter === f.key ? '#6B9B2D22' : 'transparent',
                  color: activeFilter === f.key ? '#6B9B2D' : '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleFullscreen} style={iconBtn}>
              {isFullscreen ? <Minimize2 size={16} color="#94a3b8" /> : <Maximize2 size={16} color="#94a3b8" />}
            </button>
            <button onClick={exitPresentation} style={{ ...iconBtn, background: '#ef444422', border: '1px solid #ef444444' }}>
              <X size={16} color="#ef4444" />
            </button>
          </div>
        </div>

        {/* ── main slide area ── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 60px', position: 'relative', overflow: 'hidden' }}>
          {/* background decoration */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '120%', height: '120%', background: 'radial-gradient(ellipse at center, #2D4A5C18 0%, transparent 70%)', pointerEvents: 'none' }} />

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569' }}>
              <MonitorPlay size={48} style={{ marginBottom: 16, opacity: 0.5 }} color="#475569" />
              <p style={{ fontSize: 16 }}>Aucun projet pour ce filtre</p>
            </div>
          ) : current ? (
            <ProjectSlide projet={current} index={currentIdx} total={filtered.length} isEntering={isEntering} />
          ) : null}

          {/* prev/next arrows */}
          {filtered.length > 1 && (
            <>
              <button
                onClick={() => navigate('prev')}
                disabled={currentIdx === 0}
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  ...navBtn,
                  opacity: currentIdx === 0 ? 0.3 : 1,
                }}
              >
                <ChevronLeft size={28} color="#fff" />
              </button>
              <button
                onClick={() => navigate('next')}
                disabled={currentIdx === filtered.length - 1}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  ...navBtn,
                  opacity: currentIdx === filtered.length - 1 ? 0.3 : 1,
                }}
              >
                <ChevronRight size={28} color="#fff" />
              </button>
            </>
          )}
        </div>

        {/* ── bottom bar: counter + dots ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 28px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            gap: 16,
            flexShrink: 0,
          }}
        >
          {/* dots */}
          <div style={{ display: 'flex', gap: 6 }}>
            {filtered.slice(0, Math.min(filtered.length, 20)).map((_, i) => (
              <button
                key={i}
                onClick={() => { setIsEntering(false); setTimeout(() => { setCurrentIdx(i); setIsEntering(true); }, 50); }}
                style={{
                  width: i === currentIdx ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === currentIdx ? '#6B9B2D' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>
          {/* counter */}
          <span style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>
            <span style={{ color: '#fff', fontSize: 18 }}>{currentIdx + 1}</span>
            <span style={{ color: '#475569', fontSize: 14 }}> / {filtered.length}</span>
          </span>
        </div>

        <style>{`
          @keyframes copilSlideIn {
            from { opacity: 0; transform: translateX(40px) scale(0.97); }
            to   { opacity: 1; transform: translateX(0) scale(1); }
          }
          @keyframes shimmer {
            0%   { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(107,155,45,0); }
            50% { box-shadow: 0 0 0 8px rgba(107,155,45,0.2); }
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  /* ─── normal page (pre-launch) ─── */
  return (
    <div style={{ padding: '32px 32px 48px', fontFamily: "'Inter', sans-serif", background: '#f1f5f8', minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0f1a 0%, #2D4A5C 60%, #1a2f1a 100%)',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: '#6B9B2D11' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ background: '#6B9B2D22', borderRadius: 10, padding: 8 }}>
              <MonitorPlay size={22} color="#6B9B2D" />
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Mode Présentation COPIL</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            Présentation immersive plein écran pour réunions COPIL — navigation clavier ou souris
          </p>
        </div>
      </div>

      {/* Launch card */}
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: '40px 32px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          maxWidth: 560,
          margin: '0 auto 32px',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #0a0f1a, #2D4A5C)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 32px rgba(45,74,92,0.3)',
          }}
        >
          <MonitorPlay size={36} color="#fff" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Lancer la présentation</h2>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
          Affiche {projets.length} projets en mode plein écran immersif.<br />
          Naviguez avec ← → ou cliquez sur les flèches. Appuyez sur <kbd style={{ background: '#f1f5f8', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 6px', fontSize: 12 }}>Échap</kbd> pour quitter.
        </p>

        {/* filter chips */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          {FILTERS.map((f) => {
            const count = f.key === 'ALL' ? projets.length : projets.filter((p) => p.statut === f.key).length;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  border: `1.5px solid ${activeFilter === f.key ? '#2D4A5C' : '#e2e8f0'}`,
                  background: activeFilter === f.key ? '#2D4A5C' : '#f8fafc',
                  color: activeFilter === f.key ? '#fff' : '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        <button
          onClick={enterPresentation}
          style={{
            padding: '14px 40px',
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #2D4A5C, #0a0f1a)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 6px 24px rgba(45,74,92,0.3)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(45,74,92,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(45,74,92,0.3)'; }}
        >
          <MonitorPlay size={18} />
          Lancer la présentation ({filtered.length} projets)
        </button>
      </div>

      {/* project grid preview */}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#64748b', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Aperçu — {filtered.length} projets
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {filtered.map((p, i) => {
          const hc = healthConfig[p.sante ?? 'VERT'] ?? healthConfig['VERT'];
          const sc = statusColors[p.statut] ?? { bg: '#f1f5f8', color: '#64748b', label: p.statut };
          return (
            <div
              key={p.id}
              onClick={() => { setCurrentIdx(i); enterPresentation(); }}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '14px 16px',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, background: '#f1f5f8', padding: '2px 8px', borderRadius: 12 }}>{p.code}</span>
                <span style={{ marginLeft: 'auto', fontSize: 16 }}>{hc.emoji}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, lineHeight: 1.3 }}>{p.nom}</div>
              <div style={{ height: 6, background: '#f1f5f8', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${p.tauxAvancement ?? 0}%`, background: '#6B9B2D', borderRadius: 3 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#6B9B2D', fontWeight: 700 }}>{p.tauxAvancement ?? 0}%</span>
                <span style={{ fontSize: 11, background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{sc.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes copilSlideIn {
          from { opacity: 0; transform: translateX(40px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

/* ─── style helpers ──────────────────────────────────────── */
const iconBtn = {
  width: 36,
  height: 36,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const navBtn = {
  width: 52,
  height: 52,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.2s',
};
