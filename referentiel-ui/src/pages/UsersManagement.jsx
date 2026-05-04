import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Shield } from 'lucide-react';
import api from '../api/axios';

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ nom: '', prenom: '', email: '', motDePasse: '' });
  const [referentiels, setReferentiels] = useState([]);
  const [groupedReferentiels, setGroupedReferentiels] = useState({});
  const [addLoading, setAddLoading] = useState(false);
  const [showDeleteActionsModal, setShowDeleteActionsModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteActionChoice, setDeleteActionChoice] = useState('DESACTIVER');
  const [deleteMotif, setDeleteMotif] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await api.get('/utilisateurs');
      setUsers(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferentiels = async () => {
    try {
      const response = await api.get('/references');
      setReferentiels(response.data);
      const grouped = response.data.reduce((acc, curr) => {
        if (!acc[curr.categorie]) acc[curr.categorie] = [];
        acc[curr.categorie].push(curr);
        return acc;
      }, {});
      setGroupedReferentiels(grouped);
    } catch (error) {
      console.error("Erreur lors de la récupération des référentiels", error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchReferentiels();
  }, []);

  const handleApprove = async (id, roleName, selectedReferentielIds) => {
    try {
      await api.put(`/utilisateurs/${id}/role`, { role: roleName });
      if (selectedReferentielIds !== undefined) {
        await api.put(`/utilisateurs/${id}/referentiels`, selectedReferentielIds);
      }
      await fetchUsers();
      setShowEditModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Erreur de modification", error);
      alert("Une erreur est survenue lors de l'enregistrement.");
    }
  };

  const handleEditClick = (user) => {
    setEditingUser({ 
      ...user, 
      selectedReferentielIds: user.referentiels ? user.referentiels.map(r => r.id) : [] 
    });
    setShowEditModal(true);
  };

  const handleConfirmDeleteAction = async () => {
    if (!userToDelete) return;
    if (deleteActionChoice === 'DESACTIVER') {
      try {
        await api.put(`/utilisateurs/${userToDelete.id}/role`, { role: 'EN_ATTENTE' });
        setUsers(users.map(u => u.id === userToDelete.id ? { ...u, role: 'EN_ATTENTE' } : u));
        setShowDeleteActionsModal(false);
      } catch (error) {
        console.error("Erreur de désactivation", error);
      }
    } else {
      if (!deleteMotif.trim()) {
        alert("Veuillez saisir un motif de suppression.");
        return;
      }
      try {
        await api.delete(`/utilisateurs/${userToDelete.id}`);
        setUsers(users.filter(u => u.id !== userToDelete.id));
        setShowDeleteActionsModal(false);
      } catch (error) {
        console.error("Erreur de suppression", error);
      }
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await api.post('/auth/register', newUser);
      await fetchUsers();
      setShowAddModal(false);
      setNewUser({ nom: '', prenom: '', email: '', motDePasse: '' });
      alert("Utilisateur créé avec succès ! Il a été ajouté à la liste, veuillez modifier son rôle.");
    } catch (error) {
       console.error(error);
       alert("Erreur de création: " + (error.response?.data || error.message));
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-8 h-8 text-primary-600" />
            Gestion des Utilisateurs
          </h2>
          <p className="text-slate-500 mt-1">Gérez les accès et les rôles du référentiel</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition"
        >
          <Plus className="w-5 h-5" /> Ajouter Utilisateur
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Chargement des utilisateurs...</div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-lg font-medium text-slate-600">Aucun utilisateur inscrit</p>
            <p className="text-sm mt-1">La plateforme est vide pour le moment.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Référentiels
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {users
                .sort((a, b) => (a.role === 'EN_ATTENTE' ? -1 : 1)) // En attente en haut
                .map((user) => (
                <tr key={user.id} className={`transition-colors ${user.role === 'EN_ATTENTE' ? 'bg-orange-50/50' : 'hover:bg-slate-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold ${user.role === 'EN_ATTENTE' ? 'bg-orange-100 text-orange-700' : 'bg-primary-100 text-primary-700'}`}>
                        {user.prenom[0]}{user.nom[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-slate-900">{user.prenom} {user.nom}</div>
                        <div className="text-sm text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${user.role === 'EN_ATTENTE' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      <Shield className="w-3 h-3" />
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.role === 'EN_ATTENTE' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-amber-700">
                        À valider
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {user.referentiels && user.referentiels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.referentiels.map(ref => (
                          <span key={ref.id} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                            {ref.libelle}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Aucun</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => handleEditClick(user)}
                      className="text-slate-400 hover:text-primary-600 transition-colors mx-2"
                      title="Modifier les rôles et accès"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => {
                        setUserToDelete(user);
                        setDeleteActionChoice('DESACTIVER');
                        setDeleteMotif('');
                        setShowDeleteActionsModal(true);
                      }}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      title="Actions de suppression"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Modifier les accès</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Utilisateur</label>
                <input 
                  type="text" 
                  value={`${editingUser.prenom} ${editingUser.nom}`} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 outline-none" 
                  disabled 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="text" 
                  value={editingUser.email} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 outline-none" 
                  disabled 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rôle & Permissions</label>
                <select 
                  value={editingUser.role} 
                  onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                >
                  <option value="EN_ATTENTE">En attente (Bloqué)</option>
                  <option value="CHEF_PROJET">Chef de Projet</option>
                  <option value="PMO">PMO</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
                {editingUser.role === 'EN_ATTENTE' && (
                  <p className="text-xs text-orange-600 mt-1">Cet utilisateur ne peut actuellement pas se connecter.</p>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                  Liaison aux Référentiels
                </h4>
                {Object.keys(groupedReferentiels).length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Aucun référentiel configuré.</p>
                ) : (
                  <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                    {Object.entries(groupedReferentiels).map(([categorie, items]) => (
                      <div key={categorie} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                          {categorie.replace(/_/g, ' ')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {items.map(item => {
                            const isSelected = editingUser.selectedReferentielIds.includes(item.id);
                            return (
                              <label key={item.id} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm cursor-pointer transition-colors border ${isSelected ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const newIds = e.target.checked 
                                      ? [...editingUser.selectedReferentielIds, item.id]
                                      : editingUser.selectedReferentielIds.filter(id => id !== item.id);
                                    setEditingUser({...editingUser, selectedReferentielIds: newIds});
                                  }}
                                  className="w-3.5 h-3.5 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                                />
                                {item.libelle}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button 
                onClick={() => { setShowEditModal(false); setEditingUser(null); }} 
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={() => handleApprove(editingUser.id, editingUser.role, editingUser.selectedReferentielIds)}
                className="px-4 py-2 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-lg transition-colors"
              >
                Enregistrer la modification
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Créer un utilisateur</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom <span className="text-red-500">*</span></label>
                  <input type="text" value={newUser.prenom} onChange={e => setNewUser({...newUser, prenom: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom <span className="text-red-500">*</span></label>
                  <input type="text" value={newUser.nom} onChange={e => setNewUser({...newUser, nom: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adresse Email <span className="text-red-500">*</span></label>
                <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe <span className="text-red-500">*</span></label>
                <input type="password" value={newUser.motDePasse} onChange={e => setNewUser({...newUser, motDePasse: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none" required />
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
                <button type="submit" disabled={addLoading} className="px-4 py-2 bg-primary-600 text-white font-medium hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50">{addLoading ? 'Création...' : 'Créer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteActionsModal && userToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Gérer le compte</h3>
            <p className="text-sm text-slate-500 mb-6">Sélectionnez une action pour l'utilisateur <span className="font-semibold text-slate-700">{userToDelete.prenom} {userToDelete.nom}</span>.</p>
            
            <div className="space-y-4">
              <label className={`block border rounded-xl p-4 cursor-pointer transition-colors ${deleteActionChoice === 'DESACTIVER' ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="actionChoice" 
                    value="DESACTIVER" 
                    checked={deleteActionChoice === 'DESACTIVER'} 
                    onChange={() => setDeleteActionChoice('DESACTIVER')}
                    className="w-4 h-4 text-primary-600"
                  />
                  <div>
                    <p className="font-semibold text-slate-800">Désactiver le compte (Recommandé)</p>
                    <p className="text-xs text-slate-500 mt-1">L'utilisateur ne pourra plus se connecter, mais son historique et ses actions seront conservés pour la traçabilité (Statut : En attente).</p>
                  </div>
                </div>
              </label>

              <label className={`block border rounded-xl p-4 cursor-pointer transition-colors ${deleteActionChoice === 'SUPPRIMER' ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="actionChoice" 
                    value="SUPPRIMER" 
                    checked={deleteActionChoice === 'SUPPRIMER'} 
                    onChange={() => setDeleteActionChoice('SUPPRIMER')}
                    className="w-4 h-4 text-red-600"
                  />
                  <div>
                    <p className="font-semibold text-slate-800">Supprimer définitivement</p>
                    <p className="text-xs text-slate-500 mt-1">Supprime irrémédiablement l'utilisateur. Un motif est obligatoire pour cette action de base de données.</p>
                  </div>
                </div>
              </label>

              {deleteActionChoice === 'SUPPRIMER' && (
                <div className="mt-4 p-4 border border-red-200 bg-red-50/50 rounded-xl animate-fade-in">
                  <label className="block text-sm font-medium text-red-800 mb-1">Motif de suppression <span className="text-red-500">*</span></label>
                  <textarea 
                    value={deleteMotif} 
                    onChange={e => setDeleteMotif(e.target.value)} 
                    className="w-full px-3 py-2 border border-red-200 rounded-lg outline-none focus:ring-2 focus:ring-red-500 bg-white min-h-[80px]" 
                    placeholder="Veuillez spécifier la raison (ex: Départ, doublon...)"
                    required
                  ></textarea>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowDeleteActionsModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
              <button 
                onClick={handleConfirmDeleteAction} 
                className={`px-4 py-2 text-white font-medium rounded-lg transition-colors shadow-sm ${deleteActionChoice === 'SUPPRIMER' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}
              >
                {deleteActionChoice === 'SUPPRIMER' ? 'Confirmer la suppression' : 'Désactiver le compte'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersManagement;
