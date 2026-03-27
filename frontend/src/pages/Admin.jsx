import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { AVATAR_COLORS } from '../utils';
import useLiveSync from '../hooks/useLiveSync';

const ROLE_BADGE = { admin: 'badge-blue', manager: 'badge-green', staff: 'badge-gray' };

const SECTION_LABELS = {
  dashboard:     { label: 'Dashboard',     icon: '🏠', desc: 'Main home screen' },
  feed:          { label: 'Feed',          icon: '📰', desc: 'Company posts & reactions' },
  announcements: { label: 'Announcements', icon: '📢', desc: 'Company announcements' },
  apps:          { label: 'Apps',          icon: '🔗', desc: 'App tile directory' },
  resources:     { label: 'Resources',     icon: '📁', desc: 'Policies, guides & files' },
  messages:      { label: 'Messages',      icon: '💬', desc: 'Direct messaging' },
  calendar:      { label: 'Calendar',      icon: '📅', desc: 'Events & schedule' },
  team:          { label: 'Team',          icon: '👥', desc: 'Team directory & profiles' },
  admin:         { label: 'Admin Panel',   icon: '⚙️', desc: 'User management (locked to admin)' },
};

function AccessControl() {
  const { accessRules, loadAccess } = useAuth();
  const [rules, setRules] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => { setRules({ ...accessRules }); }, [accessRules]);

  const update = async (section, min_role) => {
    setSaving(section);
    try {
      await api.put(`/access/${section}`, { min_role });
      setRules(r => ({ ...r, [section]: min_role }));
      await loadAccess();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    } finally { setSaving(null); }
  };

  const ROLE_OPTIONS = [
    { value: 'staff',   label: 'All Staff',       badge: 'badge-gray' },
    { value: 'manager', label: 'Manager + Admin',  badge: 'badge-green' },
    { value: 'admin',   label: 'Admin Only',       badge: 'badge-blue' },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Section Access</h2>
        <p style={{ fontSize: 13, color: 'var(--t3)' }}>Control which roles can see each section. Changes take effect immediately.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(SECTION_LABELS).map(([section, meta]) => {
          const current = rules[section] ?? 'staff';
          const locked = section === 'admin' || section === 'dashboard';
          return (
            <div key={section} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
              <div style={{ fontSize: 22, width: 32, textAlign: 'center', flexShrink: 0 }}>{meta.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.label}</div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>{meta.desc}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {ROLE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    disabled={locked || saving === section}
                    onClick={() => update(section, opt.value)}
                    className={`btn btn-sm ${current === opt.value ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 12, opacity: locked ? 0.5 : 1 }}
                    title={locked ? 'This section cannot be changed' : ''}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'staff', department: '', avatar_color: '#3AB5D9' });
  const [pwForm, setPwForm] = useState({ password: '' });
  const [showPwModal, setShowPwModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useLiveSync(load);

  const openNew = () => {
    setEditing(null);
    setForm({ username: '', password: '', name: '', role: 'staff', department: '', avatar_color: '#3AB5D9' });
    setShowModal(true);
  };
  const openEdit = u => {
    setEditing(u);
    setForm({ username: u.username, name: u.name, role: u.role, department: u.department || '', avatar_color: u.avatar_color || '#3AB5D9', password: '' });
    setShowModal(true);
  };

  const submit = async e => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      if (editing) await api.put(`/users/${editing.id}`, form);
      else await api.post('/users', form);
      setShowModal(false);
      await load();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await api.delete(`/users/${id}`);
    load();
  };

  const resetPw = async e => {
    e.preventDefault();
    if (!pwForm.password || pwForm.password.length < 4) return alert('Password must be at least 4 characters');
    await api.put(`/users/${showPwModal}/password`, pwForm);
    setPwForm({ password: '' });
    setShowPwModal(null);
    alert('Password reset successfully');
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Admin Panel</h1>
          <p>Manage users and access levels</p>
        </div>
        {tab === 'users' && <button className="btn btn-primary" onClick={openNew}>+ Add User</button>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {[{ key: 'users', label: '👤 Users' }, { key: 'access', label: '🔒 Access Control' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="btn btn-ghost btn-sm"
            style={{ borderRadius: '6px 6px 0 0', borderBottom: tab === t.key ? '2px solid var(--brand)' : '2px solid transparent', color: tab === t.key ? 'var(--brand)' : 'var(--t2)', fontWeight: tab === t.key ? 700 : 400, marginBottom: -2 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'access' && <AccessControl />}

      {tab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px' }}>
              <Avatar name={u.name} color={u.avatar_color} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{u.name}</span>
                  <span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>{u.role}</span>
                  {u.id === me.id && <span className="badge badge-blue">You</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>@{u.username}{u.department ? ` · ${u.department}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPwModal(u.id)}>🔑 Reset PW</button>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>Edit</button>
                {u.id !== me.id && <button className="btn btn-danger btn-sm" onClick={() => del(u.id)}>Delete</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? `Edit ${editing.name}` : 'Add User'} onClose={() => setShowModal(false)}>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Full Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Username</label>
                <input className="form-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required disabled={!!editing} />
              </div>
            </div>
            {!editing && (
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Role</label>
                <select className="form-input form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Department</label>
                <input className="form-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Operations" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Avatar Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {AVATAR_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.avatar_color === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
            {msg && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{msg}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showPwModal && (
        <Modal title="Reset Password" onClose={() => setShowPwModal(null)}>
          <form onSubmit={resetPw}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={pwForm.password} onChange={e => setPwForm({ password: e.target.value })} autoFocus required />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowPwModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Reset Password</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
