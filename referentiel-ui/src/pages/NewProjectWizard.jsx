import React, { useState, useEffect, useRef, Fragment } from 'react';
import {
  Info, Calendar, Briefcase, DollarSign, Layers, Activity,
  ShieldCheck, Check, CheckCircle, Users, FileText, Save, ArrowLeft, ArrowRight, FolderKanban, Plus, Trash2, ChevronDown, Sparkles, X, ChevronUp, Search, AlertCircle,
  ClipboardList, MessageSquarePlus, Clock, UserCircle, Paperclip, ChevronRight, Image, UploadCloud, User
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../api/axios';
import FileUpload from '../components/FileUpload';
import OcrImportModal from '../components/OcrImportModal';
import { useKeycloak } from '../KeycloakProvider';

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
  const { userInfo } = useKeycloak();
  const { id } = useParams();
  const location = useLocation();

  const getInitialTab = () => {
    const query = new URLSearchParams(location.search);
    const tab = query.get('tab');
    if (tab) {
      const idx = SECTIONS.findIndex(s => s.id === tab);
      if (idx !== -1) return idx;
    }
    return 0;
  };

  const [activeSectionIndex, setActiveSectionIndex] = useState(getInitialTab());

  // Listen for query parameter changes (e.g. from the main sidebar)
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const tab = query.get('tab');
    if (tab) {
      const idx = SECTIONS.findIndex(s => s.id === tab);
      if (idx !== -1 && idx !== activeSectionIndex) {
        setActiveSectionIndex(idx);
      }
    }
  }, [location.search]);

  const navigateToSection = (index) => {
    setActiveSectionIndex(index);
    const section = SECTIONS[index];
    if (section && id) {
      navigate(`/projects/edit/${id}?tab=${section.id}`, { replace: true });
    }
  };

  const [loading, setLoading] = useState(false);
  const [originalProject, setOriginalProject] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [todoTasks, setTodoTasks] = useState([]);
  const [todoExpanded, setTodoExpanded] = useState(true);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [activeDropdown, setActiveDropdown] = useState(null); // { taskId, field }
  const [activeDatePicker, setActiveDatePicker] = useState(null); // taskId
  const [activeSubtaskInput, setActiveSubtaskInput] = useState(null); // taskId
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [activeFilePopover, setActiveFilePopover] = useState(null); // taskId
  const [activeAdminPopover, setActiveAdminPopover] = useState(null); // taskId
  const [expandedTasks, setExpandedTasks] = useState(new Set()); // set of parent taskIds that are expanded

  const getDefaultTasks = () => [
    {
      id: 'task-1',
      name: 'Tâche 1',
      admin: 'Chef de projet',
      status: 'En cours',
      priority: 'Faible',
      remarks: 'Points d\'action',
      budget: 100,
      files: [{ url: '', name: 'document1.png' }],
      dueDate: '2026-06-09',
      dueDateRangeStart: '2026-06-09',
      dueDateRangeEnd: '2026-06-10',
      lastUpdated: new Date(Date.now() - 60000).toISOString(),
      subtasks: []
    },
    {
      id: 'task-2',
      name: 'Tâche 2',
      admin: 'Chef de projet',
      status: 'En cours',
      priority: 'Élevé',
      remarks: 'Notes de réunion',
      budget: 1000,
      files: [],
      dueDate: '2026-06-10',
      dueDateRangeStart: '2026-06-11',
      dueDateRangeEnd: '2026-06-12',
      lastUpdated: new Date(Date.now() - 14 * 60000).toISOString(),
      subtasks: [
        {
          id: 'subtask-2-1',
          name: 'Sous-tâche de Tâche 2',
          admin: 'Chef de projet',
          status: 'En cours',
          priority: 'Faible',
          remarks: 'Notes de réunion',
          budget: 0,
          files: [],
          dueDate: '2026-06-10',
          dueDateRangeStart: '2026-06-11',
          dueDateRangeEnd: '2026-06-12',
          lastUpdated: new Date().toISOString()
        }
      ]
    },
    {
      id: 'task-3',
      name: 'Tâche 3',
      admin: 'Chef de projet',
      status: 'Bloqué',
      priority: 'Moyenne',
      remarks: 'Autre',
      budget: 500,
      files: [],
      dueDate: '2026-06-11',
      dueDateRangeStart: '2026-06-13',
      dueDateRangeEnd: '2026-06-14',
      lastUpdated: new Date(Date.now() - 14 * 60000).toISOString(),
      subtasks: []
    }
  ];

  // S'assurer que l'index de la section courante est toujours dans les limites
  useEffect(() => {
    if (activeSectionIndex >= SECTIONS.length) {
      setActiveSectionIndex(0);
    }
  }, [activeSectionIndex]);
  const [predictionData, setPredictionData] = useState(null);
  const [prestatairePerf, setPrestatairePerf] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [predictionError, setPredictionError] = useState('');
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrTextContent, setOcrTextContent] = useState('');
  const [showOcrTextPanel, setShowOcrTextPanel] = useState(false);
  const [ocrSearchQuery, setOcrSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const ocrSearchInputRef = useRef(null);

  // Compter le nombre d'occurrences de la recherche
  const getMatchCount = () => {
    if (!ocrSearchQuery) return 0;
    const escapedQuery = ocrSearchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const matches = ocrTextContent.match(new RegExp(escapedQuery, 'gi'));
    return matches ? matches.length : 0;
  };

  const totalMatches = getMatchCount();

  const handleOcrSearch = (query) => {
    setOcrSearchQuery(query);
    setCurrentMatchIndex(0);
  };

  // Écouter Ctrl+F globalement pour ouvrir/focus la recherche
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && ocrTextContent) {
        e.preventDefault();
        setShowOcrTextPanel(true);
        setTimeout(() => {
          ocrSearchInputRef.current?.focus();
        }, 100);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [ocrTextContent]);

  // Faire défiler la recherche active
  useEffect(() => {
    if (ocrSearchQuery && totalMatches > 0) {
      const activeElement = document.getElementById(`ocr-match-${currentMatchIndex}`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, ocrSearchQuery, totalMatches]);

  // Surligner le texte recherché
  const getHighlightedText = () => {
    if (!ocrSearchQuery) return ocrTextContent;
    const escapedQuery = ocrSearchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const parts = ocrTextContent.split(regex);
    let matchCounter = 0;
    return parts.map((part, index) => {
      if (part.toLowerCase() === ocrSearchQuery.toLowerCase()) {
        const currentCounter = matchCounter;
        matchCounter++;
        const isCurrent = currentCounter === currentMatchIndex;
        return (
          <mark
            key={index}
            id={`ocr-match-${currentCounter}`}
            className={`${isCurrent ? 'bg-indigo-500 text-white ring-2 ring-indigo-300 font-extrabold px-1 rounded shadow-md scale-110' : 'bg-yellow-400 text-black font-semibold px-0.5 rounded'} transition-all duration-150 inline-block`}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };
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
    copilInstances: [],
    ocrText: '',
    todoList: ''
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
          setOriginalProject(JSON.parse(JSON.stringify(p)));
          setFormData({
            ...p,
            chefDeProjet: p.chefDeProjet || [],
            contrats: p.contrats || [],
            echeancesPaiement: p.echeancesPaiement || [],
            sousPhases: p.sousPhases ? p.sousPhases.map(sp => ({ ...sp, isApplied: true })) : [],
            risques: p.risques || [],
            documentsLies: p.documentsLies || [],
            copilInstances: p.copilInstances || [],
            todoList: p.todoList || ''
          });
          if (p.ocrText) {
            setOcrTextContent(p.ocrText);
          }
          if (p.todoList) {
            try {
              setTodoTasks(JSON.parse(p.todoList));
            } catch (e) {
              console.error("Erreur parsing todoList", e);
              setTodoTasks(getDefaultTasks());
            }
          } else {
            setTodoTasks(getDefaultTasks());
          }
        })
        .catch(err => setError("Impossible de charger les données: " + err.message))
        .finally(() => setLoading(false));
    } else {
      setTodoTasks(getDefaultTasks());
    }
  }, [id]);

  // Charger les predictions et performances de prestataire lorsque l'onglet est selectionne
  useEffect(() => {
    if (SECTIONS[activeSectionIndex]?.id === 'prediction') {
      if (!id) {
        setPredictionError("Analyse prédictive indisponible pour un nouveau projet. Veuillez enregistrer le projet avant d'y accéder.");
        return;
      }

      const loadPrediction = async () => {
        setLoadingPrediction(true);
        setPredictionError('');
        setPredictionData(null);
        setPrestatairePerf(null);
        try {
          // 1. Risque de retard
          const resRisk = await api.get(`/predictive/projets/${id}/delai-risque`);
          setPredictionData(resRisk.data);

          // 2. Nom du prestataire associé au contrat du projet
          if (formData.contrats && formData.contrats.length > 0) {
            const firstContract = formData.contrats.find(c => c.prestataires && c.prestataires.trim() !== '');
            if (firstContract) {
              const name = firstContract.prestataires.trim();
              const resPerf = await api.get(`/predictive/prestataires/performance?nom=${encodeURIComponent(name)}`);
              setPrestatairePerf(resPerf.data);
            }
          }
        } catch (err) {
          console.error("Erreur chargement IA Prédictive", err);
          setPredictionError("Erreur lors de la récupération des données d'analyse prédictive. Vérifiez que le backend tourne sur le port 8080.");
        } finally {
          setLoadingPrediction(false);
        }
      };

      loadPrediction();
    }
  }, [activeSectionIndex, id, formData.contrats]);

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
  const handleOcrApply = (patch, rawText) => {
    let updatedForm = { ...formData, ...patch };

    if (rawText) {
      setOcrTextContent(rawText);
      setShowOcrTextPanel(true);
      updatedForm.ocrText = rawText;
    }

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
            datePrevue: liv.datePrevue || '',
            dateReelle: ''
          });
        }
      });
    }

    setFormData(updatedForm);
    // Naviguer vers la section Infos pour voir le résultat
    navigateToSection(0);
  };

  const handleSave = async () => {
    if (!formData.nom) {
      setError("Le champ Nom du projet (Infos générales) est obligatoire.");
      navigateToSection(0);
      return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      const payload = { ...formData };
      if (payload.chefDeProjet && Array.isArray(payload.chefDeProjet)) {
        payload.chefDeProjet = payload.chefDeProjet.map(u => ({ id: u.id }));
      } else {
        payload.chefDeProjet = [];
      }

      if (id) {
        const isPmoOrAdmin = userInfo?.role === 'PMO' || userInfo?.role === 'ADMIN';
        let res = null;
        
        if (!isPmoOrAdmin && originalProject) {
          const normalizeDate = (d) => {
            if (!d) return '';
            return new Date(d).toISOString().split('T')[0];
          };
          
          const budgetChanged =
            Number(originalProject.budgetInitial ?? 0) !== Number(formData.budgetInitial ?? 0) ||
            normalizeDate(originalProject.dateFinPrevue) !== normalizeDate(formData.dateFinPrevue);
            
          const phasesChanged = (() => {
            const origPhases = originalProject.sousPhases || [];
            const currPhases = formData.sousPhases || [];
            if (origPhases.length !== currPhases.length) return true;
            for (let i = 0; i < origPhases.length; i++) {
              const op = origPhases[i];
              const cp = currPhases[i];
              if (
                op.nomPhase !== cp.nomPhase ||
                op.statut !== cp.statut ||
                normalizeDate(op.dateDebut) !== normalizeDate(cp.dateDebut) ||
                normalizeDate(op.dateFin) !== normalizeDate(cp.dateFin) ||
                op.urlPvReception !== cp.urlPvReception
              ) return true;
            }
            return false;
          })();

          let hasPendingValidations = false;
          if (budgetChanged) {
            await api.post('/validation-requests', {
              actionType: 'MODIFICATION_BUDGET',
              actionDescription: `Modification de budget proposée par le Chef de Projet : budget initial proposé à ${formData.budgetInitial} MAD (précédemment ${originalProject.budgetInitial} MAD) et date de fin au ${formData.dateFinPrevue ? new Date(formData.dateFinPrevue).toLocaleDateString('fr-FR') : '—'}.`,
              projectId: id,
              projectCode: originalProject.code,
              projetNom: originalProject.nom,
              requestedByUserId: userInfo?.id,
              requestedByUserName: `${userInfo?.prenom ?? ''} ${userInfo?.nom ?? ''}`.trim(),
              proposedChanges: JSON.stringify({
                budgetInitial: formData.budgetInitial,
                dateFinPrevue: formData.dateFinPrevue ? new Date(formData.dateFinPrevue).toISOString().split('T')[0] : null
              })
            });
            hasPendingValidations = true;
          }

          if (phasesChanged) {
            await api.post('/validation-requests', {
              actionType: 'VALIDATION_PHASE',
              actionDescription: `Modification de la planification des phases & livrables proposée par le Chef de Projet.`,
              projectId: id,
              projectCode: originalProject.code,
              projetNom: originalProject.nom,
              requestedByUserId: userInfo?.id,
              requestedByUserName: `${userInfo?.prenom ?? ''} ${userInfo?.nom ?? ''}`.trim(),
              proposedChanges: JSON.stringify({
                sousPhases: formData.sousPhases
              })
            });
            hasPendingValidations = true;
          }

          // Revert budget and phases in direct payload
          payload.budgetInitial = originalProject.budgetInitial;
          payload.dateFinPrevue = originalProject.dateFinPrevue;
          payload.sousPhases = originalProject.sousPhases ? originalProject.sousPhases.map(sp => ({ ...sp, projet: { id: parseInt(id) } })) : [];

          res = await api.put(`/projets/${id}`, payload);
          const p = res.data;
          
          setFormData({
            ...p,
            chefDeProjet: p.chefDeProjet || [],
            contrats: p.contrats || [],
            echeancesPaiement: p.echeancesPaiement || [],
            sousPhases: p.sousPhases ? p.sousPhases.map(sp => ({ ...sp, isApplied: true })) : [],
            risques: p.risques || [],
            documentsLies: p.documentsLies || [],
            copilInstances: p.copilInstances || []
          });

          if (hasPendingValidations) {
            setSuccess("Les autres informations ont été enregistrées. Les modifications de budget et/ou de phases ont été soumises au PMO pour validation.");
          } else {
            setSuccess("Le projet a été mis à jour avec succès.");
          }
        } else {
          res = await api.put(`/projets/${id}`, payload);
          const p = res.data;
          setFormData({
            ...p,
            chefDeProjet: p.chefDeProjet || [],
            contrats: p.contrats || [],
            echeancesPaiement: p.echeancesPaiement || [],
            sousPhases: p.sousPhases ? p.sousPhases.map(sp => ({ ...sp, isApplied: true })) : [],
            risques: p.risques || [],
            documentsLies: p.documentsLies || [],
            copilInstances: p.copilInstances || []
          });
          setSuccess("Le projet a été mis à jour avec succès.");
        }

        if (res?.data?.ocrText) {
          setOcrTextContent(res.data.ocrText);
        }
        if (res?.data?.todoList) {
          try {
            setTodoTasks(JSON.parse(res.data.todoList));
          } catch (e) {
            console.error("Erreur parsing todoList", e);
          }
        }
        setTimeout(() => setSuccess(''), 6000);
      } else {
        await api.post('/projets', payload);
        navigate('/projects');
      }
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

  const renderPrediction = () => {
    if (predictionError) {
      return (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600 animate-pulse" />
            11. IA Prédictive & Scoring
          </h3>
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center max-w-xl mx-auto my-8">
            <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
            <p className="text-slate-700 font-medium">{predictionError}</p>
          </div>
        </div>
      );
    }

    if (loadingPrediction) {
      return (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-600 animate-pulse" />
            11. IA Prédictive & Scoring
          </h3>
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                 style={{ borderColor: '#6B9B2D', borderTopColor: 'transparent' }} />
            <p className="text-slate-500 font-medium">Analyse intelligente en cours, veuillez patienter...</p>
          </div>
        </div>
      );
    }

    if (!predictionData) return null;

    const { scoreRisque, niveauRisque, facteursRisque, recommandations } = predictionData;

    // Déterminer la couleur de risque
    let ringColor = 'stroke-green-500';
    let textColor = 'text-green-600';
    let bgColor = 'bg-green-50 border-green-100';
    if (niveauRisque === 'Élevé') {
      ringColor = 'stroke-red-500';
      textColor = 'text-red-600';
      bgColor = 'bg-red-50 border-red-100';
    } else if (niveauRisque === 'Modéré') {
      ringColor = 'stroke-orange-500';
      textColor = 'text-orange-500';
      bgColor = 'bg-orange-50 border-orange-100';
    }

    // Convertir score prestataire en étoiles
    const renderStars = (score) => {
      const activeStars = Math.round(score / 20); // 0 to 5
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={`text-xl ${star <= activeStars ? 'text-yellow-400' : 'text-slate-200'}`}>★</span>
          ))}
          <span className="text-xs text-slate-400 ml-1 mt-1">({score}/100)</span>
        </div>
      );
    };

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary-600" />
              11. IA Prédictive & Scoring Prestataires
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Évaluation automatique du risque de retard et de la performance des prestataires.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Score de risque */}
          <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Risque de retard</h4>
            
            {/* Jauge circulaire SVG */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                <circle cx="50" cy="50" r="40" className={ringColor} strokeWidth="8" fill="transparent"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * scoreRisque) / 100}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-extrabold text-slate-800">{scoreRisque}%</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 ${bgColor} ${textColor}`}>
                  {niveauRisque}
                </span>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 mt-4 leading-relaxed">
              Calculé à partir de la météo, de l'état d'avancement des phases et de l'historique prestataire.
            </p>
          </div>

          {/* Card 2: Facteurs de risque */}
          <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Facteurs déclencheurs</h4>
            {facteursRisque.length === 0 ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-green-700">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">Aucun facteur de retard critique détecté.</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {facteursRisque.map((facteur, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className="w-2 h-2 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                    <span>{facteur}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Section Recommandations */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recommandations de l'IA</h4>
          <ul className="space-y-3">
            {recommandations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-800 border-l-4 border-primary-500 pl-4 py-1">
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Section Prestataire Performance */}
        {prestatairePerf ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="border-b border-slate-100 pb-4 mb-5 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Évaluation Prestataire : {prestatairePerf.nomPrestataire}</h4>
                <p className="text-xs text-slate-400 mt-0.5">Sur la base de {prestatairePerf.projetsAssociesCount} projet(s) associés.</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-bold uppercase">Note globale</p>
                <div className="mt-1">{renderStars(prestatairePerf.scoreGlobal)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-xs text-slate-400 font-semibold uppercase">Respect des délais</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{prestatairePerf.scoreRespectDelais}%</p>
                {prestatairePerf.retardMoyenJours > 0 && (
                  <p className="text-xs text-red-500 font-semibold mt-1">Retard moyen : {prestatairePerf.retardMoyenJours} jours</p>
                )}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-xs text-slate-400 font-semibold uppercase">Respect du budget</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{prestatairePerf.scoreRespectBudget}%</p>
                {prestatairePerf.glissementBudgetMoyen > 0 && (
                  <p className="text-xs text-red-500 font-semibold mt-1">Surcoût moyen : {prestatairePerf.glissementBudgetMoyen}%</p>
                )}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-xs text-slate-400 font-semibold uppercase">Qualité livrables</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">{prestatairePerf.scoreQualiteLivrables}%</p>
                <p className="text-xs text-slate-400 mt-1">Taux de validation des livrables</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-slate-50 border border-slate-200 border-dashed rounded-2xl text-center text-slate-400 text-sm">
            Aucun prestataire associé à ce projet ou historique de prestataire indisponible.
          </div>
        )}
      </div>
    );
  };

  // ── GESTION DES TACHES (TO-DO LIST) ───────────────────────────────────────
  
  const formatDateFr = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const monthsFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    return `${monthsFr[date.getMonth()]} ${date.getDate()}`;
  };

  const formatDateRangeFr = (startStr, endStr) => {
    if (!startStr) return '-';
    const start = new Date(startStr);
    if (isNaN(start.getTime())) return startStr;
    const monthsFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    
    if (!endStr) return `${monthsFr[start.getMonth()]} ${start.getDate()}`;
    const end = new Date(endStr);
    if (isNaN(end.getTime())) return `${monthsFr[start.getMonth()]} ${start.getDate()} - ${endStr}`;
    
    if (start.getMonth() === end.getMonth()) {
      return `${monthsFr[start.getMonth()]} ${start.getDate()} - ${end.getDate()}`;
    } else {
      return `${monthsFr[start.getMonth()]} ${start.getDate()} - ${monthsFr[end.getMonth()]} ${end.getDate()}`;
    }
  };

  const isPastDate = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return d < today;
  };

  const getTimeElapsed = (dateStr) => {
    if (!dateStr) return 'non modifié';
    const updatedDate = new Date(dateStr);
    const now = new Date();
    const diffMs = now - updatedDate;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'il y a quelques secondes';
    if (diffMins < 60) return `il y a ${diffMins} min...`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `il y a ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `il y a ${diffDays} j`;
  };

  const getOverallRange = (tasks) => {
    if (!tasks || tasks.length === 0) return '-';
    let minDate = null;
    let maxDate = null;
    tasks.forEach(t => {
      const dates = [t.dueDate, t.dueDateRangeStart, t.dueDateRangeEnd].filter(Boolean);
      dates.forEach(d => {
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) {
          if (!minDate || parsed < minDate) minDate = parsed;
          if (!maxDate || parsed > maxDate) maxDate = parsed;
        }
      });
    });
    if (!minDate || !maxDate) return '-';
    
    const monthsFr = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const minDay = minDate.getDate();
    const minMonth = monthsFr[minDate.getMonth()];
    const maxDay = maxDate.getDate();
    const maxMonth = monthsFr[maxDate.getMonth()];
    
    if (minDate.getMonth() === maxDate.getMonth()) {
      if (minDay === maxDay) return `${minMonth} ${minDay}`;
      return `${minMonth} ${minDay} - ${maxDay}`;
    } else {
      return `${minMonth} ${minDay} - ${maxMonth} ${maxDay}`;
    }
  };

  const handleAddTask = (section) => {
    const newTask = {
      id: 'task-' + Date.now() + Math.random().toString(36).substr(2, 9),
      name: 'Nouvelle tâche',
      admin: 'Chef de projet',
      status: section === 'done' ? 'Fait' : 'En cours',
      priority: 'Faible',
      remarks: '',
      budget: 0,
      files: [],
      dueDate: new Date().toISOString().split('T')[0],
      dueDateRangeStart: new Date().toISOString().split('T')[0],
      dueDateRangeEnd: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      lastUpdated: new Date().toISOString(),
      subtasks: []
    };
    setTodoTasks([...todoTasks, newTask]);
  };

  const handleUpdateTaskField = (taskId, field, value) => {
    setTodoTasks(prevTasks => prevTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          [field]: value,
          lastUpdated: new Date().toISOString()
        };
      }
      if (t.subtasks && t.subtasks.some(st => st.id === taskId)) {
        return {
          ...t,
          lastUpdated: new Date().toISOString(),
          subtasks: t.subtasks.map(st => st.id === taskId ? { ...st, [field]: value, lastUpdated: new Date().toISOString() } : st)
        };
      }
      return t;
    }));
  };

  const handleDeleteTask = (taskId) => {
    setTodoTasks(prevTasks => prevTasks.filter(t => {
      if (t.id === taskId) return false;
      if (t.subtasks) {
        t.subtasks = t.subtasks.filter(st => st.id !== taskId);
      }
      return true;
    }));
  };

  const handleToggleSelectTask = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleToggleSelectAll = (tasksInGroup) => {
    const taskIds = tasksInGroup.flatMap(t => [t.id, ...(t.subtasks || []).map(st => st.id)]);
    const allSelected = taskIds.length > 0 && taskIds.every(id => selectedTasks.has(id));
    const newSelected = new Set(selectedTasks);
    if (allSelected) {
      taskIds.forEach(id => newSelected.delete(id));
    } else {
      taskIds.forEach(id => newSelected.add(id));
    }
    setSelectedTasks(newSelected);
  };

  const toggleTaskExpand = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const renderStatusAlertIcon = (status) => {
    switch (status) {
      case 'En cours':
        return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case 'Fait':
        return <Check className="w-5 h-5 text-green-500 shrink-0" />;
      case 'Bloqué':
        return <Clock className="w-5 h-5 text-slate-400 shrink-0" />;
      default:
        return null;
    }
  };

  const renderDatePickerPopover = (task) => {
    if (activeDatePicker !== task.id) return null;
    return (
      <>
        <div className="fixed inset-0 z-20" onClick={() => setActiveDatePicker(null)} />
        <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col gap-2.5 w-52 text-slate-800 text-left">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Échéance</span>
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={(e) => handleUpdateTaskField(task.id, 'dueDate', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="border-t border-slate-100 my-1" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Début Échéancier</span>
            <input
              type="date"
              value={task.dueDateRangeStart || ''}
              onChange={(e) => handleUpdateTaskField(task.id, 'dueDateRangeStart', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fin Échéancier</span>
            <input
              type="date"
              value={task.dueDateRangeEnd || ''}
              onChange={(e) => handleUpdateTaskField(task.id, 'dueDateRangeEnd', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setActiveDatePicker(null)}
            className="bg-slate-800 text-white rounded-lg text-xs py-1.5 font-semibold hover:bg-slate-900 transition-colors shadow-sm"
          >
            Fermer
          </button>
        </div>
      </>
    );
  };

  const renderTaskRow = (task, isSubtask = false, parentId = null) => {
    const isSelected = selectedTasks.has(task.id);
    const hasSubtasks = !isSubtask && task.subtasks && task.subtasks.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    
    let statusBg = 'bg-amber-500 text-white';
    if (task.status === 'Fait') statusBg = 'bg-emerald-500 text-white';
    else if (task.status === 'Bloqué') statusBg = 'bg-rose-600 text-white';

    let priorityBg = 'bg-sky-500 text-white';
    if (task.priority === 'Moyenne') priorityBg = 'bg-blue-600 text-white';
    else if (task.priority === 'Élevé') priorityBg = 'bg-violet-700 text-white';

    const singleDateText = formatDateFr(task.dueDate);
    let singleDateBg = 'bg-blue-500 text-white';
    if (task.status === 'Fait') singleDateBg = 'bg-emerald-500 text-white';
    else if (isPastDate(task.dueDate)) singleDateBg = 'bg-neutral-800 text-slate-200';

    const rangeDateText = formatDateRangeFr(task.dueDateRangeStart, task.dueDateRangeEnd);
    let rangeDateBg = 'bg-blue-500 text-white';
    let hasCheck = false;
    if (task.status === 'Fait') {
      rangeDateBg = 'bg-emerald-500 text-white';
      hasCheck = true;
    } else if (isPastDate(task.dueDateRangeEnd || task.dueDate)) {
      rangeDateBg = 'bg-neutral-800 text-slate-200';
    }

    return (
      <tr 
        key={task.id} 
        className={`hover:bg-slate-50/80 transition-colors border-b border-slate-100 ${
          task.status === 'Fait' ? 'border-l-[6px] border-emerald-500' : 'border-l-[6px] border-blue-500'
        }`}
      >
        <td className="px-3 py-2.5 text-center align-middle">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleToggleSelectTask(task.id)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
          />
        </td>

        <td className="px-3 py-2.5 align-middle">
          <div className="flex items-center gap-2" style={{ paddingLeft: isSubtask ? '24px' : '0px' }}>
            {isSubtask && <span className="text-slate-400 font-mono select-none">└─</span>}
            
            {hasSubtasks ? (
              <button 
                onClick={() => toggleTaskExpand(task.id)}
                className="text-slate-500 hover:text-slate-800 p-0.5"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : !isSubtask ? (
              <span className="w-5" />
            ) : null}

            <input
              type="text"
              value={task.name || ''}
              onChange={(e) => handleUpdateTaskField(task.id, 'name', e.target.value)}
              className="text-sm font-semibold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white px-1 py-0.5 rounded outline-none w-full min-w-[150px]"
            />

            {!isSubtask && (
              <button
                onClick={() => setActiveSubtaskInput(activeSubtaskInput === task.id ? null : task.id)}
                className="p-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-all border border-slate-200 hover:border-indigo-200"
                title="Ajouter une sous-tâche"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {!isSubtask && activeSubtaskInput === task.id && (
            <div className="flex items-center gap-1.5 mt-2 ml-7" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                placeholder="Nom de la sous-tâche..."
                value={newSubtaskName}
                onChange={(e) => setNewSubtaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSubtaskName.trim()) {
                      const st = {
                        id: 'subtask-' + Date.now() + Math.random().toString(36).substr(2, 9),
                        name: newSubtaskName.trim(),
                        admin: task.admin || 'Chef de projet',
                        status: 'En cours',
                        priority: 'Faible',
                        remarks: '',
                        budget: 0,
                        files: [],
                        dueDate: task.dueDate,
                        dueDateRangeStart: task.dueDateRangeStart,
                        dueDateRangeEnd: task.dueDateRangeEnd,
                        lastUpdated: new Date().toISOString()
                      };
                      handleUpdateTaskField(task.id, 'subtasks', [...(task.subtasks || []), st]);
                      setNewSubtaskName('');
                      setActiveSubtaskInput(null);
                      const newExpanded = new Set(expandedTasks);
                      newExpanded.add(task.id);
                      setExpandedTasks(newExpanded);
                    }
                  } else if (e.key === 'Escape') {
                    setActiveSubtaskInput(null);
                  }
                }}
                className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 w-full max-w-[200px]"
                autoFocus
              />
              <button
                onClick={() => {
                  if (newSubtaskName.trim()) {
                    const st = {
                      id: 'subtask-' + Date.now() + Math.random().toString(36).substr(2, 9),
                      name: newSubtaskName.trim(),
                      admin: task.admin || 'Chef de projet',
                      status: 'En cours',
                      priority: 'Faible',
                      remarks: '',
                      budget: 0,
                      files: [],
                      dueDate: task.dueDate,
                      dueDateRangeStart: task.dueDateRangeStart,
                      dueDateRangeEnd: task.dueDateRangeEnd,
                      lastUpdated: new Date().toISOString()
                    };
                    handleUpdateTaskField(task.id, 'subtasks', [...(task.subtasks || []), st]);
                    setNewSubtaskName('');
                    setActiveSubtaskInput(null);
                    const newExpanded = new Set(expandedTasks);
                    newExpanded.add(task.id);
                    setExpandedTasks(newExpanded);
                  }
                }}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors shadow-sm"
              >
                Ajouter
              </button>
            </div>
          )}
        </td>

        <td className="px-3 py-2.5 text-center align-middle relative">
          <button
            onClick={() => setActiveAdminPopover(activeAdminPopover === task.id ? null : task.id)}
            className="w-8 h-8 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 flex items-center justify-center text-slate-500 hover:text-indigo-600 transition-colors mx-auto"
            title={`Assigné à : ${task.admin || 'Non attribué'}`}
          >
            <UserCircle className="w-5 h-5" />
          </button>
          
          {activeAdminPopover === task.id && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setActiveAdminPopover(null)} />
              <div className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-1 p-2 bg-white border border-slate-200 rounded-xl shadow-xl w-48 text-slate-800 text-left">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1 mb-1">Attribuer à</h4>
                <div className="max-h-40 overflow-y-auto space-y-0.5">
                  <button
                    onClick={() => { handleUpdateTaskField(task.id, 'admin', 'Charaf Bentefrit'); setActiveAdminPopover(null); }}
                    className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center">CB</div>
                    <span>Charaf Bentefrit</span>
                  </button>
                  {formData.nomChefDeProjet && formData.nomChefDeProjet !== 'Charaf Bentefrit' && (
                    <button
                      onClick={() => { handleUpdateTaskField(task.id, 'admin', formData.nomChefDeProjet); setActiveAdminPopover(null); }}
                      className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-500 text-white font-bold text-[9px] flex items-center justify-center">
                        {formData.nomChefDeProjet.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <span>{formData.nomChefDeProjet}</span>
                    </button>
                  )}
                  {formData.chefDeProjet && formData.chefDeProjet.map((chef) => {
                    const name = `${chef.prenom || ''} ${chef.nom || ''}`.trim();
                    if (name === 'Charaf Bentefrit' || name === formData.nomChefDeProjet) return null;
                    const initials = `${chef.prenom?.[0] || ''}${chef.nom?.[0] || ''}`.toUpperCase();
                    return (
                      <button
                        key={chef.id}
                        onClick={() => { handleUpdateTaskField(task.id, 'admin', name); setActiveAdminPopover(null); }}
                        className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[9px] flex items-center justify-center">
                          {initials}
                        </div>
                        <span>{name} (Chef)</span>
                      </button>
                    );
                  })}
                  {formData.membres && formData.membres.map((memb) => {
                    const name = `${memb.prenom || ''} ${memb.nom || ''}`.trim();
                    if (name === 'Charaf Bentefrit' || name === formData.nomChefDeProjet || formData.chefDeProjet?.some(c => `${c.prenom || ''} ${c.nom || ''}`.trim() === name)) return null;
                    const initials = `${memb.prenom?.[0] || ''}${memb.nom?.[0] || ''}`.toUpperCase();
                    return (
                      <button
                        key={memb.id}
                        onClick={() => { handleUpdateTaskField(task.id, 'admin', name); setActiveAdminPopover(null); }}
                        className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary-600 text-white font-bold text-[9px] flex items-center justify-center">{initials}</div>
                        <span>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </td>

        <td className="px-3 py-2.5 align-middle relative">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setActiveDropdown({ taskId: task.id, field: 'status' })}
              className={`w-28 text-center px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all hover:opacity-90 ${statusBg}`}
            >
              {task.status}
            </button>
            {renderStatusAlertIcon(task.status)}
          </div>

          {activeDropdown && activeDropdown.taskId === task.id && activeDropdown.field === 'status' && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setActiveDropdown(null)} />
              <div className="absolute z-35 top-full left-1/2 -translate-x-1/2 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 text-xs text-slate-800 text-left">
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'status', 'En cours'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>En cours</span>
                </button>
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'status', 'Fait'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Fait</span>
                </button>
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'status', 'Bloqué'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span>Bloqué</span>
                </button>
              </div>
            </>
          )}
        </td>

        <td className="px-3 py-2.5 text-center align-middle relative">
          <button
            onClick={() => setActiveDatePicker(task.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm transition-all hover:opacity-90 inline-block ${singleDateBg}`}
          >
            {singleDateText}
          </button>
          {renderDatePickerPopover(task)}
        </td>

        <td className="px-3 py-2.5 align-middle relative">
          <button
            onClick={() => setActiveDropdown({ taskId: task.id, field: 'priority' })}
            className={`w-24 text-center px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all hover:opacity-90 ${priorityBg}`}
          >
            {task.priority}
          </button>

          {activeDropdown && activeDropdown.taskId === task.id && activeDropdown.field === 'priority' && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setActiveDropdown(null)} />
              <div className="absolute z-35 top-full left-1/2 -translate-x-1/2 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 text-xs text-slate-800 text-left">
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'priority', 'Faible'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>Faible</span>
                </button>
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'priority', 'Moyenne'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <span>Moyenne</span>
                </button>
                <button
                  onClick={() => { handleUpdateTaskField(task.id, 'priority', 'Élevé'); setActiveDropdown(null); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors font-medium text-slate-700"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-violet-700" />
                  <span>Élevé</span>
                </button>
              </div>
            </>
          )}
        </td>

        <td className="px-3 py-2.5 align-middle">
          <input
            type="text"
            value={task.remarks || ''}
            onChange={(e) => handleUpdateTaskField(task.id, 'remarks', e.target.value)}
            className="text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:bg-white rounded px-2 py-1 outline-none w-full min-w-[120px]"
            placeholder="Saisir une remarque..."
          />
        </td>

        <td className="px-3 py-2.5 text-center align-middle font-bold text-slate-800">
          <div className="flex items-center justify-center gap-0.5 border-b border-transparent hover:border-slate-200 focus-within:border-indigo-500 focus-within:bg-white rounded px-1.5 py-0.5">
            <input
              type="number"
              value={task.budget === 0 ? '' : task.budget}
              onChange={(e) => handleUpdateTaskField(task.id, 'budget', e.target.value === '' ? 0 : Number(e.target.value))}
              className="text-xs text-slate-800 bg-transparent outline-none w-16 text-center font-bold"
              placeholder="0"
            />
            <span className="text-[10px] text-slate-400 font-semibold">MAD</span>
          </div>
        </td>

        <td className="px-3 py-2.5 text-center align-middle relative">
          {task.files && task.files.length > 0 ? (
            <button
              onClick={() => setActiveFilePopover(activeFilePopover === task.id ? null : task.id)}
              className="p-1.5 rounded bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600 transition-colors inline-block"
              title={`${task.files.length} fichiers joints`}
            >
              <Image className="w-4.5 h-4.5" />
            </button>
          ) : (
            <button
              onClick={() => setActiveFilePopover(activeFilePopover === task.id ? null : task.id)}
              className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors inline-block"
              title="Attacher des fichiers"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}

          {activeFilePopover === task.id && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setActiveFilePopover(null)} />
              <div className="absolute z-30 top-full right-0 mt-1 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xl w-64 text-slate-800 text-left">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pièces jointes</h4>
                
                {task.files && task.files.length > 0 ? (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto mb-3 pr-1">
                    {task.files.map((file, fIdx) => (
                      <div key={fIdx} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs">
                        <a
                          href={file.url ? (api.defaults.baseURL.replace('/api', '') + file.url) : '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline truncate flex-1 pr-1 font-semibold"
                          title={file.name}
                        >
                          {file.name}
                        </a>
                        <button
                          onClick={() => {
                            const updatedFiles = task.files.filter((_, i) => i !== fIdx);
                            handleUpdateTaskField(task.id, 'files', updatedFiles);
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic mb-3">Aucun fichier joint.</p>
                )}

                <div className="relative">
                  <input
                    type="file"
                    id={`task-file-uploader-${task.id}`}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('file', file);
                      try {
                        const res = await api.post('/files/upload', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' },
                        });
                        const { fileUrl, fileName } = res.data;
                        const updatedFiles = [...(task.files || []), { url: fileUrl, name: fileName }];
                        handleUpdateTaskField(task.id, 'files', updatedFiles);
                      } catch (err) {
                        console.error("Erreur d'envoi", err);
                      }
                    }}
                  />
                  <button
                    onClick={() => document.getElementById(`task-file-uploader-${task.id}`).click()}
                    className="w-full bg-slate-800 text-white rounded-lg text-xs py-1.5 font-semibold hover:bg-slate-900 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    Ajouter un fichier
                  </button>
                </div>
              </div>
            </>
          )}
        </td>

        <td className="px-3 py-2.5 text-center align-middle relative">
          <button
            onClick={() => setActiveDatePicker(task.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm transition-all hover:opacity-90 inline-flex items-center gap-1.5 ${rangeDateBg}`}
          >
            {hasCheck && <Check className="w-3.5 h-3.5" />}
            <span>{rangeDateText}</span>
          </button>
        </td>

        <td className="px-3 py-2.5 align-middle text-slate-500 text-xs text-center">
          <div className="flex items-center gap-2 justify-center">
            <div className="w-6 h-6 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 fill-white text-white" />
            </div>
            <span className="truncate max-w-[100px]">{getTimeElapsed(task.lastUpdated)}</span>
          </div>
        </td>

        <td className="px-3 py-2.5 text-center align-middle">
          <button
            onClick={() => handleDeleteTask(task.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Supprimer la tâche"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
    );
  };

  const renderTachesTable = (tasksInGroup, sectionId) => {
    const isExpanded = sectionId === 'todo' ? todoExpanded : doneExpanded;
    const setExpanded = sectionId === 'todo' ? setTodoExpanded : setDoneExpanded;
    const sectionTitle = sectionId === 'todo' ? 'To-do' : 'Terminé';
    const titleColorClass = sectionId === 'todo' ? 'text-blue-500 border-blue-500' : 'text-emerald-500 border-emerald-500';
    
    const groupTaskIds = tasksInGroup.flatMap(t => [t.id, ...(t.subtasks || []).map(st => st.id)]);
    const allSelected = groupTaskIds.length > 0 && groupTaskIds.every(id => selectedTasks.has(id));

    const isDoneEmpty = sectionId === 'done' && tasksInGroup.length === 0;
    const budgetSum = isDoneEmpty ? 0 : tasksInGroup.reduce((sum, t) => sum + (t.budget || 0), 0);
    const filesCount = isDoneEmpty ? 0 : tasksInGroup.reduce((count, t) => count + ((t.files && t.files.length) || 0), 0);
    const rangeText = getOverallRange(tasksInGroup);

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white mb-6 transition-all duration-300">
        <div 
          onClick={() => setExpanded(!isExpanded)}
          className={`flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200 cursor-pointer select-none`}
        >
          <div className="flex items-center gap-3">
            <button className={`p-1 rounded-md hover:bg-slate-200 transition-colors text-slate-500`}>
              {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <h3 className={`text-base font-bold ${titleColorClass}`}>
              {sectionTitle}
            </h3>
            <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {tasksInGroup.length}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold">
                  <th className="px-3 py-3 w-12 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => handleToggleSelectAll(tasksInGroup)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 min-w-[200px] align-middle">Tâche</th>
                  <th className="px-3 py-3 w-16 text-center align-middle">Admin</th>
                  <th className="px-3 py-3 w-36 text-center align-middle relative group">
                    <div className="inline-flex items-center gap-1">
                      <span>Statut</span>
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </div>
                  </th>
                  <th className="px-3 py-3 w-32 text-center align-middle relative group">
                    <div className="inline-flex items-center gap-1">
                      <span>Échéance</span>
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </div>
                  </th>
                  <th className="px-3 py-3 w-32 text-center align-middle">Priorité</th>
                  <th className="px-3 py-3 min-w-[150px] align-middle">Remarques</th>
                  <th className="px-3 py-3 w-28 text-center align-middle">Budget</th>
                  <th className="px-3 py-3 w-24 text-center align-middle">Fichiers</th>
                  <th className="px-3 py-3 w-36 text-center align-middle relative group">
                    <div className="inline-flex items-center gap-1">
                      <span>Échéancier</span>
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </div>
                  </th>
                  <th className="px-3 py-3 w-44 text-center align-middle">Dernière mise à jour</th>
                  <th className="px-3 py-3 w-16 text-center align-middle"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tasksInGroup.map(task => (
                  <Fragment key={task.id}>
                    {renderTaskRow(task)}
                    {task.subtasks && expandedTasks.has(task.id) && task.subtasks.map(st => (
                      renderTaskRow(st, true, task.id)
                    ))}
                  </Fragment>
                ))}

                {tasksInGroup.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-5 py-8 text-center text-slate-400 italic text-sm">
                      Aucune tâche dans cette section.
                    </td>
                  </tr>
                )}

                <tr className="bg-slate-50/50">
                  <td className="px-3 py-2 text-center"></td>
                  <td colSpan={11} className="px-3 py-2">
                    <button
                      onClick={() => handleAddTask(sectionId)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 py-1"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter tâche
                    </button>
                  </td>
                </tr>
              </tbody>

              <tfoot>
                <tr className={`bg-slate-100/80 border-t border-slate-200 font-bold text-slate-700 text-xs ${
                  sectionId === 'todo' ? 'border-l-[6px] border-blue-500' : 'border-l-[6px] border-emerald-500'
                }`}>
                  <td className="px-3 py-3.5"></td>
                  <td className="px-3 py-3.5 text-left text-slate-500 uppercase tracking-wider font-extrabold">
                    Synthèse
                  </td>
                  <td className="px-3 py-3.5"></td>
                  
                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex items-center justify-center">
                      <div className="flex w-16 h-3.5 rounded overflow-hidden shadow-inner border border-slate-200">
                        <div className="flex-1 bg-emerald-500" title="Fait" />
                        <div className="flex-1 bg-amber-500" title="En cours" />
                        <div className="flex-1 bg-rose-600" title="Bloqué" />
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3.5 text-center align-middle">
                    {rangeText !== '-' ? (
                      <span className="px-3 py-1 bg-slate-800 text-white rounded-full font-bold text-[10px] shadow-sm tracking-wide">
                        {rangeText}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-300 text-slate-500 rounded-full font-bold text-[10px]">
                        -
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3.5 align-middle">
                    <div className="flex items-center justify-center">
                      <div className="flex w-16 h-3.5 rounded overflow-hidden shadow-inner border border-slate-200">
                        <div className="flex-1 bg-sky-500" title="Faible" />
                        <div className="flex-1 bg-blue-600" title="Moyenne" />
                        <div className="flex-1 bg-violet-700" title="Élevé" />
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3.5"></td>

                  <td className="px-3 py-3.5 text-center align-middle font-black text-slate-800 text-[13px]">
                    <div className="flex flex-col items-center">
                      <span>${budgetSum.toLocaleString()}</span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-normal -mt-0.5">Somme</span>
                    </div>
                  </td>

                  <td className="px-3 py-3.5 text-center align-middle text-slate-700">
                    <div className="flex flex-col items-center">
                      <span>{filesCount}</span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-normal -mt-0.5">fichiers</span>
                    </div>
                  </td>

                  <td className="px-3 py-3.5"></td>
                  <td className="px-3 py-3.5"></td>
                  <td className="px-3 py-3.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderTaches = () => {
    const todoGroup = todoTasks.filter(t => t.status !== 'Fait');
    const doneGroup = todoTasks.filter(t => t.status === 'Fait');

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary-600" />
            11. Gestion des tâches (To-do list)
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Gérez et suivez en temps réel l'avancement des tâches et des livrables de votre projet.
          </p>
        </div>

        {renderTachesTable(todoGroup, 'todo')}
        {renderTachesTable(doneGroup, 'done')}
      </div>
    );
  };

  const getActiveView = () => {
    const section = SECTIONS[activeSectionIndex];
    if (!section) return null;
    switch (section.id) {
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
      case 'prediction': return renderPrediction();
      default: return null;
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50 overflow-hidden">
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
          {/* Bouton Voir Document Extrait (s'affiche après analyse) */}
          {ocrTextContent && (
            <button
              onClick={() => setShowOcrTextPanel(prev => !prev)}
              className={`flex items-center gap-2 px-4 py-2.5 border font-medium rounded-lg transition-colors ${
                showOcrTextPanel
                  ? 'border-indigo-600 text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm'
                  : 'border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
              }`}
              title="Afficher/masquer le panneau latéral du texte brut du PDF"
            >
              <FileText className="w-4 h-4" />
              {showOcrTextPanel ? 'Masquer le texte brut' : 'Visualiser le document'}
            </button>
          )}
          {/* Bouton OCR Import */}
          <button
            onClick={() => setShowOcrModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-primary-300 text-primary-700 bg-primary-50 hover:bg-primary-100 font-medium rounded-lg transition-colors"
            title="Importer et extraire automatiquement les données depuis un document PDF"
          >
            <Sparkles className="w-4 h-4" />
            Import OCR
          </button>
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-medium rounded-lg transition-colors shadow-sm"
            title="Retourner à la liste des projets"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la liste
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
                  onClick={() => navigateToSection(index)}
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
          {success && (
            <div className="mx-8 mt-4 p-3.5 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-fade-in shrink-0">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <span className="text-sm font-semibold">{success}</span>
              </div>
              <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-800 p-0.5 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {error && (
            <div className="mx-8 mt-4 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center justify-between gap-2 shadow-sm animate-fade-in shrink-0">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="text-sm font-semibold">{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 p-0.5 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
              {getActiveView()}
            </div>
          </div>

          {/* Footer actions */}
          <div className="bg-slate-50 border-t border-slate-200 p-4 px-8 flex justify-between items-center shrink-0">
            <button
              disabled={activeSectionIndex === 0}
              onClick={() => navigateToSection(activeSectionIndex - 1)}
              className="flex items-center gap-2 px-4 py-2 font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>
            <div className="flex items-center gap-4">
              {activeSectionIndex < SECTIONS.length - 1 && (
                <button onClick={() => navigateToSection(activeSectionIndex + 1)} className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-900">
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Panneau latéral persistant pour le texte OCR brut */}
        {showOcrTextPanel && ocrTextContent && (
          <div className="w-[480px] bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden shrink-0 shadow-2xl animate-slide-in">
            {/* Header du volet */}
            <div className="p-4.5 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <FileText className="w-4.5 h-4.5 text-indigo-400" />
                </div>
                <span>Texte Brut Extrait (PDF)</span>
              </h3>
              <button
                onClick={() => setShowOcrTextPanel(false)}
                className="p-1.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/50"
                title="Fermer le volet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Barre de recherche intégrée */}
            <div className="p-4 bg-slate-900 border-b border-slate-800/80 shrink-0 flex items-center gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  ref={ocrSearchInputRef}
                  type="text"
                  placeholder="Rechercher dans le texte..."
                  value={ocrSearchQuery}
                  onChange={(e) => handleOcrSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (totalMatches === 0) return;
                      if (e.shiftKey) {
                        setCurrentMatchIndex(prev => (prev - 1 + totalMatches) % totalMatches);
                      } else {
                        setCurrentMatchIndex(prev => (prev + 1) % totalMatches);
                      }
                    }
                  }}
                  className="w-full pl-9 pr-8 py-2.5 text-xs border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none bg-slate-950 text-slate-100 placeholder-slate-500 font-medium transition-all shadow-inner"
                />
                {ocrSearchQuery && (
                  <button
                    onClick={() => handleOcrSearch('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Compteur et boutons de navigation de recherche */}
              {totalMatches > 0 ? (
                <div className="flex items-center gap-2 shrink-0 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/25">
                  <span className="text-xs font-mono font-bold text-indigo-400 tracking-wider">
                    {currentMatchIndex + 1}/{totalMatches}
                  </span>
                  <div className="flex items-center border-l border-indigo-500/20 pl-2 gap-1">
                    <button
                      onClick={() => setCurrentMatchIndex(prev => (prev - 1 + totalMatches) % totalMatches)}
                      className="p-1 hover:bg-indigo-500/20 rounded text-indigo-400 hover:text-indigo-200 transition-all border border-transparent hover:border-indigo-500/30"
                      title="Précédent (Shift + Entrée)"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentMatchIndex(prev => (prev + 1) % totalMatches)}
                      className="p-1 hover:bg-indigo-500/20 rounded text-indigo-400 hover:text-indigo-200 transition-all border border-transparent hover:border-indigo-500/30"
                      title="Suivant (Entrée)"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : ocrSearchQuery ? (
                <div className="shrink-0 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
                  <span className="text-[10px] font-semibold text-red-400">Aucun résultat</span>
                </div>
              ) : null}
            </div>

            {/* Contenu textuel */}
            <div className="p-4 space-y-4 flex-1 flex flex-col overflow-hidden">
              <div className="text-xs text-slate-400 bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 leading-relaxed flex items-start gap-2">
                <span className="text-indigo-400 shrink-0 font-bold">💡</span>
                <span>
                  <strong>Astuce :</strong> Appuyez sur <kbd className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px]">Entrée</kbd> pour le match suivant, et <kbd className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono text-[10px]">Shift+Entrée</kbd> pour le précédent.
                </span>
              </div>
              <div className="bg-slate-950 text-slate-200 p-4.5 rounded-xl font-mono text-xs whitespace-pre-wrap overflow-y-auto flex-1 border border-slate-800/80 selection:bg-indigo-500/30 selection:text-white leading-relaxed tracking-wide shadow-inner scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {getHighlightedText()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewProjectWizard;
