import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Feed from './pages/Feed';
import Announcements from './pages/Announcements';
import Apps from './pages/Apps';
import Resources from './pages/Resources';
import Messages from './pages/Messages';
import Calendar from './pages/Calendar';
import Team from './pages/Team';
import Profile from './pages/Profile';
import MyProfile from './pages/MyProfile';
import Admin from './pages/Admin';
import Directory from './pages/Directory';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAccess({ section, children }) {
  const { canAccess, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!canAccess(section)) return <AccessDenied />;
  return children;
}

function AccessDenied() {
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Access Restricted</h2>
      <p style={{ color: 'var(--t3)', fontSize: 14 }}>You don't have permission to view this section.<br />Contact your admin if you think this is a mistake.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<RequireAccess section="dashboard"><Dashboard /></RequireAccess>} />
            <Route path="feed" element={<RequireAccess section="feed"><Feed /></RequireAccess>} />
            <Route path="announcements" element={<RequireAccess section="announcements"><Announcements /></RequireAccess>} />
            <Route path="apps" element={<RequireAccess section="apps"><Apps /></RequireAccess>} />
            <Route path="resources" element={<RequireAccess section="resources"><Resources /></RequireAccess>} />
            <Route path="messages" element={<RequireAccess section="messages"><Messages /></RequireAccess>} />
            <Route path="messages/:userId" element={<RequireAccess section="messages"><Messages /></RequireAccess>} />
            <Route path="calendar" element={<RequireAccess section="calendar"><Calendar /></RequireAccess>} />
            <Route path="team" element={<RequireAccess section="team"><Team /></RequireAccess>} />
            <Route path="team/:id" element={<RequireAccess section="team"><Profile /></RequireAccess>} />
            <Route path="directory" element={<RequireAccess section="directory"><Directory /></RequireAccess>} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="admin" element={<RequireAccess section="admin"><Admin /></RequireAccess>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
