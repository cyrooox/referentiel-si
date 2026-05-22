import { useState, useEffect, useRef } from 'react';
import {
  Info, Calendar, Briefcase, DollarSign, Layers, Activity,
  ShieldCheck, CheckCircle, Users, FileText, Save, ArrowLeft, ArrowRight, FolderKanban, Plus, Trash2, ChevronDown, Sparkles
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import FileUpload from '../components/FileUpload';
import OcrImportModal from '../components/OcrImportModal';

const SECTIONS = [
  { id: 'infos', label: '1. Informations générales', icon: Info },
  { id: 'planning', label: '2. Planning', icon: Calendar },
  { id: 'contrats', label: '3. Contrats & prestataires', icon: Briefcase },
  { id: 'phases', label: '4. Phases & Livrables', icon: Layers },
  { id: 'budget', label: '5. Budget & finances', icon: DollarSign },
  { id: 'suivi', label: '6. Suivi et indicateurs', icon: Activity },
  { id: 'securite', label: '7. Homologation Sécurité', icon: ShieldCheck },
  { id: 'conformite', label: '8. Conformité', icon: CheckCircle },
  { id: 'comitologie', label: '9. Comitologie', icon: Users },
  { id: 'documents', label: '10. Documents Divers', icon: FileText }
];

const Combobox = ({ value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allOptions = [...new Set(options.filter(Boolean))];

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex items-center border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 bg-white shadow-sm">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 outline-none rounded-l-lg bg-transparent"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 text-slate-500 hover:text-slate-800 rounded-r-lg"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {isOpen && allOptions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {allOptions.map((opt, i) => (
            <div
              key={i}
              onClick={() => { onChange(opt); setIsOpen(false); }}
              className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm text-slate-700"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NewProjectWizard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [suggestions, setSuggestions] = useState({
    types: [],
    directions: [],
    statuts: [],
    phases: []
  });

  // Form State Globale
  const [formData, setFormData] = useState({
    nom: '', code: '', description: '', type: '', statut: '', directionMetier: '', phaseCourante: '', nomChefDeProjet: '', chefDeProjetId: '',
    dateCreation: '', dateDebutPrevue: '', dateFinPrevue: '', dateReelleFin: '',
    budgetInitial: 0, budgetConsomme: 0,
    tauxAvancement: 0, etatSante: 'Vert', commentairesSuivi: '',
    contrats: [],
    echeancesPaiement: [],
    sousPhases: [],
    risques: [],
    documentsLies: [],
    copilInstances: []
  });

  useEffect(() => {
    // Charger les utilisateurs pour la liste déroulante
    api.get('/utilisateurs')
      .then(res => setUtilisateurs(res.data.filter(u => u.role === 'ROLE_CHEF_PROJET' || u.role === 'ROLE_PMO')))
      .catch(err => console.error(err));

    // Charger l'historique des projets pour remplir les datalists
    api.get('/projets')
      .then(res => {
        const projets = res.data;
        setSuggestions({
          types: [...new Set(projets.map(p => p.type).filter(Boolean))],
          directions: [...new Set(projets.map(p => p.directionMetier).filter(Boolean))],
          statuts: [...new Set(projets.map(p => p.statut).filter(Boolean))],
          phases: [...new Set(projets.map(p => p.phaseCourante).filter(Boolean))]
        });
      })
      .catch(err => console.error("Erreur chargement suggestions", err));

    if (id) {
      setLoading(true);
      api.get(`/projets/${id}`)
        .then(res => {
          const p = res.data;
          setFormData({
            ...p,
            chefDeProjetId: p.chefDeProjet ? p.chefDeProjet.id : '',
            contrats: p.contrats || [],
            echeancesPaiement: p.echeancesPaiement || [],
            sousPhases: p.sousPhases ? p.sousPhases.map(sp => ({ ...sp, isApplied: true })) : [],
            risques: p.risques || [],
            documentsLies: p.documentsLies || [],
            copilInstances: p.copilInstances || []
          });
        })
        .catch(err => setError("Impossible de charger les données: " + err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Helper pour les champs texte simples
  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  // Helper manuel pour CreatableSelect
  const handleCustomChange = (name, value) => { setFormData({ ...formData, [name]: value }); };

  // Helper pour ajouter une ligne dans un tableau
  const addArrayItem = (key, initialItem) => {
    setFormData({ ...formData, [key]: [...formData[key], initialItem] });
  };

  // Helper pour MAJ une ligne spécifique d'un tableau
  const updateArrayItem = (key, index, field, value) => {
    const updatedArray = [...formData[key]];
    updatedArray[index][field] = value;
    setFormData({ ...formData, [key]: updatedArray });
  };

  // Helper pour supprimer une ligne d'un tableau
  const removeArrayItem = (key, index) => {
    const updatedArray = [...formData[key]];
    updatedArray.splice(index, 1);
    setFormData({ ...formData, [key]: updatedArray });
  };

  // Applique les données extraites par OCR dans le formulaire
  const handleOcrApply = (patch) => {
    let updatedForm = { ...formData, ...patch };

    // Fusionner les contrats OCR avec les contrats existants
    const currentContrats = updatedForm.contratsPrestataires || [];
    if (patch.contratsPrestataires && patch.contratsPrestataires.length > 0) {
      const ocrContrat = patch.contratsPrestataires[0];
      if (!currentContrats.some(c => c.reference === ocrContrat.reference)) {
         updatedForm.contratsPrestataires = [...currentContrats, ocrContrat];
      }
    }

    // --- NOUVEAU: Application des Tableaux de Livrables (Tabula) ---
    if (patch.livrablesExtraits && patch.livrablesExtraits.length > 0) {
      if (updatedForm.sousPhases.length === 0) {
        updatedForm.sousPhases.push({
          nomPhase: 'Phase Importée (OCR)',
          statut: 'Non entamée',
          dateDebut: updatedForm.dateDebutPrevue || '',
          dateFin: updatedForm.dateFinPrevue || '',
          urlPvReception: '',
          livrables: []
        });
      }
      
      const phaseCible = updatedForm.sousPhases[0];
      if (!phaseCible.livrables) phaseCible.livrables = [];

      patch.livrablesExtraits.forEach(liv => {
        // Éviter les doublons basiques
        if (!phaseCible.livrables.some(l => l.titre === liv.nomLivrable)) {
          phaseCible.livrables.push({
            titre: liv.nomLivrable || 'Livrable sans nom',
            description: liv.description || '',
            statut: 'À faire',
            datePrevue: '',
            dateReelle: ''
          });
        }
      });
    }

    setFormData(updatedForm);
    // Naviguer vers la section Infos pour voir le résultat
    setActiveSectionIndex(0);
  };

  const handleSave = async () => {
    if (!formData.nom) {
      setError("Le champ Nom du projet (Infos générales) est obligatoire.");
      setActiveSectionIndex(0);
      return;
    }
    setLoading(true); setError('');
    try {
      const payload = { ...formData };
      if (payload.chefDeProjetId) {
        payload.chefDeProjet = { id: payload.chefDeProjetId };
      } else {
        payload.chefDeProjet = null;
      }

      if (id) {
        await api.put(`/projets/${id}`, payload);
      } else {
        await api.post('/projets', payload);
      }
      navigate('/projects');
    } catch (err) {
      setError("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- RENDUS DES ONGLETS ----------------

  const renderInfos = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-slate-800">1. Informations générales</h3>
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nom du projet</label>
          <input type="text" name="nom" value={formData.nom} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Code projet</label>
          <input type="text" name="code" value={id ? formData.code : 'Généré auto. (ex: PRJ-2025-001)'} disabled={true} className="w-full px-3 py-2 border rounded-lg outline-none bg-slate-100 text-slate-500 font-medium cursor-not-allowed" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Description / Résumé des objectifs</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type de projet</label>
          <Combobox value={formData.type} options={suggestions.types} onChange={(val) => handleCustomChange('type', val)} placeholder="Ex: ERP, Infrastructure..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Direction métier concernée</label>
          <Combobox value={formData.directionMetier} options={suggestions.directions} onChange={(val) => handleCustomChange('directionMetier', val)} placeholder="Ex: DSI, RH..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
          <Combobox value={formData.statut} options={suggestions.statuts} onChange={(val) => handleCustomChange('statut', val)} placeholder="Ex: En cours, A l'arrêt..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phase du projet</label>
          <Combobox value={formData.phaseCourante} options={suggestions.phases} onChange={(val) => handleCustomChange('phaseCourante', val)} placeholder="Ex: Cadrage, Recette..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Chef de projet</label>
          <input
            type="text"
            name="nomChefDeProjet"
            value={formData.nomChefDeProjet || ''}
            onChange={handleChange}
            placeholder="Saisissez le nom du chef de projet"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
          />
        </div>
      </div>
    </div>
  );

  const renderPlanning = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-slate-800">2. Planning Global</h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date de création (Démarrage admin)</label>
          <input type="date" name="dateCreation" value={formData.dateCreation} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date de début prévue (Opérationnel)</label>
          <input type="date" name="dateDebutPrevue" value={formData.dateDebutPrevue} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date de fin prévue (Deadline théorique)</label>
          <input type="date" name="dateFinPrevue" value={formData.dateFinPrevue} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date réelle de fin (Si clôturé)</label>
          <input type="date" name="dateReelleFin" value={formData.dateReelleFin} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
          <p className="text-xs text-orange-600 font-medium mt-1">⚠️ Ne remplir que si le projet est effectivement terminé.</p>
        </div>
      </div>
      <div className="p-4 bg-primary-50 rounded-lg border border-primary-100 mt-6">
        <p className="text-sm text-primary-800 flex items-start gap-2">
          <Info className="w-5 h-5 shrink-0" />
          Note : Les dates précises de chaque phase ("Cadrage", "Spécificaitons", "Recette"...) se configurent dans l'onglet "Phases & Livrables".
        </p>
      </div>
    </div>
  );

  const renderContrats = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">3. Contrats & prestataires</h3>
        <button onClick={() => addArrayItem('contrats', { objet: '', prestataires: '', typeMarche: '', reference: '', delaiExecutionMois: 0, montantContractuel: 0, urlDocument: '' })} className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {formData.contrats.length === 0 ? <p className="text-slate-500 italic">Aucun contrat ajouté.</p> : (
        <div className="space-y-6">
          {formData.contrats.map((contrat, idx) => (
            <div key={idx} className="p-5 border border-slate-200 rounded-xl bg-slate-50 relative">
              <button onClick={() => removeArrayItem('contrats', idx)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="col-span-2"><label className="block text-sm font-medium mb-1">Objet du marché</label><input type="text" value={contrat.objet} onChange={(e) => updateArrayItem('contrats', idx, 'objet', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Prestataire(s)</label><input type="text" value={contrat.prestataires} onChange={(e) => updateArrayItem('contrats', idx, 'prestataires', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Référence du marché</label><input type="text" value={contrat.reference} onChange={(e) => updateArrayItem('contrats', idx, 'reference', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type de marché</label>
                  <input
                    type="text"
                    value={contrat.typeMarche}
                    onChange={(e) => updateArrayItem('contrats', idx, 'typeMarche', e.target.value)}
                    placeholder="Saisissez le type de marché"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Délai d'exécution</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input type="number" value={contrat.delaiExecutionMois} onChange={(e) => updateArrayItem('contrats', idx, 'delaiExecutionMois', e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg pr-12" />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-sm font-medium pointer-events-none">Mois</span>
                    </div>
                    <div className="flex-1 relative">
                      <input type="number" value={contrat.delaiExecutionMois === '' ? '' : (contrat.delaiExecutionMois * 4)} onChange={(e) => updateArrayItem('contrats', idx, 'delaiExecutionMois', e.target.value === '' ? '' : (Number(e.target.value) / 4))} className="w-full px-3 py-2 border rounded-lg pr-20" />
                      <span className="absolute right-3 top-2.5 text-slate-400 text-sm font-medium pointer-events-none">Semaines</span>
                    </div>
                  </div>
                </div>
                <div><label className="block text-sm font-medium mb-1">Montant contractuel</label><input type="number" value={contrat.montantContractuel} onChange={(e) => updateArrayItem('contrats', idx, 'montantContractuel', Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div className="col-span-2"><FileUpload label="Document du contrat (PDF...)" existingUrl={contrat.urlDocument} onUploadSuccess={(url) => updateArrayItem('contrats', idx, 'urlDocument', url)} accept=".pdf,.doc,.docx" /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderBudget = () => {
    const delta = (formData.budgetInitial || 0) - (formData.budgetConsomme || 0);
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-slate-800">5. Budget & Finances</h3>
        <div className="grid grid-cols-3 gap-6 p-5 bg-white border border-slate-200 shadow-sm rounded-xl">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Budget Initial Prévu</label><input type="number" name="budgetInitial" value={formData.budgetInitial} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-lg font-bold text-slate-800" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Budget Consommé à date</label><input type="number" name="budgetConsomme" value={formData.budgetConsomme} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg text-lg font-bold text-orange-600" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Budget Restant (Delta)</label><div className={`w-full px-3 py-2 border border-transparent rounded-lg text-lg font-bold ${delta < 0 ? 'text-red-600' : 'text-green-600'}`}>{delta.toLocaleString()} MAD</div></div>
        </div>

        <div className="flex justify-between items-center mt-8">
          <h4 className="text-lg font-semibold text-slate-800">Échéancier de paiements</h4>
          <button onClick={() => addArrayItem('echeancesPaiement', { montant: '', dateEcheance: '', estPaye: false, typeLiaison: 'AUCUN', liaisonId: '' })} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>

        {formData.echeancesPaiement.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500">
                  <th className="pb-2">Montant</th>
                  <th className="pb-2">Date d'échéance</th>
                  <th className="pb-2">Conditionné par</th>
                  <th className="pb-2">Élément lié</th>
                  <th className="pb-2">Statut</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {formData.echeancesPaiement.map((ech, idx) => {
                  // Déterminer le type de liaison initial si on charge depuis l'API
                  let currentTypeLiaison = ech.typeLiaison || 'AUCUN';
                  let currentLiaisonId = ech.liaisonId || '';

                  if (!ech.typeLiaison && ech.sousPhase && ech.sousPhase.id) {
                    currentTypeLiaison = 'PHASE';
                    currentLiaisonId = ech.sousPhase.id;
                  } else if (!ech.typeLiaison && ech.livrable && ech.livrable.id) {
                    currentTypeLiaison = 'LIVRABLE';
                    currentLiaisonId = ech.livrable.id;
                  }

                  // Rassembler toutes les phases et tous les livrables avec ID
                  const availablePhases = formData.sousPhases.filter(p => p.id);
                  const availableLivrables = formData.sousPhases.flatMap(p => p.livrables || []).filter(l => l && l.id);

                  return (
                    <tr key={idx} className={`border-b border-slate-100 last:border-0 transition-colors ${ech.estPaye ? 'bg-green-50' : ''}`}>
                      <td className="py-2 pr-2"><input type="number" value={ech.montant} onChange={(e) => updateArrayItem('echeancesPaiement', idx, 'montant', e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-2 py-1.5 border rounded-lg min-w-[100px]" /></td>
                      <td className="py-2 pr-2"><input type="date" value={ech.dateEcheance} onChange={(e) => updateArrayItem('echeancesPaiement', idx, 'dateEcheance', e.target.value)} className="w-full px-2 py-1.5 border rounded-lg" /></td>
                      <td className="py-2 pr-2">
                        <select
                          value={currentTypeLiaison}
                          onChange={(e) => {
                            updateArrayItem('echeancesPaiement', idx, 'typeLiaison', e.target.value);
                            updateArrayItem('echeancesPaiement', idx, 'liaisonId', ''); // reset
                            // also clear actual backend fields
                            updateArrayItem('echeancesPaiement', idx, 'sousPhase', null);
                            updateArrayItem('echeancesPaiement', idx, 'livrable', null);
                          }}
                          className="w-full px-2 py-1.5 border rounded-lg"
                        >
                          <option value="AUCUN">Aucun (Lié au projet)</option>
                          <option value="PHASE">Validation d'une Phase</option>
                          <option value="LIVRABLE">Remise d'un Livrable</option>
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        {currentTypeLiaison === 'PHASE' && (
                          <select
                            value={currentLiaisonId}
                            onChange={(e) => {
                              updateArrayItem('echeancesPaiement', idx, 'liaisonId', e.target.value);
                              updateArrayItem('echeancesPaiement', idx, 'sousPhase', { id: parseInt(e.target.value) });
                              updateArrayItem('echeancesPaiement', idx, 'livrable', null);
                            }}
                            className="w-full px-2 py-1.5 border rounded-lg"
                          >
                            <option value="">-- Choisir une phase --</option>
                            {availablePhases.map(p => <option key={p.id} value={p.id}>{p.nomPhase}</option>)}
                            {availablePhases.length === 0 && <option disabled>Aucune phase enregistrée</option>}
                          </select>
                        )}
                        {currentTypeLiaison === 'LIVRABLE' && (
                          <select
                            value={currentLiaisonId}
                            onChange={(e) => {
                              updateArrayItem('echeancesPaiement', idx, 'liaisonId', e.target.value);
                              updateArrayItem('echeancesPaiement', idx, 'livrable', { id: parseInt(e.target.value) });
                              updateArrayItem('echeancesPaiement', idx, 'sousPhase', null);
                            }}
                            className="w-full px-2 py-1.5 border rounded-lg"
                          >
                            <option value="">-- Choisir un livrable --</option>
                            {availableLivrables.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
                            {availableLivrables.length === 0 && <option disabled>Aucun livrable enregistré</option>}
                          </select>
                        )}
                        {currentTypeLiaison === 'AUCUN' && <span className="text-slate-400 text-sm">-</span>}
                      </td>
                      <td className="py-2 pr-2"><select value={ech.estPaye} onChange={(e) => updateArrayItem('echeancesPaiement', idx, 'estPaye', e.target.value === 'true')} className={`w-full px-2 py-1.5 border rounded-lg transition-colors ${ech.estPaye ? 'bg-green-100 text-green-800 font-semibold border-green-300' : 'bg-white'}`}><option value={false}>Non Payé</option><option value={true}>Payé</option></select></td>
                      <td className="py-2"><button onClick={() => removeArrayItem('echeancesPaiement', idx)} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {(formData.sousPhases.length > 0 && formData.sousPhases.some(p => !p.id)) && (
              <p className="text-xs text-orange-600 mt-2">💡 Note : Vous devez d'abord "Enregistrer le projet" pour pouvoir lier des paiements aux nouvelles phases/livrables que vous venez d'ajouter.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPhases = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">4. Phases & Livrables</h3>
        <button onClick={() => addArrayItem('sousPhases', { nomPhase: '', statut: 'Non entamée', dateDebut: '', dateFin: '', urlPvReception: '', livrables: [] })} className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
          <Plus className="w-4 h-4" /> Ajouter Phase
        </button>
      </div>

      <div className="space-y-6">
        {formData.sousPhases.map((phase, pIdx) => (
          !phase.isApplied && (
            <div key={pIdx} className="p-5 border border-slate-200 rounded-xl bg-slate-50 relative">
              <button onClick={() => removeArrayItem('sousPhases', pIdx)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
              <h4 className="font-bold text-lg mb-4 text-primary-700">Phase N° {pIdx + 1}</h4>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nom de la phase</label>
                  <input
                    type="text"
                    value={phase.nomPhase}
                    onChange={(e) => updateArrayItem('sousPhases', pIdx, 'nomPhase', e.target.value)}
                    placeholder="Saisissez le nom de la phase"
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Statut</label>
                  <input
                    type="text"
                    value={phase.statut}
                    onChange={(e) => updateArrayItem('sousPhases', pIdx, 'statut', e.target.value)}
                    placeholder="Saisissez le statut de la phase"
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div><label className="text-sm font-medium mb-1 block">Date début</label><input type="date" value={phase.dateDebut} onChange={(e) => updateArrayItem('sousPhases', pIdx, 'dateDebut', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="text-sm font-medium mb-1 block">Date fin</label><input type="date" value={phase.dateFin} onChange={(e) => updateArrayItem('sousPhases', pIdx, 'dateFin', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div className="col-span-2"><FileUpload label="PV de réception pour cette phase" existingUrl={phase.urlPvReception} onUploadSuccess={(url) => updateArrayItem('sousPhases', pIdx, 'urlPvReception', url)} accept=".pdf" /></div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-semibold text-slate-800">Livrables attendus pour cette phase</label>
                  <button
                    onClick={() => {
                      const updated = [...formData.sousPhases];
                      if (!updated[pIdx].livrables) updated[pIdx].livrables = [];
                      updated[pIdx].livrables.push({ nom: '' });
                      setFormData({ ...formData, sousPhases: updated });
                    }}
                    className="text-primary-600 hover:text-primary-800 flex items-center gap-1 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" /> Ajouter Livrable
                  </button>
                </div>
                <div className="space-y-2">
                  {phase.livrables && phase.livrables.map((livrable, lIdx) => (
                    <div key={lIdx} className="flex gap-2">
                      <input
                        type="text"
                        value={livrable.nom}
                        onChange={(e) => {
                          const updated = [...formData.sousPhases];
                          updated[pIdx].livrables[lIdx].nom = e.target.value;
                          setFormData({ ...formData, sousPhases: updated });
                        }}
                        placeholder="Nom du livrable (ex: Document Spécifications Techniques)"
                        className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white"
                      />
                      <button
                        onClick={() => {
                          const updated = [...formData.sousPhases];
                          updated[pIdx].livrables.splice(lIdx, 1);
                          setFormData({ ...formData, sousPhases: updated });
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {(!phase.livrables || phase.livrables.length === 0) && (
                    <p className="text-sm text-slate-500 italic">Aucun livrable défini pour cette phase.</p>
                  )}
                </div>
                <div className="flex justify-end mt-4 gap-3">
                  <button
                    onClick={() => {
                      if (phase._originalState) {
                        const updated = [...formData.sousPhases];
                        updated[pIdx] = { ...phase._originalState, isApplied: true };
                        delete updated[pIdx]._originalState;
                        setFormData({ ...formData, sousPhases: updated });
                      } else {
                        removeArrayItem('sousPhases', pIdx);
                      }
                    }}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      const updated = [...formData.sousPhases];
                      updated[pIdx].isApplied = true;
                      delete updated[pIdx]._originalState;
                      setFormData({ ...formData, sousPhases: updated });
                    }}
                    className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            </div>
          )
        ))}
      </div>

      {formData.sousPhases.length > 0 && (
        <div className="mt-8">
          <h4 className="text-lg font-bold text-slate-800 mb-4">Récapitulatif Phases & Livrables</h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-700 w-1/3">Prestations attendues</th>
                  <th className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-700">Livrables</th>
                  <th className="px-5 py-3 border-b border-slate-200 font-semibold text-slate-700 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {formData.sousPhases.map((phase, pIdx) => (
                  <tr key={pIdx}>
                    <td className="px-5 py-4 align-top">
                      <div className="font-bold text-slate-800">Phase N° {pIdx + 1}</div>
                      <div className="text-sm text-slate-500 mt-0.5">{phase.nomPhase || 'Sans nom'}</div>
                    </td>
                    <td className="px-5 py-4">
                      {phase.livrables && phase.livrables.length > 0 ? (
                        <ul className="space-y-1">
                          {phase.livrables.filter(l => l && l.nom.trim() !== '').map((livrable, lIdx) => (
                            <li key={lIdx} className="flex items-center gap-2 text-sm text-slate-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0"></span>
                              {livrable.nom}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-sm text-slate-400 italic">Aucun livrable ajouté pour le moment.</span>
                      )}
                    </td>
                    <td className="px-5 py-4 align-middle text-center space-x-3">
                      <button
                        onClick={() => {
                          const updated = [...formData.sousPhases];
                          updated[pIdx]._originalState = JSON.parse(JSON.stringify(updated[pIdx]));
                          updated[pIdx].isApplied = false;
                          setFormData({ ...formData, sousPhases: updated });
                        }}
                        className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                        title="Rouvrir cette phase pour la modifier"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => removeArrayItem('sousPhases', pIdx)}
                        className="text-sm font-medium text-red-500 hover:text-red-700 hover:underline"
                        title="Supprimer définitivement cette phase"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderSuivi = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-slate-800">6. Suivi et Indicateurs</h3>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1">Taux d'avancement (%)</label>
          <div className="relative">
            <input type="number" name="tauxAvancement" min="0" max="100" value={formData.tauxAvancement} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg pr-8" />
            <span className="absolute right-3 top-2.5 text-slate-400 font-medium pointer-events-none">%</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">État de santé</label>
          <select name="etatSante" value={formData.etatSante} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg font-bold">
            <option value="Vert" className="text-green-600">🟢 Vert (Normal)</option>
            <option value="Orange" className="text-orange-500">🟠 Orange (Sous surveillance)</option>
            <option value="Rouge" className="text-red-600">🔴 Rouge (Alerte / Critique)</option>
          </select>
        </div>
        <div className="col-span-2"><label className="block text-sm font-medium mb-1">Commentaires de suivi</label><textarea name="commentairesSuivi" rows="3" value={formData.commentairesSuivi} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg"></textarea></div>
      </div>

      <div className="mt-8 border-t border-slate-200 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold text-slate-800">Registre des Risques</h4>
          <button onClick={() => addArrayItem('risques', { description: '', impact: 'Moyen', responsable: '', planAction: '' })} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /> Ajouter Risque</button>
        </div>
        {formData.risques.map((r, i) => (
          <div key={i} className="flex gap-2 items-start mb-2">
            <input type="text" placeholder="Description du risque" value={r.description} onChange={(e) => updateArrayItem('risques', i, 'description', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
            <select value={r.impact} onChange={(e) => updateArrayItem('risques', i, 'impact', e.target.value)} className="w-32 px-3 py-2 border rounded-lg">
              <option value="Faible">Faible</option><option value="Moyen">Moyen</option><option value="Fort">Fort</option>
            </select>
            <input type="text" placeholder="Responsable" value={r.responsable} onChange={(e) => updateArrayItem('risques', i, 'responsable', e.target.value)} className="w-48 px-3 py-2 border rounded-lg" />
            <input type="text" placeholder="Plan d'action" value={r.planAction} onChange={(e) => updateArrayItem('risques', i, 'planAction', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
            <button onClick={() => removeArrayItem('risques', i)} className="p-2 text-red-500"><Trash2 className="w-5 h-5" /></button>
          </div>
        ))}
      </div>
    </div>
  );

  // Helper render simple documents array (Tabs 7, 8, 10 use DocumentsLie entity essentially)
  const renderDocsTab = (categoryTitle, categoryFilter, descriptionLabel) => {
    const relevantDocs = formData.documentsLies.map((d, index) => ({ ...d, originalIndex: index })).filter(d => d.categorie === categoryFilter);
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">{categoryTitle}</h3>
          <button onClick={() => addArrayItem('documentsLies', { categorie: categoryFilter, description: '', urlFichier: '' })} className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700">
            <Plus className="w-4 h-4" /> Ajouter Entrée
          </button>
        </div>
        <div className="space-y-4 mt-4">
          {relevantDocs.map((doc, displayIdx) => (
            <div key={displayIdx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">{descriptionLabel}</label>
                <input type="text" value={doc.description} onChange={(e) => updateArrayItem('documentsLies', doc.originalIndex, 'description', e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-4" />
                <FileUpload label="Fichier Associé" existingUrl={doc.urlFichier} onUploadSuccess={(url) => updateArrayItem('documentsLies', doc.originalIndex, 'urlFichier', url)} />
              </div>
              <button onClick={() => removeArrayItem('documentsLies', doc.originalIndex)} className="text-slate-400 hover:text-red-500 mt-6"><Trash2 className="w-5 h-5" /></button>
            </div>
          ))}
          {relevantDocs.length === 0 && <p className="text-slate-500 italic">Aucun élément pour le moment.</p>}
        </div>
      </div>
    );
  };

  const renderComitologie = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">9. Comitologie (Instances COPIL)</h3>
        <button onClick={() => addArrayItem('copilInstances', { numero: '', dateInstance: '', urlSupport: '', urlCompteRendu: '' })} className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"><Plus className="w-4 h-4" /> Ajouter COPIL</button>
      </div>
      <div className="space-y-4">
        {formData.copilInstances.map((c, i) => (
          <div key={i} className="p-5 border border-slate-200 rounded-xl bg-slate-50 relative">
            <button onClick={() => removeArrayItem('copilInstances', i)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">COPIL N°</label><input type="text" value={c.numero} onChange={(e) => updateArrayItem('copilInstances', i, 'numero', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="text-sm font-medium block mb-1">Date du COPIL</label><input type="date" value={c.dateInstance} onChange={(e) => updateArrayItem('copilInstances', i, 'dateInstance', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><FileUpload label="Support (Présentation PPT/PDF)" existingUrl={c.urlSupport} onUploadSuccess={(url) => updateArrayItem('copilInstances', i, 'urlSupport', url)} /></div>
              <div><FileUpload label="Compte Rendu (CR)" existingUrl={c.urlCompteRendu} onUploadSuccess={(url) => updateArrayItem('copilInstances', i, 'urlCompteRendu', url)} /></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const getActiveView = () => {
    switch (SECTIONS[activeSectionIndex].id) {
      case 'infos': return renderInfos();
      case 'planning': return renderPlanning();
      case 'contrats': return renderContrats();
      case 'budget': return renderBudget();
      case 'phases': return renderPhases();
      case 'suivi': return renderSuivi();
      case 'securite': return renderDocsTab("7. Homologation Sécurité", "HOMOLOGATION_SECURITE", "Description des actions / audits de sécurité");
      case 'conformite': return renderDocsTab("8. Conformité Légale & RGPD", "CONFORMITE", "Requis ou Analyse de conformité");
      case 'comitologie': return renderComitologie();
      case 'documents': return renderDocsTab("10. Documents Divers", "DIVERS", "Description de la ressource (CDC, Architecture, etc.)");
      default: return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Modal OCR */}
      {showOcrModal && (
        <OcrImportModal
          onClose={() => setShowOcrModal(false)}
          onApply={handleOcrApply}
        />
      )}

      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-primary-600" /> {id ? 'Modification du Projet' : 'Nouvel Espace Projet'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">Saisie complète des données du cycle de vie du projet.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Bouton OCR Import */}
          <button
            onClick={() => setShowOcrModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-primary-300 text-primary-700 bg-primary-50 hover:bg-primary-100 font-medium rounded-lg transition-colors"
            title="Importer et extraire automatiquement les données depuis un document PDF"
          >
            <Sparkles className="w-4 h-4" />
            Import OCR
          </button>
          <button onClick={() => navigate('/projects')} className="text-slate-500 hover:bg-slate-100 rounded-lg font-medium px-5 py-2.5 transition-colors">
            Annuler
          </button>
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-primary-400 transition-colors shadow-sm">
            <Save className="w-5 h-5" /> {loading ? 'Enregistrement...' : (id ? 'Mettre à jour le Projet' : 'Enregistrer le Projet complet')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Vertical Tabs */}
        <div className="w-72 bg-white border-r border-slate-200 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {SECTIONS.map((section, index) => {
              const Icon = section.icon;
              const isActive = index === activeSectionIndex;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSectionIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left ${isActive ? 'bg-primary-50 text-primary-700 border border-primary-100 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
                  <span className="truncate">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              {getActiveView()}
            </div>
          </div>

          {/* Footer actions */}
          <div className="bg-slate-50 border-t border-slate-200 p-4 px-8 flex justify-between items-center shrink-0">
            <button
              disabled={activeSectionIndex === 0}
              onClick={() => setActiveSectionIndex(prev => prev - 1)}
              className="flex items-center gap-2 px-4 py-2 font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>
            <div className="flex items-center gap-4">
              {activeSectionIndex < SECTIONS.length - 1 && (
                <button onClick={() => setActiveSectionIndex(prev => prev + 1)} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900">
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewProjectWizard;
