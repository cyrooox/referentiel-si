import { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Smartphone, RefreshCw, LogOut, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import api from '../api/axios';

const MfaVerification = ({ email, onVerified, onLogout }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');

  const inputRefs = useRef([]);

  // Gérer le décompte du bouton de renvoi
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    // Garder seulement le dernier caractère et s'assurer que c'est un chiffre
    const char = value.slice(-1);
    if (!/^\d*$/.test(char)) return;

    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);
    setError('');

    // Passer au champ suivant si un chiffre a été saisi
    if (char !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Gérer la touche Retour arrière (Backspace)
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) {
      setError('Veuillez coller un code à 6 chiffres valide.');
      return;
    }

    const digits = pastedData.split('');
    setCode(digits);
    setError('');
    // Mettre le focus sur le dernier champ
    inputRefs.current[5].focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) {
      setError('Veuillez saisir le code à 6 chiffres.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await api.post('/auth/totp/verify', {
        email: email,
        code: fullCode
      });
      // Appeler le callback de succès avec les données de l'utilisateur
      onVerified(response.data);
    } catch (err) {
      setError(err.response?.data || 'Le code saisi est incorrect ou expiré.');
      // Réinitialiser les champs
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.post('/auth/mfa/resend', { email: email });
      setSuccessMsg('Un nouveau code a été envoyé à votre adresse email.');
      setResendCooldown(60); // 1 minute de cooldown
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } catch (err) {
      setError('Erreur lors du renvoi du code. Veuillez réessayer.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-4">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Cercles luminescents décoratifs */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center flex flex-col items-center relative z-10">
          <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-inner shadow-blue-500/10">
            <ShieldCheck className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Vérification 2FA</h2>
          <p className="mt-2.5 text-sm text-slate-400 leading-relaxed px-2">
            Ouvrez <span className="text-blue-300 font-semibold">Microsoft Authenticator</span> et saisissez le code à 6 chiffres affiché pour :
          </p>
          <div className="mt-3 py-1.5 px-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-blue-300 text-xs font-semibold font-mono tracking-wide flex items-center justify-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" /> Référentiel SI
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="w-3 h-3" /> Le code change toutes les 30 secondes
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 text-sm text-red-200 bg-red-950/40 border border-red-900/50 rounded-2xl flex items-start gap-3 animate-headShake">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-6 p-4 text-sm text-emerald-200 bg-emerald-950/40 border border-emerald-900/50 rounded-2xl flex items-start gap-3">
            <Mail className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 relative z-10">
          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-xl font-extrabold text-white bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl focus:ring-4 focus:ring-blue-500/20 outline-none transition-all shadow-inner"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading || code.includes('')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-blue-500/10 cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Confirmer la connexion
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-center text-xs font-medium px-1">
              <button
                type="button"
                onClick={onLogout}
                className="text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Annuler la connexion
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MfaVerification;
