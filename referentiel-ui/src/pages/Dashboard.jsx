import { useNavigate } from 'react-router-dom';
import { LogOut, FolderKanban, Users, Settings } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200">
        <div className="flex h-16 items-center justify-center border-b border-slate-200">
          <h1 className="text-xl font-bold text-primary-600 flex items-center gap-2">
            <FolderKanban className="w-6 h-6" />
            Référentiel SI
          </h1>
        </div>
        <nav className="p-4 space-y-2 text-slate-600">
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium">
            <FolderKanban className="w-5 h-5" />
            Projets
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Users className="w-5 h-5" />
            Ressources
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Settings className="w-5 h-5" />
            Configuration
          </a>
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <h2 className="text-xl font-semibold text-slate-800">Tableau de bord</h2>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              JD
            </div>
            <span className="text-sm font-medium text-slate-700">John Doe</span>
          </div>
        </header>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPI Cards */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-medium text-slate-500">Projets Actifs</h3>
              <p className="mt-2 text-3xl font-bold text-slate-800">12</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-medium text-slate-500">Projets en Alerte</h3>
              <p className="mt-2 text-3xl font-bold text-red-600">2</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-medium text-slate-500">Budget Consommé</h3>
              <p className="mt-2 text-3xl font-bold text-slate-800">45%</p>
            </div>
          </div>
          
          {/* Main content area */}
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Liste des Projets</h3>
            <p className="text-slate-500">L'intégration des données de l'API arrive bientôt...</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
