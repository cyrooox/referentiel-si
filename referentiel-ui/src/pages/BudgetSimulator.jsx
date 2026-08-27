import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useKeycloak } from '../KeycloakProvider';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle,
  RotateCcw,
  Save,
  BarChart2,
  ChevronDown,
  Loader2,
  Info,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n) =>
  new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  }).format(n ?? 0);

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const addMonths = (isoStr, months) => {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

/* ─── sub-components ─────────────────────────────────────── */
function Slider({ label, min, max, step = 1, value, onChange, formatValue, color = '#6B9B2D' }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{label}</span>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: value < 0 ? '#ef4444' : '#6B9B2D',
            background: value < 0 ? '#fef2f2' : '#f0fdf4',
            padding: '2px 10px',
            borderRadius: 20,
            border: `1px solid ${value < 0 ? '#fecaca' : '#bbf7d0'}`,
          }}
        >
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <div style={{ position: 'relative', height: 8, background: '#e2e8f0', borderRadius: 4 }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            borderRadius: 4,
            transition: 'width 0.15s ease',
          }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="simulator-slider"
        style={{
          width: '100%',
          marginTop: 4,
          accentColor: color,
          cursor: 'pointer',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{formatValue ? formatValue(min) : min}</span>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color = '#2D4A5C', bg = '#f1f5f8' }) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: color + '18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function RiskGauge({ level }) {
  const config = {
    Faible: { color: '#6B9B2D', bg: '#f0fdf4', pct: 25, text: '🟢 Faible' },
    Modéré: { color: '#f59e0b', bg: '#fffbeb', pct: 60, text: '🟡 Modéré' },
    Élevé: { color: '#ef4444', bg: '#fef2f2', pct: 90, text: '🔴 Élevé' },
  };
  const c = config[level] ?? config['Modéré'];
  return (
    <div
      style={{
        background: c.bg,
        borderRadius: 12,
        padding: '14px 16px',
        border: `1px solid ${c.color}33`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Niveau de risque</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{c.text}</span>
      </div>
      <div style={{ height: 10, background: '#e2e8f0', borderRadius: 5, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${c.pct}%`,
            background: `linear-gradient(90deg, ${c.color}88, ${c.color})`,
            borderRadius: 5,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {['Faible', 'Modéré', 'Élevé'].map((l) => (
          <span key={l} style={{ fontSize: 10, color: '#94a3b8' }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function CompareBar({ label, beforeVal, afterVal, max }) {
  const bPct = max > 0 ? Math.min((beforeVal / max) * 100, 100) : 0;
  const aPct = max > 0 ? Math.min((afterVal / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>AVANT</div>
          <div style={{ height: 12, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            <div
              className="compare-bar"
              style={{
                height: '100%',
                width: `${bPct}%`,
                background: 'linear-gradient(90deg, #2D4A5C88, #2D4A5C)',
                borderRadius: 6,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 3, fontWeight: 600 }}>{fmt(beforeVal)}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 3 }}>APRÈS</div>
          <div style={{ height: 12, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
            <div
              className="compare-bar"
              style={{
                height: '100%',
                width: `${aPct}%`,
                background: 'linear-gradient(90deg, #6B9B2D88, #6B9B2D)',
                borderRadius: 6,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#6B9B2D', marginTop: 3, fontWeight: 600 }}>{fmt(afterVal)}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────── */
export default function BudgetSimulator() {
  const { userInfo } = useKeycloak();

  const [projets, setProjets] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [projet, setProjet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // sliders
  const [budgetDelta, setBudgetDelta] = useState(0);      // absolute MAD delta
  const [decalage, setDecalage] = useState(0);            // months
  const [tauxMensuel, setTauxMensuel] = useState(0);      // %

  /* ── fetch project list ── */
  useEffect(() => {
    setLoading(true);
    api.get('/projets')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : (r.data.content ?? []);
        setProjets(list);
        if (list.length > 0) setSelectedId(String(list[0].id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── fetch selected project ── */
  useEffect(() => {
    if (!selectedId) { setProjet(null); return; }
    api.get(`/projets/${selectedId}`)
      .then((r) => setProjet(r.data))
      .catch(console.error);
  }, [selectedId]);

  /* ── computed simulation ── */
  const sim = useCallback(() => {
    if (!projet) return null;
    const init = projet.budgetInitial ?? 0;
    const conso = projet.budgetConsomme ?? 0;
    const newTotal = Math.max(0, init + budgetDelta);
    const moisRestants = (() => {
      if (!projet.dateFinPrevue) return 6;
      const now = new Date();
      const fin = new Date(projet.dateFinPrevue);
      return Math.max(0, (fin.getFullYear() - now.getFullYear()) * 12 + (fin.getMonth() - now.getMonth()));
    })();
    const projectedConso = conso + (tauxMensuel / 100) * newTotal * (moisRestants + decalage);
    const surplus = newTotal - projectedConso;
    const newEndDate = addMonths(projet.dateFinPrevue, decalage);
    const overshoot = projectedConso > newTotal;
    const overPct = newTotal > 0 ? (projectedConso / newTotal) * 100 : 0;
    const risk = overPct > 90 ? 'Élevé' : overPct > 70 ? 'Modéré' : 'Faible';
    return { newTotal, projectedConso, surplus, newEndDate, overshoot, risk };
  }, [projet, budgetDelta, decalage, tauxMensuel]);

  const result = sim();

  /* ── reset ── */
  const reset = () => {
    setBudgetDelta(0);
    setDecalage(0);
    setTauxMensuel(0);
  };

  /* ── apply ── */
  const apply = async () => {
    if (!projet || !result) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await api.put(`/projets/${projet.id}`, {
        ...projet,
        budgetInitial: result.newTotal,
        dateFinPrevue: result.newEndDate ?? projet.dateFinPrevue,
      });
      setSaveMsg('✅ Modifications appliquées avec succès');
      setProjet((p) => ({ ...p, budgetInitial: result.newTotal, dateFinPrevue: result.newEndDate ?? p.dateFinPrevue }));
      reset();
    } catch {
      setSaveMsg('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  /* ── budget delta range ── */
  const maxDelta = projet ? projet.budgetInitial ?? 500000 : 500000;
  const minDelta = projet ? -Math.round((projet.budgetInitial ?? 0) * 0.5) : -250000;

  /* ─── render ─────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid #6B9B2D', borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
        <span style={{ color: '#64748b', fontSize: 14 }}>Chargement du simulateur…</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 32px 48px', fontFamily: "'Inter', sans-serif", background: '#f1f5f8', minHeight: '100vh' }}>
      {/* ─ Header ─ */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2D4A5C 0%, #1a2f3d 60%, #3a5a3a 100%)',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: '#6B9B2D22' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 120, width: 120, height: 120, borderRadius: '50%', background: '#ffffff0a' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ background: '#6B9B2D22', borderRadius: 10, padding: 8 }}>
              <BarChart2 size={22} color="#6B9B2D" />
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Simulateur Budgétaire</h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Simulez des scénarios budgétaires en temps réel avant de les appliquer
          </p>
        </div>
      </div>

      {/* ─ Project selector ─ */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Projet à simuler
        </label>
        <div style={{ position: 'relative', maxWidth: 480 }}>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 40px 12px 16px',
              borderRadius: 12,
              border: '1.5px solid #e2e8f0',
              background: '#fff',
              fontSize: 14,
              fontWeight: 600,
              color: '#1e293b',
              cursor: 'pointer',
              appearance: 'none',
              outline: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <option value="">— Sélectionner un projet —</option>
            {projets.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.nom}
              </option>
            ))}
          </select>
          <ChevronDown size={16} color="#94a3b8" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {!projet ? (
        <div style={{ textAlign: 'center', color: '#94a3b8', paddingTop: 60, fontSize: 15 }}>
          <BarChart2 size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
          <p>Sélectionnez un projet pour commencer la simulation</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ══ LEFT: project info + sliders ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Current project info */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Info size={16} color="#6B9B2D" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Données actuelles du projet</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <KpiCard icon={DollarSign} label="Budget initial" value={fmt(projet.budgetInitial)} color="#2D4A5C" />
                <KpiCard icon={TrendingUp} label="Budget consommé" value={fmt(projet.budgetConsomme)} color="#f59e0b" bg="#fffbeb" />
                <KpiCard icon={TrendingDown} label="Budget restant" value={fmt(projet.budgetRestant)} color="#6B9B2D" bg="#f0fdf4" />
                <KpiCard icon={BarChart2} label="Taux d'avancement" value={`${projet.tauxAvancement ?? 0}%`} color="#8b5cf6" bg="#faf5ff" />
                <KpiCard icon={Calendar} label="Début prévu" value={fmtDate(projet.dateDebutPrevue)} color="#2D4A5C" />
                <KpiCard icon={Calendar} label="Fin prévue" value={fmtDate(projet.dateFinPrevue)} color="#2D4A5C" />
              </div>
            </div>

            {/* Sliders */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <BarChart2 size={16} color="#6B9B2D" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Paramètres de simulation</h3>
              </div>

              <Slider
                label="Delta budget (MAD)"
                min={minDelta}
                max={Math.round(maxDelta)}
                step={1000}
                value={budgetDelta}
                onChange={setBudgetDelta}
                formatValue={(v) => (v >= 0 ? '+' : '') + fmt(v)}
                color={budgetDelta < 0 ? '#ef4444' : '#6B9B2D'}
              />
              <Slider
                label="Décalage de la date de fin (mois)"
                min={-12}
                max={12}
                value={decalage}
                onChange={setDecalage}
                formatValue={(v) => (v >= 0 ? '+' : '') + v + ' mois'}
                color={decalage < 0 ? '#6B9B2D' : decalage > 0 ? '#f59e0b' : '#64748b'}
              />
              <Slider
                label="Taux de consommation mensuel (%)"
                min={0}
                max={100}
                value={tauxMensuel}
                onChange={setTauxMensuel}
                formatValue={(v) => `${v}%`}
                color="#8b5cf6"
              />

              {/* action buttons */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button
                  onClick={reset}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 10,
                    border: '1.5px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                >
                  <RotateCcw size={14} /> Réinitialiser
                </button>
                <button
                  onClick={apply}
                  disabled={saving}
                  style={{
                    flex: 2,
                    padding: '10px 0',
                    borderRadius: 10,
                    border: 'none',
                    background: saving ? '#94a3b8' : 'linear-gradient(135deg, #6B9B2D, #5a8424)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: saving ? 'none' : '0 4px 14px rgba(107,155,45,0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  {saving ? <Loader2 size={14} style={{ animation: 'spin 0.9s linear infinite' }} /> : <Save size={14} />}
                  {saving ? 'Application…' : 'Appliquer la simulation'}
                </button>
              </div>
              {saveMsg && (
                <div style={{ marginTop: 10, fontSize: 13, textAlign: 'center', color: saveMsg.includes('✅') ? '#6B9B2D' : '#ef4444', fontWeight: 600 }}>
                  {saveMsg}
                </div>
              )}
            </div>
          </div>

          {/* ══ RIGHT: results ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Live results */}
            {result && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #1e293b 0%, #2D4A5C 100%)',
                  borderRadius: 16,
                  padding: '20px 22px',
                  boxShadow: '0 8px 32px rgba(45,74,92,0.25)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TrendingUp size={16} color="#6B9B2D" />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>Résultats de simulation</h3>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#6B9B2D', background: '#6B9B2D22', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>LIVE</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'Nouveau budget total', value: fmt(result.newTotal), color: '#fff' },
                    { label: 'Budget projeté à fin', value: fmt(result.projectedConso), color: '#94a3b8' },
                  ].map((item) => (
                    <div key={item.label} style={{ background: '#ffffff12', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Surplus / Déficit */}
                <div
                  style={{
                    background: result.surplus >= 0 ? '#6B9B2D22' : '#ef444422',
                    borderRadius: 10,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 14,
                    border: `1px solid ${result.surplus >= 0 ? '#6B9B2D44' : '#ef444444'}`,
                  }}
                >
                  {result.surplus >= 0
                    ? <CheckCircle size={22} color="#6B9B2D" />
                    : <AlertTriangle size={22} color="#ef4444" />}
                  <div>
                    <div style={{ fontSize: 10, color: result.surplus >= 0 ? '#6B9B2D' : '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>
                      {result.surplus >= 0 ? 'Surplus budgétaire' : 'Déficit budgétaire'}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: result.surplus >= 0 ? '#6B9B2D' : '#ef4444' }}>
                      {result.surplus >= 0 ? '+' : ''}{fmt(result.surplus)}
                    </div>
                  </div>
                </div>

                {/* New end date */}
                <div style={{ background: '#ffffff12', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <Calendar size={16} color="#94a3b8" />
                  <div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>Nouvelle date de fin</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{fmtDate(result.newEndDate)}</div>
                  </div>
                  {decalage !== 0 && (
                    <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: decalage > 0 ? '#f59e0b' : '#6B9B2D', background: decalage > 0 ? '#f59e0b22' : '#6B9B2D22', padding: '2px 8px', borderRadius: 12 }}>
                      {decalage > 0 ? '+' : ''}{decalage} mois
                    </span>
                  )}
                </div>

                {/* Risk gauge */}
                <div style={{ background: '#ffffff0a', borderRadius: 10, padding: '12px 14px' }}>
                  <RiskGauge level={result.risk} />
                </div>
              </div>
            )}

            {/* Comparison bars */}
            {result && projet && (
              <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                  <BarChart2 size={16} color="#6B9B2D" />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Comparaison AVANT / APRÈS</h3>
                </div>
                <CompareBar
                  label="Budget total (MAD)"
                  beforeVal={projet.budgetInitial ?? 0}
                  afterVal={result.newTotal}
                  max={Math.max(projet.budgetInitial ?? 0, result.newTotal, 1)}
                />
                <CompareBar
                  label="Budget consommé projeté (MAD)"
                  beforeVal={projet.budgetConsomme ?? 0}
                  afterVal={result.projectedConso}
                  max={Math.max(result.newTotal, result.projectedConso, 1)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .simulator-slider { -webkit-appearance: none; appearance: none; height: 4px; outline: none; background: transparent; }
        .simulator-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #2D4A5C; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.15s; }
        .simulator-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .simulator-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #2D4A5C; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2); cursor: pointer; }
      `}</style>
    </div>
  );
}
