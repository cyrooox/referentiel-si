import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Smartphone, KeyRound, RefreshCw, ArrowRight, LogOut, Copy, CheckCheck, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const TotpSetup = ({ email, onActivated, onLogout }) => {
  const [step, setStep] = useState('loading'); // 'loading' | 'scan' | 'verify' | 'success'
  const [otpAuthUri, setOtpAuthUri] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Charger la clé TOTP au montage
  useEffect(() => {
    const fetchSetup = async () => {
      try {
        const res = await api.post('/auth/totp/setup', { email });
        setOtpAuthUri(res.data.otpAuthUri);
        setSecret(res.data.secret);
        setStep('scan');
      } catch (err) {
        setError("Erreur lors de la génération du QR Code. Veuillez réessayer.");
        setStep('scan');
      }
    };
    fetchSetup();
  }, [email]);

  const handleChange = (index, value) => {
    const char = value.slice(-1);
    if (!/^\d*$/.test(char)) return;
    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);
    setError('');
    if (char !== '' && index < 5) {
      document.getElementById(`totp-input-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      document.getElementById(`totp-input-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pasted)) return;
    setCode(pasted.split(''));
    document.getElementById('totp-input-5')?.focus();
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Veuillez saisir le code à 6 chiffres affiché dans Microsoft Authenticator.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/totp/activate', { email, code: fullCode });
      setStep('success');
      setTimeout(() => onActivated(res.data), 1500);
    } catch (err) {
      setError(err.response?.data || 'Code incorrect. Vérifiez que votre appareil est bien synchronisé.');
      setCode(['', '', '', '', '', '']);
      document.getElementById('totp-input-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Formater la clé secrète en groupes de 4 pour la lisibilité
  const formatSecret = (s) => s ? s.match(/.{1,4}/g)?.join(' ') : '';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #0f3460 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Particules de fond */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: i % 2 === 0 ? 'rgba(99,102,241,0.06)' : 'rgba(59,130,246,0.06)',
            width: `${150 + i * 80}px`,
            height: `${150 + i * 80}px`,
            top: `${10 + i * 15}%`,
            left: `${5 + i * 14}%`,
            filter: 'blur(60px)',
          }} />
        ))}
      </div>

      <div style={{
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: '24px',
        padding: '2.5rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
        position: 'relative',
        zIndex: 10,
      }}>

        {/* En-tête */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '72px', height: '72px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.2))',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: '20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 0 30px rgba(99,102,241,0.2)',
          }}>
            <ShieldCheck size={36} color="#818cf8" />
          </div>

          <h1 style={{ color: '#f1f5f9', fontSize: '1.6rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Configuration 2FA
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.6 }}>
            Sécurisez votre compte avec <strong style={{ color: '#818cf8' }}>Microsoft Authenticator</strong>
          </p>
        </div>

        {/* ── ÉTAPE 1 : Loading ─────────────────────────────── */}
        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <RefreshCw size={32} color="#818cf8" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            <p style={{ color: '#64748b', marginTop: '1rem', fontSize: '0.875rem' }}>
              Génération de votre clé sécurisée...
            </p>
          </div>
        )}

        {/* ── ÉTAPE 2 : Scan QR Code ────────────────────────── */}
        {step === 'scan' && (
          <div>
            {/* Instructions */}
            <div style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
            }}>
              {[
                { icon: <Smartphone size={16} />, text: 'Ouvrez Microsoft Authenticator sur votre téléphone' },
                { icon: <KeyRound size={16} />, text: 'Appuyez sur "+" → "Compte professionnel ou scolaire"' },
                { icon: <ShieldCheck size={16} />, text: 'Scannez le QR Code ci-dessous' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: i < 2 ? '0.75rem' : 0 }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: 'rgba(99,102,241,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#818cf8', flexShrink: 0,
                  }}>{item.icon}</div>
                  <span style={{ color: '#cbd5e1', fontSize: '0.8rem', lineHeight: 1.4 }}>{item.text}</span>
                </div>
              ))}
            </div>

            {/* QR Code */}
            {otpAuthUri && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  padding: '16px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 0 0 1px rgba(99,102,241,0.2), 0 8px 32px rgba(0,0,0,0.3)',
                }}>
                  <QRCodeSVG
                    value={otpAuthUri}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              </div>
            )}

            {/* Clé manuelle */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                Ou saisissez cette clé manuellement :
              </p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(15,23,42,0.8)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
              }}>
                <code style={{
                  flex: 1, color: '#818cf8',
                  fontSize: '0.875rem', fontFamily: 'monospace',
                  letterSpacing: '0.1em', wordBreak: 'break-all',
                }}>
                  {formatSecret(secret)}
                </code>
                <button
                  onClick={handleCopySecret}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: copied ? '#34d399' : '#64748b',
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.2s',
                    padding: '4px',
                  }}
                  title="Copier la clé"
                >
                  {copied ? <CheckCheck size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => { setStep('verify'); setError(''); }}
              style={{
                width: '100%', padding: '0.875rem',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', border: 'none', borderRadius: '12px',
                fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                transition: 'all 0.2s',
              }}
            >
              J'ai scanné le QR Code <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── ÉTAPE 3 : Saisir le code de confirmation ─────── */}
        {step === 'verify' && (
          <form onSubmit={handleActivate}>
            <div style={{
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.15)',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'center',
            }}>
              <Smartphone size={20} color="#818cf8" style={{ margin: '0 auto 0.5rem' }} />
              <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: 0 }}>
                Ouvrez <strong style={{ color: '#818cf8' }}>Microsoft Authenticator</strong> et saisissez le code à 6 chiffres affiché pour <em>Référentiel SI</em>
              </p>
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '12px', padding: '0.875rem 1rem',
                marginBottom: '1.25rem',
              }}>
                <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ color: '#fca5a5', fontSize: '0.8rem' }}>{error}</span>
              </div>
            )}

            {/* Inputs code */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }} onPaste={handlePaste}>
              {code.map((digit, idx) => (
                <input
                  key={idx}
                  id={`totp-input-${idx}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  autoFocus={idx === 0}
                  style={{
                    width: '52px', height: '60px',
                    textAlign: 'center', fontSize: '1.5rem', fontWeight: 700,
                    color: '#f1f5f9',
                    background: digit ? 'rgba(99,102,241,0.15)' : 'rgba(15,23,42,0.8)',
                    border: `1.5px solid ${digit ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.15)'}`,
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.15s',
                    fontFamily: 'monospace',
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || code.includes('')}
              style={{
                width: '100%', padding: '0.875rem',
                background: loading || code.includes('') ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#fff', border: 'none', borderRadius: '12px',
                fontSize: '0.9rem', fontWeight: 600,
                cursor: loading || code.includes('') ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
                transition: 'all 0.2s',
                marginBottom: '0.75rem',
              }}
            >
              {loading ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Vérification...' : 'Activer le 2FA'}
              {!loading && <ShieldCheck size={16} />}
            </button>

            <button
              type="button"
              onClick={() => setStep('scan')}
              style={{
                width: '100%', padding: '0.625rem',
                background: 'transparent', color: '#64748b',
                border: '1px solid rgba(99,102,241,0.1)',
                borderRadius: '10px', fontSize: '0.8rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              ← Revenir au QR Code
            </button>
          </form>
        )}

        {/* ── ÉTAPE 4 : Succès ─────────────────────────────── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(52,211,153,0.15)',
              border: '1px solid rgba(52,211,153,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              boxShadow: '0 0 30px rgba(52,211,153,0.2)',
            }}>
              <CheckCheck size={28} color="#34d399" />
            </div>
            <h3 style={{ color: '#34d399', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              2FA activé avec succès !
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
              Redirection vers l'application...
            </p>
          </div>
        )}

        {/* Bouton déconnexion */}
        {step !== 'success' && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button
              onClick={onLogout}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: '#475569', fontSize: '0.75rem',
                display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                transition: 'color 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
              onMouseOut={e => e.currentTarget.style.color = '#475569'}
            >
              <LogOut size={13} /> Se déconnecter
            </button>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default TotpSetup;
