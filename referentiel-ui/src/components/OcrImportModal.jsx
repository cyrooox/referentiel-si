import { useState, useRef } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader, Sparkles } from 'lucide-react';
import api from '../api/axios';

/**
 * Modal d'import OCR : permet d'uploader un PDF et de pré-remplir
 * automatiquement les 5 sections du formulaire projet.
 */
const OcrImportModal = ({ onClose, onApply }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (f) => {
    if (f && f.type === 'application/pdf') {
      setFile(f);
      setStatus('idle');
      setResult(null);
    } else {
      setErrorMsg('Seuls les fichiers PDF sont acceptés.');
      setStatus('error');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleExtract = async () => {
    if (!file) return;
    setStatus('loading');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/ocr/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.response?.data || 'Erreur lors de l\'extraction OCR.');
      setStatus('error');
    }
  };

  const handleApply = () => {
    if (!result) return;

    // Construire les données à injecter dans formData du wizard
    const patch = {};

    if (result.nom) patch.nom = result.nom;
    if (result.description) patch.description = result.description;
    if (result.type) patch.type = result.type;
    if (result.directionMetier) patch.directionMetier = result.directionMetier;
    if (result.statut) patch.statut = result.statut;
    if (result.phaseCourante) patch.phaseCourante = result.phaseCourante;
    if (result.nomChefDeProjet) patch.nomChefDeProjet = result.nomChefDeProjet;
    if (result.dateDebutPrevue) patch.dateDebutPrevue = result.dateDebutPrevue;
    if (result.dateFinPrevue) patch.dateFinPrevue = result.dateFinPrevue;
    if (result.dateCreation) patch.dateCreation = result.dateCreation;
    if (result.budgetInitial) patch.budgetInitial = result.budgetInitial;

    // Pré-remplir le premier contrat si des données contrat sont disponibles
    if (result.referenceContrat || result.objetMarche || result.prestataire) {
      patch.contrats = [{
        objet: result.objetMarche || '',
        prestataires: result.prestataire || '',
        typeMarche: result.typeMarche || '',
        reference: result.referenceContrat || '',
        delaiExecutionMois: result.delaiExecutionMois || 0,
        montantContractuel: result.montantContractuel || 0,
        urlDocument: '',
      }];
    }

    onApply(patch);
    onClose();
  };

  const fieldsDetected = result ? Object.entries({
    'Nom du projet': result.nom,
    'Description': result.description,
    'Chef de projet': result.nomChefDeProjet,
    'Direction métier': result.directionMetier,
    'Type de projet': result.type,
    'Statut': result.statut,
    'Type de marché': result.typeMarche,
    'Prestataire': result.prestataire,
    'Référence contrat': result.referenceContrat,
    'Date début': result.dateDebutPrevue,
    'Date fin': result.dateFinPrevue,
    'Montant contractuel': result.montantContractuel ? `${result.montantContractuel.toLocaleString()} MAD` : null,
    'Budget initial': result.budgetInitial ? `${result.budgetInitial.toLocaleString()} MAD` : null,
    'Délai d\'exécution': result.delaiExecutionMois ? `${result.delaiExecutionMois} mois` : null,
  }).filter(([, v]) => v) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700">
          <div className="flex items-center gap-3 text-white">
            <Sparkles className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-bold">Import intelligent OCR</h2>
              <p className="text-primary-200 text-xs">Extrait automatiquement les données de votre document</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Zone de drop */}
          {status !== 'success' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${isDragging ? 'border-primary-500 bg-primary-50' : file ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-green-500" />
                  <p className="font-semibold text-green-700">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} Ko — Cliquez pour changer</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Upload className="w-10 h-10 text-primary-400" />
                  <p className="font-medium">Glissez un PDF ici ou cliquez pour parcourir</p>
                  <p className="text-xs">Contrat PDF, fiche projet, bon de commande...</p>
                </div>
              )}
            </div>
          )}

          {/* Résultats extraits */}
          {status === 'success' && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700 font-semibold">
                <CheckCircle className="w-5 h-5" />
                <span>{fieldsDetected.length} champ(s) extrait(s) depuis {result.nbPagesTraitees} page(s)</span>
              </div>

              {fieldsDetected.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {fieldsDetected.map(([label, value]) => (
                    <div key={label} className="bg-primary-50 border border-primary-100 rounded-lg px-4 py-2">
                      <p className="text-xs text-primary-600 font-medium">{label}</p>
                      <p className="text-sm text-slate-800 font-semibold truncate" title={String(value)}>{String(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  ⚠️ Aucune information structurée n'a pu être extraite. Le document ne contient peut-être pas de texte natif (PDF scanné).
                </div>
              )}

              <button
                onClick={() => { setFile(null); setStatus('idle'); setResult(null); }}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                ← Réessayer avec un autre document
              </button>
            </div>
          )}

          {/* Erreur */}
          {status === 'error' && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">
            Annuler
          </button>
          <div className="flex gap-3">
            {status !== 'success' && (
              <button
                onClick={handleExtract}
                disabled={!file || status === 'loading'}
                className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'loading' ? (
                  <><Loader className="w-4 h-4 animate-spin" /> Extraction en cours...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Extraire les données</>
                )}
              </button>
            )}
            {status === 'success' && fieldsDetected.length > 0 && (
              <button
                onClick={handleApply}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" /> Appliquer au formulaire
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OcrImportModal;
