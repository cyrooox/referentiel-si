import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell, Clock, AlertCircle, CheckSquare, X, CheckCheck,
  BellOff, Loader2, ChevronDown
} from 'lucide-react';
import api from '../api/axios';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmtRelative = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const isToday = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

const isThisWeek = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  return d > weekAgo && !isToday(dateStr);
};

/* ─── Notification type config ────────────────────────────────────── */
const TYPE_CONFIG = {
  ECHEANCE: {
    icon: <Clock style={{ width: 16, height: 16 }} />,
    color: '#f97316', bg: '#fff7ed', label: 'Échéance',
  },
  BUDGET_DEPASSE: {
    icon: <AlertCircle style={{ width: 16, height: 16 }} />,
    color: '#ef4444', bg: '#fef2f2', label: 'Budget dépassé',
  },
  VALIDATION_REQUISE: {
    icon: <CheckSquare style={{ width: 16, height: 16 }} />,
    color: '#6B9B2D', bg: '#f0fdf4', label: 'Validation',
  },
  GENERAL: {
    icon: <Bell style={{ width: 16, height: 16 }} />,
    color: '#2D4A5C', bg: '#f0f4f8', label: 'Info',
  },
};

const getConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.GENERAL;

/* ─── Notification Item ───────────────────────────────────────────── */
const NotifItem = ({ notif, onDelete, onMarkRead }) => {
  const cfg = getConfig(notif.type);
  const isUnread = !notif.read && !notif.lu;

  return (
    <div
      onClick={() => !notif.read && !notif.lu && onMarkRead(notif.id)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: isUnread ? `${cfg.color}08` : 'transparent',
        borderLeft: isUnread ? `3px solid ${cfg.color}` : '3px solid transparent',
        transition: 'background 0.2s',
        cursor: isUnread ? 'pointer' : 'default',
        position: 'relative',
      }}
      onMouseEnter={e => e.currentTarget.style.background = isUnread ? `${cfg.color}12` : '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.background = isUnread ? `${cfg.color}08` : 'transparent'}
    >
      {/* Unread dot */}
      {isUnread && (
        <div style={{
          position: 'absolute', top: 14, right: 36,
          width: 7, height: 7, borderRadius: '50%',
          background: cfg.color, boxShadow: `0 0 4px ${cfg.color}60`,
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: cfg.bg, color: cfg.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${cfg.color}20`,
      }}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
          <div style={{ fontSize: 13, fontWeight: isUnread ? 700 : 500, color: isUnread ? '#1e293b' : '#334155', lineHeight: 1.3 }}>
            {notif.title || notif.titre || cfg.label}
          </div>
          <span style={{ fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {fmtRelative(notif.createdAt || notif.dateCreation)}
          </span>
        </div>
        {(notif.message || notif.contenu) && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
            {notif.message || notif.contenu}
          </div>
        )}
        {(notif.projectName || notif.projet?.nom) && (
          <div style={{
            fontSize: 10, color: cfg.color, marginTop: 4, fontWeight: 600,
            background: cfg.bg, borderRadius: 4, padding: '1px 6px',
            display: 'inline-block', border: `1px solid ${cfg.color}20`,
          }}>
            {notif.projectName || notif.projet?.nom}
          </div>
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(notif.id); }}
        style={{
          background: 'none', border: 'none', padding: 4, cursor: 'pointer',
          color: '#cbd5e1', borderRadius: 6, flexShrink: 0,
          display: 'flex', alignItems: 'center', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'none'; }}
        title="Supprimer"
      >
        <X style={{ width: 13, height: 13 }} />
      </button>
    </div>
  );
};

/* ─── Section label ──────────────────────────────────────────────── */
const SectionLabel = ({ label, count }) => (
  <div style={{
    padding: '6px 14px 4px',
    fontSize: 10, fontWeight: 700, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1,
    background: '#f8fafc', borderBottom: '1px solid #f1f5f9',
    display: 'flex', justifyContent: 'space-between',
  }}>
    <span>{label}</span>
    <span style={{ background: '#e2e8f0', color: '#64748b', borderRadius: 99, padding: '0 6px', fontWeight: 700 }}>{count}</span>
  </div>
);

/* ─── Main Component ─────────────────────────────────────────────── */
const NotificationPanel = ({ isOpen, onClose, userId }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);

  /* Fetch on open */
  useEffect(() => {
    if (!isOpen) return;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get('/notifications');
        setNotifications(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger les notifications.");
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [isOpen]);

  /* Click outside to close */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  /* Mark all as read */
  const handleMarkAllRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true, lu: true })));
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* Mark one as read */
  const handleMarkRead = useCallback(async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, lu: true } : n));
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* Delete one */
  const handleDelete = useCallback(async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* Group notifications */
  const todayNotifs = notifications.filter(n => isToday(n.createdAt || n.dateCreation));
  const weekNotifs = notifications.filter(n => isThisWeek(n.createdAt || n.dateCreation));
  const olderNotifs = notifications.filter(n => !isToday(n.createdAt || n.dateCreation) && !isThisWeek(n.createdAt || n.dateCreation));
  const unreadCount = notifications.filter(n => !n.read && !n.lu).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop (transparent, closes on click) */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: 64, right: 16,
          width: 380,
          maxHeight: 'min(560px, calc(100vh - 80px))',
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
          border: '1px solid rgba(226,232,240,0.8)',
          zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'notifSlideIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #f1f5f9',
          background: 'linear-gradient(135deg,#2D4A5C,#1a2332)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <Bell style={{ width: 20, height: 20, color: '#e2e8f0' }} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -6, right: -6,
                    background: '#ef4444', color: '#fff',
                    fontSize: 9, fontWeight: 800,
                    width: 16, height: 16, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid #fff',
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>Notifications</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est lu'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'rgba(107,155,45,0.2)', border: '1px solid rgba(107,155,45,0.3)',
                    borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5, color: '#6B9B2D',
                    fontSize: 11, fontWeight: 700, transition: 'all 0.2s',
                  }}
                  title="Tout marquer comme lu"
                >
                  <CheckCheck style={{ width: 13, height: 13 }} /> Tout lire
                </button>
              )}
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: 6, cursor: 'pointer', color: '#94a3b8',
                  display: 'flex', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
              <div style={{ width: 28, height: 28, border: '3px solid #2D4A5C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 13, color: '#94a3b8' }}>Chargement...</span>
            </div>
          ) : error ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#ef4444' }}>
              <AlertCircle style={{ width: 28, height: 28, margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13 }}>{error}</div>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <BellOff style={{ width: 28, height: 28, color: '#cbd5e1' }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Tout est à jour</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Aucune notification pour le moment.</div>
            </div>
          ) : (
            <>
              {todayNotifs.length > 0 && (
                <>
                  <SectionLabel label="Aujourd'hui" count={todayNotifs.length} />
                  {todayNotifs.map(n => (
                    <NotifItem key={n.id} notif={n} onDelete={handleDelete} onMarkRead={handleMarkRead} />
                  ))}
                </>
              )}
              {weekNotifs.length > 0 && (
                <>
                  <SectionLabel label="Cette semaine" count={weekNotifs.length} />
                  {weekNotifs.map(n => (
                    <NotifItem key={n.id} notif={n} onDelete={handleDelete} onMarkRead={handleMarkRead} />
                  ))}
                </>
              )}
              {olderNotifs.length > 0 && (
                <>
                  <SectionLabel label="Plus ancien" count={olderNotifs.length} />
                  {olderNotifs.map(n => (
                    <NotifItem key={n.id} notif={n} onDelete={handleDelete} onMarkRead={handleMarkRead} />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div style={{
            padding: '10px 14px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafbfc',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {notifications.length} notification{notifications.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={async () => {
                try {
                  await Promise.all(notifications.map(n => api.delete(`/notifications/${n.id}`)));
                  setNotifications([]);
                } catch (e) { console.error(e); }
              }}
              style={{
                background: 'none', border: '1px solid #fca5a5', borderRadius: 6,
                padding: '4px 10px', cursor: 'pointer', color: '#ef4444',
                fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default NotificationPanel;
