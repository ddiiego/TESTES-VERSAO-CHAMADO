import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import GerenciarSetores from './pages/GerenciarSetores';
import ListaChamados from './pages/ListaChamados';
import ChamadosFechados from './pages/ChamadosFechados';
import Ranking from './pages/Ranking';
import MeuDesempenho from './pages/MeuDesempenho';
import Layout from './components/Layout';

const PrivateRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles?: string[];
}) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole || '')) {
    const role = userRole || 'solicitante';
    if (role === 'admin') return <Navigate to="/chamados" />;
    if (role === 'tecnico') return <Navigate to="/chamados" />;
    return <Navigate to="/solicitante" />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Redirect /gerencia para /chamados */}
        <Route path="/gerencia" element={<Navigate to="/chamados" replace />} />
        <Route
          path="/usuarios"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <GerenciarUsuarios />
            </PrivateRoute>
          }
        />
        <Route
          path="/setores"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <GerenciarSetores />
            </PrivateRoute>
          }
        />
        <Route
          path="/ranking"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <Ranking />
            </PrivateRoute>
          }
        />
        <Route
          path="/meu-desempenho"
          element={
            <PrivateRoute allowedRoles={['tecnico', 'admin']}>
              <MeuDesempenho />
            </PrivateRoute>
          }
        />
        <Route path="/solicitante" element={<Navigate to="/meus-chamados" replace />} />
        <Route
          path="/meus-chamados"
          element={
            <PrivateRoute allowedRoles={['solicitante', 'admin', 'tecnico']}>
              <ListaChamados tipo="suporte" />
            </PrivateRoute>
          }
        />
        <Route
          path="/provas"
          element={
            <PrivateRoute allowedRoles={['solicitante', 'admin', 'tecnico']}>
              <ListaChamados tipo="provas" />
            </PrivateRoute>
          }
        />
        <Route
          path="/chamados"
          element={
            <PrivateRoute allowedRoles={['admin', 'tecnico']}>
              <ListaChamados tipo="suporte" />
            </PrivateRoute>
          }
        />
        <Route
          path="/fechados"
          element={
            <PrivateRoute allowedRoles={['admin', 'tecnico']}>
              <ChamadosFechados tipo="suporte" />
            </PrivateRoute>
          }
        />
        <Route
          path="/fechados-provas"
          element={
            <PrivateRoute allowedRoles={['admin', 'tecnico']}>
              <ChamadosFechados tipo="provas" />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </HashRouter>
  );
}

export default App;