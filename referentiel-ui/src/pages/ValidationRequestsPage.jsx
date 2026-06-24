import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useKeycloak } from '../KeycloakProvider';
import {
  ShieldCheck,
  ShieldX,
  Trash2,
  DollarSign,
  Shield,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  Layers,
  ClipboardList,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────── */
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ACTION_CONFIG = {
  CLOTURE_PROJET: {
    icon: ShieldX,
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    label: 'Clôture de projet',
  },
  SUPPRESSION_DOCUMENT: {
    icon: Trash2,
    color: '#f97316',
    bg: '#fff7ed',
    border: '#fed7aa',
    label: 'Suppression de document',
  },
  MODIFICATION_BUDGET: {
    icon: DollarSign,
    color: '#8b5cf6',
    bg: '#faf5ff',
    border: '#ddd6fe',
    label: 'Modification budgétaire',
  },
  VALIDATION_PHASE: {
    icon: Layers,
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    label: 'Modification des phases',
  },
  MODIFICATION_TACHES: {
    icon: ClipboardList,
    color: '#06b6d4',
    bg: '#ecfeff',
    border: '#c5f2f7',
    label: 'Modification des tâches/actions',
  },
  DEFAULT: {
    icon: Shield,
    color: '#2D4A5C',
    bg: '#f1f5f8',
    border: '#e2e8f0',
    label: 'Demande de validation',
  },
};

const STATUS_CONFIG = {
  PENDING: { label: 'En attente', bg: '#fff7ed', color: '#f97316', border: '#fed7aa', icon: Clock },
  APPROVED: { label: 'Approuvé', bg: '#f0fdf4', color: '#6B9B2D', border: '#bbf7d0', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', bg: '#fef2f2', color: '#ef4444', border: '#fecaca', icon: ShieldX },
};

/* ─── reject modal ────────────────────────────────────────── */
function RejectModal({ onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        right: 0,
        width: 300,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        border: '1px solid #fecaca',
        padding: '16px',
        zIndex: 100,
        animation: 'fadeUp 0.2s ease both',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <ShieldX size={14} /> Motif de rejet
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Précisez la raison du rejet…"
        rows={3}
        style={{
          width: '100%',
          padding: '8px 10px',
          borderRadius: 8,
          border: '1.5px solid #fecaca',
          fontSize: 13,
          resize: 'none',
          fontFamily: 'inherit',
          outline: 'none',
          color: '#1e293b',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => { e.target.style.borderColor = '#ef4444'; }}
        onBlur={(e) => { e.target.style.borderColor = '#fecaca'; }}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '8px 0',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#64748b',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Annuler
        </button>
        <button
          onClick={() => reason.trim() && onConfirm(reason.trim())}
          disabled={!reason.trim()}
          style={{
            flex: 2,
            padding: '8px 0',
            borderRadius: 8,
            border: 'none',
            background: reason.trim() ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#e2e8f0',
            color: reason.trim() ? '#fff' : '#94a3b8',
            fontSize: 12,
            fontWeight: 700,
            cursor: reason.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          Confirmer le rejet
        </button>
      </div>
    </div>
  );
}

/* ─── request card ────────────────────────────────────────── */
function RequestCard({ request, onApprove, onReject, isPending }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const actionCfg = ACTION_CONFIG[request.actionType] ?? ACTION_CONFIG.DEFAULT;
  const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG['PENDING'];
  const ActionIcon = actionCfg.icon;
  const StatusIcon = statusCfg.icon;

  const handleApprove = async () => {
    setLoading(true);
    try { await onApprove(request.id); } finally { setLoading(false); }
  };

  const handleReject = async (reason) => {
    setLoading(true);
    setShowRejectModal(false);
    try { await onReject(request.id, reason); } finally { setLoading(false); }
  };

  return (
    <div
      className="validation-card"
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e2e8f0',
        padding: '20px 22px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        position: 'relative',
        transition: 'all 0.2s',
        borderLeft: `4px solid ${actionCfg.color}`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* action icon */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: actionCfg.bg,
            border: `1px solid ${actionCfg.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ActionIcon size={20} color={actionCfg.color} />
        </div>

        {/* content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: actionCfg.color }}>{actionCfg.label}</span>
            {request.projetCode && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#f1f5f8',
                  color: '#64748b',
                  padding: '2px 8px',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  letterSpacing: '0.04em',
                }}
              >
                {request.projetCode}
              </span>
            )}
            {/* status badge */}
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                fontWeight: 700,
                background: statusCfg.bg,
                color: statusCfg.color,
                border: `1px solid ${statusCfg.border}`,
                padding: '3px 10px',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <StatusIcon size={11} />
              {statusCfg.label}
            </span>
          </div>

          {/* project name */}
          {request.projetNom && (
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>{request.projetNom}</div>
          )}

          {/* description */}
          {request.actionDescription && (
            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 10px', lineHeight: 1.5 }}>{request.actionDescription}</p>
          )}

          {/* requested by + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#94a3b8', marginBottom: isPending ? 14 : 0, flexWrap: 'wrap' }}>
            <span>
              📋 Demandé par <strong style={{ color: '#64748b' }}>{request.requestedByUserName ?? '—'}</strong>
            </span>
            <span>• {fmtDate(request.requestedAt)}</span>
          </div>

          {/* resolved info */}
          {!isPending && request.validatedByUserName && (
            <div
              style={{
                fontSize: 12,
                color: '#94a3b8',
                background: '#f8fafc',
                borderRadius: 8,
                padding: '8px 10px',
                marginTop: 8,
                borderTop: '1px solid #f1f5f8',
              }}
            >
              {request.status === 'APPROVED' ? '✅' : '❌'} Traité par{' '}
              <strong style={{ color: '#64748b' }}>{request.validatedByUserName}</strong>
              {' '}— {fmtDate(request.resolvedAt)}
              {request.rejectionReason && (
                <div style={{ marginTop: 4, color: '#ef4444', fontStyle: 'italic' }}>
                  Motif : {request.rejectionReason}
                </div>
              )}
            </div>
          )}

          {/* action buttons (pending only) */}
          {isPending && (
            <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
              <button
                onClick={handleApprove}
                disabled={loading}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: loading ? '#e2e8f0' : 'linear-gradient(135deg, #6B9B2D, #5a8424)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: loading ? 'none' : '0 3px 10px rgba(107,155,45,0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <Check size={13} /> Approuver
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowRejectModal((v) => !v)}
                  disabled={loading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    border: '1.5px solid #fecaca',
                    background: '#fff',
                    color: '#ef4444',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <X size={13} /> Rejeter
                </button>
                {showRejectModal && (
                  <RejectModal
                    onConfirm={handleReject}
                    onCancel={() => setShowRejectModal(false)}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── empty state ─────────────────────────────────────────── */
function EmptyState({ message }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#94a3b8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #f1f5f8, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Shield size={32} color="#cbd5e1" />
      </div>
      <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', margin: 0 }}>{message}</p>
      <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Les demandes apparaîtront ici lorsqu'elles seront disponibles</p>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────── */
export default function ValidationRequestsPage() {
  const { userInfo } = useKeycloak();

  const [activeTab, setActiveTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [mine, setMine] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingMine, setLoadingMine] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  /* ── fetch pending ── */
  const fetchPending = () => {
    setLoadingPending(true);
    api.get('/validation-requests/pending')
      .then((r) => setPending(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError('Erreur lors du chargement des demandes en attente'))
      .finally(() => setLoadingPending(false));
  };

  /* ── fetch mine ── */
  const fetchMine = () => {
    setLoadingMine(true);
    api.get('/validation-requests/mine')
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setMine(list);
        setHistory(list.filter((item) => item.status !== 'PENDING'));
      })
      .catch(() => setError('Erreur lors du chargement de vos demandes'))
      .finally(() => setLoadingMine(false));
  };

  useEffect(() => {
    fetchPending();
    fetchMine();
  }, []);

  /* ── approve ── */
  const handleApprove = async (id) => {
    try {
      await api.put(`/validation-requests/${id}/approve`, {
        validatedByUserId: userInfo?.id,
        validatedByUserName: `${userInfo?.prenom ?? ''} ${userInfo?.nom ?? ''}`.trim(),
      });
      setSuccessMsg('✅ Demande approuvée avec succès');
      fetchPending();
      fetchMine();
    } catch {
      setError('Erreur lors de l\'approbation');
    } finally {
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  /* ── reject ── */
  const handleReject = async (id, reason) => {
    try {
      await api.put(`/validation-requests/${id}/reject`, {
        validatedByUserId: userInfo?.id,
        validatedByUserName: `${userInfo?.prenom ?? ''} ${userInfo?.nom ?? ''}`.trim(),
        rejectionReason: reason,
      });
      setSuccessMsg('✅ Demande rejetée');
      fetchPending();
      fetchMine();
    } catch {
      setError('Erreur lors du rejet');
    } finally {
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  /* ── tab data ── */
  const tabData = { pending, mine, history };
  const activeList = tabData[activeTab] ?? [];
  const isLoading = activeTab === 'pending' ? loadingPending : loadingMine;

  const tabs = [
    { key: 'pending', label: 'En attente', count: pending.length, icon: Clock, color: '#f97316' },
    { key: 'mine', label: 'Mes demandes', count: mine.length, icon: Shield, color: '#2D4A5C' },
    { key: 'history', label: 'Historique', count: history.length, icon: CheckCircle, color: '#6B9B2D' },
  ];

  /* ─── render ─────────────────────────────── */
  return (
    <div style={{ padding: '32px 32px 48px', fontFamily: "'Inter', sans-serif", background: '#f1f5f8', minHeight: '100vh' }}>

      {/* ─ header ─ */}
      <div
        style={{
          background: 'linear-gradient(135deg, #2D4A5C 0%, #1a2f3d 60%, #3a2f5a 100%)',
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: '#8b5cf622' }} />
        <div style={{ position: 'absolute', bottom: -20, right: 100, width: 100, height: 100, borderRadius: '50%', background: '#ffffff08' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ background: '#8b5cf622', borderRadius: 10, padding: 8 }}>
              <ShieldCheck size={22} color="#a78bfa" />
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Demandes de validation</h1>
            {pending.length > 0 && (
              <span
                style={{
                  background: '#f97316',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: 20,
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              >
                {pending.length} en attente
              </span>
            )}
          </div>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
            Gérez les demandes d'actions sensibles nécessitant une validation
          </p>
        </div>
      </div>

      {/* ─ notifications ─ */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: '#ef4444',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={15} />
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
            <X size={14} />
          </button>
        </div>
      )}
      {successMsg && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: '#6B9B2D',
            fontWeight: 600,
          }}
        >
          <CheckCircle size={15} />
          {successMsg}
        </div>
      )}

      {/* ─ tabs ─ */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          background: '#fff',
          borderRadius: 14,
          padding: 6,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          marginBottom: 20,
          width: 'fit-content',
        }}
      >
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                border: 'none',
                background: isActive ? tab.color : 'transparent',
                color: isActive ? '#fff' : '#64748b',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                transition: 'all 0.2s',
                boxShadow: isActive ? `0 3px 12px ${tab.color}44` : 'none',
              }}
            >
              <TabIcon size={14} />
              {tab.label}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f8',
                  color: isActive ? '#fff' : '#94a3b8',
                  padding: '1px 7px',
                  borderRadius: 10,
                  minWidth: 20,
                  textAlign: 'center',
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─ content ─ */}
      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid #6B9B2D', borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#64748b' }}>Chargement…</span>
        </div>
      ) : activeList.length === 0 ? (
        <EmptyState
          message={
            activeTab === 'pending'
              ? 'Aucune demande en attente'
              : activeTab === 'mine'
              ? 'Vous n\'avez pas encore de demandes'
              : 'Aucun historique disponible'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activeList.length} demande{activeList.length > 1 ? 's' : ''}
            </h3>
            {activeTab === 'pending' && (
              <button
                onClick={fetchPending}
                style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                🔄 Actualiser
              </button>
            )}
          </div>

          {activeList.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              isPending={activeTab === 'pending' && req.status === 'PENDING'}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
