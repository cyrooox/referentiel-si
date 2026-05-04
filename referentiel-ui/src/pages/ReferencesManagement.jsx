import { useState, useEffect } from 'react';
import { Database, Plus, Trash2 } from 'lucide-react';
import api from '../api/axios';

const CATEGORIES = [
  { id: 'TYPE_PROJET', name: 'Type de Projet' },
  { id: 'DIRECTION_METIER', name: 'Direction Métier' }
];

const ReferencesManagement = () => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newRef, setNewRef] = useState({ code: '', libelle: '' });

  useEffect(() => {
    fetchReferences();
  }, [activeCategory]);

  const fetchReferences = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/references/categorie/${activeCategory}`);
      setReferences(response.data);
    } catch (error) {
      console.error("Erreur de récupération des références", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette valeur ?")) {
      try {
        await api.delete(`/references/${id}`);
        setReferences(references.filter(r => r.id !== id));
      } catch (error) {
        console.error("Erreur de suppression", error);
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/references', {
        ...newRef,
        categorie: activeCategory
      });
      setReferences([...references, response.data]);
      setNewRef({ code: '', libelle: '' });
    } catch (error) {
      console.error("Erreur d'ajout", error);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto flex gap-8">
      
      {/* Sidebar Catégories */}
      <div className="w-64 shrink-0">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
          <Database className="w-6 h-6 text-primary-600" />
          Référentiels
        </h2>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {CATEGORIES.map(cat => (
              <li 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-3 cursor-pointer text-sm font-medium transition-colors ${
                  activeCategory === cat.id 
                    ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Contenu Principal */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="mb-6 flex justify-between items-end border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {CATEGORIES.find(c => c.id === activeCategory)?.name}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Gérez les valeurs possibles pour cette liste.</p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="mb-8 flex gap-4 items-end bg-slate-50 p-4 rounded-lg border border-slate-100">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Code court</label>
            <input 
              type="text" 
              placeholder="Ex: ERP" 
              value={newRef.code}
              onChange={e => setNewRef({...newRef, code: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-primary-500 outline-none"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Libellé d'affichage</label>
            <input 
              type="text" 
              placeholder="Ex: Master Data Management" 
              value={newRef.libelle}
              onChange={e => setNewRef({...newRef, libelle: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-primary-500 outline-none"
              required
            />
          </div>
          <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium text-sm transition flex gap-2 items-center">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </form>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Chargement...</div>
        ) : references.length === 0 ? (
          <div className="text-center py-12 text-slate-400 italic">Aucune valeur configurée.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Code</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Libellé</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {references.map(ref => (
                <tr key={ref.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{ref.code}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{ref.libelle}</td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => handleDelete(ref.id)}
                      className="text-slate-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};

export default ReferencesManagement;
