import { useState } from 'react';
import { UploadCloud, CheckCircle, X, Loader2 } from 'lucide-react';
import api from '../api/axios';

const FileUpload = ({ label, onUploadSuccess, accept = "*/*", existingUrl = null }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [fileUrl, setFileUrl] = useState(existingUrl);
  const [fileName, setFileName] = useState(existingUrl ? existingUrl.split('/').pop() : null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Configuration explicite pour multipart/form-data
      const response = await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { fileUrl: uploadedUrl, fileName: uploadedName } = response.data;
      setFileUrl(uploadedUrl);
      setFileName(uploadedName);

      if (onUploadSuccess) {
        onUploadSuccess(uploadedUrl);
      }
    } catch (err) {
      setError("Erreur d'envoi. Taille max 50MB.");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    setFileUrl(null);
    setFileName(null);
    if (onUploadSuccess) {
      onUploadSuccess(null);
    }
  };

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}

      {fileUrl ? (
        <div className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 overflow-hidden">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <a href={api.defaults.baseURL.replace('/api', '') + fileUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-green-700 truncate hover:underline">
              {fileName || 'Document attaché'}
            </a>
          </div>
          <button onClick={handleClear} className="text-slate-400 hover:text-red-500 transition-colors shrink-0 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="file"
            onChange={handleFileChange}
            disabled={isUploading}
            accept={accept}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className={`flex items-center justify-center p-3 border-2 border-dashed rounded-lg transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:border-primary-500 hover:bg-slate-50'
            } ${isUploading ? 'opacity-50' : ''}`}>
            {isUploading ? (
              <div className="flex items-center gap-2 text-primary-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Envoi en cours...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-500">
                <UploadCloud className="w-5 h-5" />
                <span className="text-sm font-medium truncate">
                  {error ? <span className="text-red-600">{error}</span> : "Cliquer ou glisser pour ajouter un fichier"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
