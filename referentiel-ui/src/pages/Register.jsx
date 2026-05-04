import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, Mail, ShieldAlert } from 'lucide-react';
import api from '../api/axios';

const Register = () => {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    motDePasse: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    // Validation du mot de passe côté frontend
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!regex.test(formData.motDePasse)) {
      setError('Le mot de passe doit contenir au moins 8 caractères, une lettre, un chiffre et un caractère spécial.');
      return;
    }

    setLoading(true);
    
    try {
      await api.post('/auth/register', formData);
      setSuccessMsg('Votre demande de création de compte a été envoyée ! Un administrateur doit valider votre accès avant que vous puissiez vous connecter.');
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    } catch (err) {
      if (err.response && err.response.data && typeof err.response.data === 'string') {
        setError(err.response.data);
      } else {
        setError("Erreur critique lors de l'inscription.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 py-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center flex flex-col items-center">
          <img src="/logo.png" alt="CDG Logo" className="h-16 object-contain mb-4" />
          <h2 className="text-2xl font-bold text-slate-800">Créer un compte</h2>
          <p className="mt-2 text-sm text-slate-500">Rejoignez le Référentiel SI</p>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}
        
        {successMsg && (
          <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-200">
            {successMsg}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleRegister}>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nom</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm outline-none"
                  placeholder=""
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Prénom</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm outline-none"
                  placeholder=""
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Adresse Email</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Mail className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm outline-none"
                placeholder="exemple@cdg.ma"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700">Mot de passe</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Lock className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type="password"
                name="motDePasse"
                value={formData.motDePasse}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            <p className="text-xs text-slate-500 mt-1 mt-2">
              Au moins 8 caractères, une lettre, un chiffre et un caractère spécial.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 mt-6 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Inscription en cours...' : "S'inscrire"}
          </button>
          
          <div className="text-center mt-4">
            <span className="text-sm text-slate-600">Déjà un compte ? </span>
            <Link to="/login" className="text-sm font-medium text-primary-600 hover:text-primary-500">
              Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
