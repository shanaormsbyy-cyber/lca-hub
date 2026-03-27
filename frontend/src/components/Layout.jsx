import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import api from '../api';

const NAV = [
  { to: '/', icon: '🏠', label: 'Dashboard', exact: true },
  { to: '/feed', icon: '📰', label: 'Feed' },
  { to: '/announcements', icon: '📢', label: 'Announcements' },
  { to: '/apps', icon: '🔗', label: 'Apps' },
  { to: '/resources', icon: '📁', label: 'Resources' },
  { to: '/messages', icon: '💬', label: 'Messages' },
  { to: '/calendar', icon: '📅', label: 'Calendar' },
  { to: '/team', icon: '👥', label: 'Team' },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get('/messages/conversations').then(r => {
      setUnread(r.data.reduce((s, c) => s + (c.unread || 0), 0));
    }).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">L</div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">LCA Hub</div>
          <div className="sidebar-logo-sub">cleaning services</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menu</div>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.to === '/messages' && unread > 0 && (
              <span className="nav-badge">{unread}</span>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="sidebar-section-label" style={{ marginTop: 8 }}>Admin</div>
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="nav-icon">⚙️</span>
              Manage Users
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-user">
        <NavLink to="/profile" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none' }}>
          <Avatar name={user?.name} color={user?.avatar_color} size="sm" />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
        </NavLink>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={handleLogout} title="Sign out" style={{ fontSize: 16 }}>↩</button>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      <div className={`mobile-sidebar-overlay${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(false)} />
      {mobileOpen && (
        <aside className="sidebar mobile-open" style={{ position: 'fixed' }}>
          <SidebarContent />
        </aside>
      )}

      <div className="main-content">
        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>☰</button>
          <div style={{ fontWeight: 800, fontSize: 15 }}>LCA Hub</div>
          <Avatar name={user?.name} color={user?.avatar_color} size="sm" />
        </div>

        <Outlet />
      </div>
    </div>
  );
}
