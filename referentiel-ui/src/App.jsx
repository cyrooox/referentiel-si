import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './pages/MainLayout';
import DashboardHome from './pages/DashboardHome';
import UsersManagement from './pages/UsersManagement';
import ProjectsManagement from './pages/ProjectsManagement';
import NewProjectWizard from './pages/NewProjectWizard';
import ReferencesManagement from './pages/ReferencesManagement';
import { useKeycloak } from './KeycloakProvider';

// Composant de protection par rôle
const RoleRoute = ({ allowedRoles, children }) => {
  const { userInfo } = useKeycloak();
  const role = userInfo?.role;
  if (!role) return null; // Chargement en cours
  if (!allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>

          {/* Dashboard — accessible à tous */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardHome />} />

          {/* Projets (liste) — Chef de Projet ET PMO peuvent voir la liste */}
          <Route path="projects" element={
            <RoleRoute allowedRoles={['PMO', 'CHEF_PROJET']}>
              <ProjectsManagement />
            </RoleRoute>
          } />

          {/* Édition projet — Chef de Projet (tous) + PMO (ses projets uniquement, géré dans le composant) */}
          <Route path="projects/edit/:id" element={
            <RoleRoute allowedRoles={['CHEF_PROJET', 'PMO']}>
              <NewProjectWizard />
            </RoleRoute>
          } />

          {/* Utilisateurs — Admin uniquement */}
          <Route path="users" element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <UsersManagement />
            </RoleRoute>
          } />

          {/* Référentiels — Admin uniquement */}
          <Route path="references" element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <ReferencesManagement />
            </RoleRoute>
          } />

        </Route>

        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
