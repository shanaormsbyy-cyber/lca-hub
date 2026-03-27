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

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="feed" element={<Feed />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="apps" element={<Apps />} />
            <Route path="resources" element={<Resources />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:userId" element={<Messages />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="team" element={<Team />} />
            <Route path="team/:id" element={<Profile />} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
