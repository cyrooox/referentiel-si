import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FolderPlus, Pencil, Trash2, Calendar, DollarSign, Activity, AlertCircle, Search, Filter, UserPlus, CheckCircle, FileDown, Tag } from 'lucide-react';
import api from '../api/axios';
import { useKeycloak } from '../KeycloakProvider';
import MaturityScoreBar from '../components/MaturityScoreBar';

const ProjectsManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const [projets, setProjets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Nouvelles données de références
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [typesProjet, setTypesProjet] = useState([]);
  const [directions, setDirections] = useState([]);

  // Utilisateur connecté via Keycloak
  const { userInfo } = useKeycloak();
  const currentRole = userInfo?.role;       // 'ADMIN', 'PMO', 'CHEF_PROJET'
  const currentEmail = userInfo?.email;      // email de l'utilisateur connecté
  const isAdmin = currentRole === 'ADMIN';
  const isPmo = currentRole === 'PMO';
  const isChefProjet = currentRole === 'CHEF_PROJET';
  const isMembre = currentRole === 'MEMBRE';

  // Chef de Projet peut éditer uniquement les projets qui lui sont assignés
  // PMO peut éditer tous les projets
  const canEdit = (projet) => {
    if (isAdmin || isPmo) return true;
    if (isChefProjet) {
      // Comparaison insensible à la casse
      return projet.chefDeProjet?.some(u => u.email?.toLowerCase() === currentEmail?.toLowerCase());
    }
    return false;
  };

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState(''); // Pour l'admin

  // Form state pour la modale
  const [newProjet, setNewProjet] = useState({
    nom: '',
    code: '',
    budgetInitial: '',
    phaseCourante: 'Cadrage / Pré-Etude',
    type: '',
    directionMetier: '',
    chefDeProjetId: ''
  });

  // Modal d'assignation rapide
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignProject, setAssignProject] = useState(null);
  const [selectedChefIds, setSelectedChefIds] = useState([]);
  const [searchAssignText, setSearchAssignText] = useState('');

  // Widget Temps Restant
  const [selectedProjectForTimer, setSelectedProjectForTimer] = useState(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const fetchInitialData = async () => {
    try {
      const [resProjets, resUsers, resTypes, resDirs] = await Promise.all([
        api.get('/projets'),
        api.get('/utilisateurs'),
        api.get('/references/categorie/TYPE_PROJET'),
        api.get('/references/categorie/DIRECTION_METIER')
      ]);
      setProjets(resProjets.data);
      setUtilisateurs(resUsers.data);
      setTypesProjet(resTypes.data);
      setDirections(resDirs.data);
    } catch (error) {
      console.error("Erreur de chargement", error);
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
    if (location.state?.openInitModal && (isPmo || isAdmin)) {
      setShowModal(true);
      // Nettoyer le state local sans recharger la page
      window.history.replaceState({}, '')
    }
  }, [location.state]);

  // Téléchargement du rapport PDF
  const handleDownloadRapport = async (e, projet) => {
    e.stopPropagation();
    // PMO → rapport complet (crée et supervise tous les projets, accès financiers)
    // Chef de Projet → rapport opérationnel (accès limité à ses projets assignés)
    const role = currentRole === 'PMO' ? 'PMO' : 'CHEF_PROJET';
    try {
      const response = await api.get(`/projets/${projet.id}/rapport?role=${role}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rapport_${role}_${projet.code}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur génération rapport', err);
      alert('Impossible de générer le rapport.');
    }
  };

  // Live countdown timer
  useEffect(() => {
    if (!selectedProjectForTimer) return;
    const { dateFinPrevue, dateDebutPrevue, dateReelleFin, statut } = selectedProjectForTimer;
    if (statut === 'Terminé' || dateReelleFin || !dateFinPrevue) return;

    const tick = () => {
      const now = new Date();
      const target = new Date(dateFinPrevue);
      // If project hasn't started yet, count down to start
      const start = new Date(dateDebutPrevue);
      const ref = now < start ? start : target;
      const diff = ref - now;
      if (diff <= 0) {
        // For overdue: count how far past
        const absDiff = Math.abs(diff);
        setCountdown({
          days: Math.floor(absDiff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((absDiff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((absDiff / (1000 * 60)) % 60),
          seconds: Math.floor((absDiff / 1000) % 60),
          overdue: now >= target,
          notStarted: false
        });
      } else {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / (1000 * 60)) % 60),
          seconds: Math.floor((diff / 1000) % 60),
          overdue: false,
          notStarted: now < start
        });
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [selectedProjectForTimer]);


  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce projet ?")) {
      try {
        await api.delete(`/projets/${id}`);
        setProjets(projets.filter(p => p.id !== id));
      } catch (error) {
        console.error("Erreur de suppression", error);
      }
    }
  };

  const handleAddMember = async (projet, memberId) => {
    try {
      const selectedUser = utilisateurs.find(u => u.id === memberId);
      if (!selectedUser) return;
      
      const updatedMembres = [...(projet.membres || []), selectedUser];
      const updatedProject = { ...projet, membres: updatedMembres };
      
      await api.put(`/projets/${projet.id}`, updatedProject);
      setProjets(projets.map(p => p.id === projet.id ? updatedProject : p));
    } catch (err) {
      console.error("Erreur d'ajout de membre", err);
      alert("Impossible d'ajouter le membre.");
    }
  };

  const handleRemoveMember = async (projet, memberId) => {
    try {
      const updatedMembres = (projet.membres || []).filter(m => m.id !== memberId);
      const updatedProject = { ...projet, membres: updatedMembres };
      
      await api.put(`/projets/${projet.id}`, updatedProject);
      setProjets(projets.map(p => p.id === projet.id ? updatedProject : p));
    } catch (err) {
      console.error("Erreur de suppression de membre", err);
      alert("Impossible de retirer le membre.");
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nom: newProjet.nom,
        code: '', // Laissé vide pour que le Backend génère PRJ-YYYY-XXX correctement
        budgetInitial: 0,
        budgetConsomme: 0,
        tauxAvancement: 0,
        etatSante: 'Vert',
        statut: 'En attente',
        phaseCourante: 'Cadrage / Pré-Etude',
        chefDeProjet: newProjet.chefDeProjetId ? [{ id: newProjet.chefDeProjetId }] : []
      };
      const response = await api.post('/projets', payload);
      setProjets([...projets, response.data]);
      setShowModal(false);
      setNewProjet({ nom: '', code: '', budgetInitial: '', phaseCourante: 'Cadrage / Pré-Etude', type: '', directionMetier: '', chefDeProjetId: '' });
    } catch (error) {
      console.error("Erreur de création de projet", error);
    }
  };

  const openAssignModal = (projet) => {
    setAssignProject(projet);
    const initialIds = projet.chefDeProjet ? projet.chefDeProjet.map(u => u.id) : [];
    setSelectedChefIds(initialIds);
    setSearchAssignText('');
    setShowAssignModal(true);
  };

  const toggleChefSelection = (id) => {
    if (selectedChefIds.includes(id)) {
      setSelectedChefIds(selectedChefIds.filter(x => x !== id));
    } else {
      setSelectedChefIds([...selectedChefIds, id]);
    }
  };

  const handleAssignProject = async (e) => {
    e.preventDefault();
    if (!assignProject) return;
    try {
      const res = await api.get(`/projets/${assignProject.id}`);
      const payload = res.data;
      payload.chefDeProjet = selectedChefIds.map(id => ({ id }));
      const response = await api.put(`/projets/${assignProject.id}`, payload);
      setProjets(projets.map(p => p.id === assignProject.id ? response.data : p));
      setShowAssignModal(false);
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'assignation : " + (error.response?.data?.message || error.message));
    }
  };

  // Logique de filtrage
  let projetsFiltres = projets;

  // 1. Chef de Projet ne voit QUE ses projets assignés
  if (isChefProjet && currentEmail) {
    projetsFiltres = projetsFiltres.filter(
      p => p.chefDeProjet?.some(u => u.email?.toLowerCase() === currentEmail.toLowerCase())
    );
  }

  // 1b. Membre ne voit QUE les projets dont il fait partie de l'équipe
  if (isMembre && currentEmail) {
    projetsFiltres = projetsFiltres.filter(
      p => p.membres?.some(m => m.email?.toLowerCase() === currentEmail.toLowerCase())
    );
  }

  // 2. PMO voit TOUS les projets (superviseur général)
  // (pas de filtre supplémentaire)

  // 3. Filtre par utilisateur ciblé (pour l'admin uniquement)
  if (isAdmin && filterUser !== '') {
    projetsFiltres = projetsFiltres.filter(p => p.chefDeProjet?.some(u => u.id.toString() === filterUser));
  }

  // 3. Barre de recherche
  if (searchTerm) {
    projetsFiltres = projetsFiltres.filter(p =>
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Calcul du Widget Temps Restant
  const months = Math.floor(countdown.days / 30);
  const remainingDays = countdown.days % 30;
  const countdownDisplay = months > 0
    ? `${months} mois et ${remainingDays} j`
    : `${countdown.days} j`;

  const renderTimeRemaining = () => {
    if (!selectedProjectForTimer) return null;
    const { nom, dateDebutPrevue, dateFinPrevue, dateReelleFin, statut } = selectedProjectForTimer;

    if (statut === 'Terminé' || dateReelleFin) {
      return (
        <div className="bg-slate-50 text-slate-700 px-4 py-3 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm animate-fade-in transition-all">
          <CheckCircle className="w-5 h-5 text-slate-500" />
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide opacity-80">Statut Planning</span>
            <span className="font-medium">Projet Clôturé</span>
          </div>
        </div>
      );
    }

    if (!dateDebutPrevue || !dateFinPrevue) {
      return (
        <div className="bg-orange-50 text-orange-700 px-4 py-3 rounded-xl border border-orange-100 flex items-center gap-3 shadow-sm animate-fade-in transition-all">
          <Calendar className="w-5 h-5" />
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide opacity-80">Temps Restant</span>
            <span className="font-medium inline-block max-w-[200px] truncate text-sm" title="Vérifiez les dates de début et fin prévues dans l'onglet Planning">Dates prévues incomplètes</span>
          </div>
        </div>
      );
    }

    const start = new Date(dateDebutPrevue);
    const end = new Date(dateFinPrevue);
    const now = new Date();

    if (now < start) {
      return (
        <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl border border-indigo-100 flex items-center gap-3 shadow-sm animate-fade-in transition-all">
          <Calendar className="w-5 h-5" />
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide opacity-80">Démarre dans</span>
            <span className="font-bold text-lg font-mono tracking-wider">{countdownDisplay}</span>
          </div>
        </div>
      );
    }

    const totalMs = end - start;
    const passedMs = now - start;
    const progress = Math.min(100, (passedMs / totalMs) * 100);

    if (now > end) {
      return (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-3 shadow-sm animate-fade-in transition-all">
          <AlertCircle className="w-5 h-5" />
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wide opacity-80">En retard de</span>
            <span className="font-bold text-lg font-mono tracking-wider">{countdownDisplay}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl border border-green-100 flex items-center gap-3 shadow-sm animate-fade-in transition-all">
        <Calendar className="w-5 h-5" />
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide opacity-80">Temps Restant</span>
          </div>
          <span className="font-bold text-lg font-mono tracking-wider">{countdownDisplay}</span>
          <div className="w-48 h-2 bg-green-200 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderPlus className="w-8 h-8 text-primary-600" />
            {isAdmin ? "Tous les Projets" : isChefProjet ? "Mes Projets Assignés" : isMembre ? "Mes Projets en tant que Membre" : "Supervision des Projets"}
          </h2>
          <p className="text-slate-500 mt-1">Supervisez et mettez à jour l'état des projets</p>
        </div>
        {renderTimeRemaining()}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par code ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        {isAdmin && (
          <div className="sm:w-64">
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
            >
              <option value="">Tous les utilisateurs</option>
              {utilisateurs.map(u => (
                <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500">Chargement des projets...</div>
      ) : projetsFiltres.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center text-center">
          <FolderPlus className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="text-xl font-bold text-slate-700">Aucun projet</h3>
          <p className="text-slate-500 mt-2 max-w-sm">
            {isChefProjet
              ? "Vous n'avez pas encore de projet assigné dans votre portefeuille."
              : isMembre
              ? "Vous n'êtes membre d'aucun projet actif pour le moment."
              : "Vous n'avez pas encore de projet dans votre portefeuille. Cliquez sur \"Nouveau projet\" pour commencer."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projetsFiltres.map((projet) => (
            <div
              key={projet.id}
              onClick={() => setSelectedProjectForTimer(projet)}
              className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all cursor-pointer ${selectedProjectForTimer?.id === projet.id ? 'ring-2 ring-primary-500 border-primary-500' : 'border-slate-200'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-400 tracking-wider bg-slate-100 px-2 py-0.5 rounded">{projet.code}</span>
                    <span className="text-xs text-primary-600 font-medium">{projet.type || 'Non spécifié'}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{projet.nom}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Assigné à : <span className={`font-semibold ${projet.chefDeProjet && projet.chefDeProjet.length > 0 ? 'text-green-600' : 'text-orange-500'}`}>
                      {projet.chefDeProjet && projet.chefDeProjet.length > 0 
                        ? projet.chefDeProjet.map(u => `${u.prenom} ${u.nom}`).join(', ') 
                        : 'Non assigné'}
                    </span>
                  </p>
                  {/* Tags */}
                  {projet.tags && projet.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {projet.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="tag-badge"
                          style={{
                            background: tag.color ? `${tag.color}22` : '#f1f5f9',
                            color: tag.color || '#64748b',
                            borderColor: tag.color ? `${tag.color}44` : '#e2e8f0',
                          }}
                        >
                          <Tag style={{ width:9, height:9 }} />
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${projet.etatSante === 'Vert' ? 'bg-green-100 text-green-700' : projet.etatSante === 'Orange' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                  Météo: {projet.etatSante}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 my-6">
                <div className="flex items-center gap-2 text-slate-600 border border-slate-100 bg-slate-50 rounded-lg p-3">
                  <Activity className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-xs text-slate-400">Phase & Avancement</p>
                    <p className="text-sm font-semibold">{projet.phaseCourante} ({projet.tauxAvancement}%)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-600 border border-slate-100 bg-slate-50 rounded-lg p-3">
                  <DollarSign className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="text-xs text-slate-400">Budget Consommé</p>
                    <p className="text-sm font-semibold">{projet.budgetConsomme} / {projet.budgetInitial} MAD</p>
                  </div>
                </div>
              </div>

              {/* Membres de l'équipe du projet */}
              <div className="mt-4 mb-5 border-t border-slate-100 pt-4" onClick={(e) => e.stopPropagation()}>
                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Membres de l'équipe</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {projet.membres && projet.membres.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full border border-slate-200">
                      {m.prenom} {m.nom}
                      {canEdit(projet) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveMember(projet, m.id);
                          }}
                          className="hover:text-red-500 font-bold transition-colors text-[10px] w-3 h-3 flex items-center justify-center rounded-full hover:bg-slate-200"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  ))}
                  {(!projet.membres || projet.membres.length === 0) && (
                    <span className="text-xs text-slate-400 italic">Aucun membre affecté</span>
                  )}
                  
                  {/* Sélecteur d'ajout de membre - visible si l'utilisateur a les droits d'édition */}
                  {canEdit(projet) && (
                    <div className="relative inline-block ml-2">
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMember(projet, Number(e.target.value));
                          }
                        }}
                        className="text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-full px-2.5 py-1 outline-none cursor-pointer hover:bg-slate-100 transition-all font-semibold"
                      >
                        <option value="">+ Ajouter un membre</option>
                        {utilisateurs
                          .filter(u => u.role === 'MEMBRE' && !projet.membres?.some(m => m.id === u.id)) // exclure les membres déjà présents
                          .map(u => (
                            <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Maturity score bar */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <MaturityScoreBar score={projet.maturityScore || 0} size="md" />
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  {isPmo && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openAssignModal(projet); }}
                      className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                      <UserPlus className="w-4 h-4" /> Attribuer
                    </button>
                  )}
                  {/* Bouton Rapport PDF — visible pour PMO et Chef de projet */}
                  {(isPmo || isChefProjet) && (
                    <button
                      onClick={(e) => handleDownloadRapport(e, projet)}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-emerald-50 border border-emerald-200"
                      title="Télécharger le rapport PDF"
                    >
                      <FileDown className="w-4 h-4" /> Rapport PDF
                    </button>
                  )}
                </div>
                <div className="flex justify-end gap-3">
                  {canEdit(projet) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/edit/${projet.id}`); }}
                      className="text-sm font-medium text-slate-600 hover:text-primary-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-primary-50">
                      <Pencil className="w-4 h-4" /> Détails & Editer
                    </button>
                  )}
                  {isPmo && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(projet.id); }}
                      className="text-sm font-medium text-slate-600 hover:text-red-600 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'ajout basique */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Créer un nouveau projet</h3>
            <form className="space-y-4" onSubmit={handleCreateProject}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom du projet</label>
                <input
                  type="text"
                  value={newProjet.nom}
                  onChange={e => setNewProjet({ ...newProjet, nom: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-lg transition-colors">
                  Créer le projet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'assignation rapide */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Assigner le projet</h3>
                <p className="text-sm text-slate-500">{assignProject?.nom}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto pr-2 space-y-2">

                {/* Option 1 : Retirer l'assignation / Mettre en attente */}
                <div
                  onClick={() => setSelectedChefIds([])}
                  className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${selectedChefIds.length === 0 ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500' : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedChefIds.length === 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>
                      <AlertCircle className={`w-4 h-4 ${selectedChefIds.length === 0 ? 'text-orange-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${selectedChefIds.length === 0 ? 'text-orange-700' : 'text-slate-700'}`}>Non assigné</p>
                      <p className="text-xs text-slate-500">Mettre le projet en attente</p>
                    </div>
                  </div>
                  {selectedChefIds.length === 0 && <CheckCircle className="w-5 h-5 text-orange-500" />}
                </div>

                {/* Search Bar */}
                <div className="relative mt-2 mb-2">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Rechercher par nom..."
                    value={searchAssignText}
                    onChange={e => setSearchAssignText(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                  />
                </div>

                {/* Option 2 : Liste dynamique des Chefs filtrés */}
                {utilisateurs
                  .filter(u => u.role === 'CHEF_PROJET' || u.role === 'PMO')
                  .filter(u => `${u.prenom} ${u.nom}`.toLowerCase().includes(searchAssignText.toLowerCase()))
                  .map(u => {
                    const isSelected = selectedChefIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleChefSelection(u.id)}
                        className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>
                            {u.prenom.charAt(0)}{u.nom.charAt(0)}
                          </div>
                          <div>
                            <p className={`font-semibold text-sm ${isSelected ? 'text-primary-800' : 'text-slate-800'}`}>{u.prenom} {u.nom}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-xs text-slate-500">
                                {u.role === 'CHEF_PROJET' ? 'Chef de projet' : (u.role ? u.role.replace('ROLE_', '') : '')}
                              </span>
                              {u.referentiels
                                ?.filter(r => r.categorie === 'DIRECTION_METIER')
                                .map(r => (
                                  <span
                                    key={r.id}
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                                      isSelected
                                        ? 'bg-primary-100/50 text-primary-700 border-primary-200'
                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    {r.libelle}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-primary-600" />}
                      </div>
                    );
                  })}

                {utilisateurs.filter(u => u.role === 'CHEF_PROJET' || u.role === 'PMO').filter(u => `${u.prenom} ${u.nom}`.toLowerCase().includes(searchAssignText.toLowerCase())).length === 0 && (
                  <div className="text-center py-4 text-slate-500 text-sm italic">Aucun Chef de projet trouvé.</div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                  Annuler
                </button>
                <button type="button" onClick={handleAssignProject} className="px-5 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsManagement;
