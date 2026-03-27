import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import useLiveSync from '../hooks/useLiveSync';

const ROLE_BADGE = { admin: 'badge-blue', manager: 'badge-green', staff: 'badge-gray' };

export default function Directory() {
  const { isAdmin, isManager } = useAuth();
  const [users, setUsers] = useState([]);
  const [cities, setCities] = useState([]);
  const [activeCity, setActiveCity] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // City management modal
  const [showCityModal, setShowCityModal] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [cityName, setCityName] = useState('');
  const [cityMsg, setCityMsg] = useState('');

  const load = () => Promise.all([
    api.get('/users'),
    api.get('/cities'),
  ]).then(([u, c]) => {
    setUsers(u.data);
    setCities(c.data);
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);
  useLiveSync(load);

  const saveCity = async e => {
    e.preventDefault();
    setCityMsg('');
    try {
      if (editingCity) {
        await api.put(`/cities/${editingCity.id}`, { name: cityName });
      } else {
        await api.post('/cities', { name: cityName });
      }
      setShowCityModal(false);
      setCityName('');
      setEditingCity(null);
      await load();
    } catch (err) {
      setCityMsg(err.response?.data?.error || 'Failed to save');
    }
  };

  const deleteCity = async (city) => {
    if (!confirm(`Delete "${city.name}"? Staff assigned to this city will be moved to Unassigned.`)) return;
    await api.delete(`/cities/${city.id}`);
    if (activeCity === String(city.id)) setActiveCity('all');
    load();
  };

  const openNewCity = () => {
    setEditingCity(null);
    setCityName('');
    setCityMsg('');
    setShowCityModal(true);
  };

  const openEditCity = (city) => {
    setEditingCity(city);
    setCityName(city.name);
    setCityMsg('');
    setShowCityModal(true);
  };

  const filtered = users.filter(u => {
    const matchCity = activeCity === 'all'
      ? true
      : activeCity === 'unassigned'
      ? !u.city_id
      : String(u.city_id) === activeCity;
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q) || (u.phone || '').includes(q);
    return matchCity && matchSearch;
  });

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Staff Directory</h1>
          <p>{users.length} team members</p>
        </div>
        {isManager && (
          <button className="btn btn-primary" onClick={openNewCity}>+ Add City</button>
        )}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          placeholder="Search by name, department or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* City tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--border)', flexWrap: 'wrap' }}>
        {[{ id: 'all', name: 'All' }, ...cities, { id: 'unassigned', name: 'Unassigned' }].map(city => (
          <div key={city.id} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <button
              onClick={() => setActiveCity(String(city.id))}
              className="btn btn-ghost btn-sm"
              style={{
                borderRadius: '6px 6px 0 0',
                borderBottom: activeCity === String(city.id) ? '2px solid var(--brand)' : '2px solid transparent',
                color: activeCity === String(city.id) ? 'var(--brand)' : 'var(--t2)',
                fontWeight: activeCity === String(city.id) ? 700 : 400,
                marginBottom: -2,
                paddingRight: (isManager && city.id !== 'all' && city.id !== 'unassigned') ? 24 : undefined,
              }}
            >
              {city.name}
            </button>
            {isManager && city.id !== 'all' && city.id !== 'unassigned' && (
              <div style={{ position: 'absolute', right: 2, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2 }}>
                <button
                  onClick={() => openEditCity(city)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--t3)', padding: '2px 3px', lineHeight: 1 }}
                  title="Rename city"
                >✏️</button>
                {isAdmin && (
                  <button
                    onClick={() => deleteCity(city)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--t3)', padding: '2px 3px', lineHeight: 1 }}
                    title="Delete city"
                  >✕</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Staff cards */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">👥</div>
          {search ? 'No staff match your search.' : 'No staff in this city yet.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(u => (
            <StaffCard key={u.id} user={u} cities={cities} isManager={isManager} onSaved={load} />
          ))}
        </div>
      )}

      {/* City modal */}
      {showCityModal && (
        <Modal title={editingCity ? 'Rename City' : 'Add City'} onClose={() => setShowCityModal(false)}>
          <form onSubmit={saveCity}>
            <div className="form-group">
              <label className="form-label">City Name</label>
              <input className="form-input" value={cityName} onChange={e => setCityName(e.target.value)} placeholder="e.g. Brisbane" autoFocus required />
            </div>
            {cityMsg && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{cityMsg}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCityModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function StaffCard({ user, cities, isManager, onSaved }) {
  const { isAdmin, user: me } = useAuth();
  const canEdit = isAdmin || me?.id === user.id;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: user.phone || '', working_days: user.working_days || '', city_id: user.city_id || '' });
  const [saving, setSaving] = useState(false);

  const save = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, {
        name: user.name, role: user.role, department: user.department,
        avatar_color: user.avatar_color, phone: form.phone,
        working_days: form.working_days, city_id: form.city_id || null,
      });
      setEditing(false);
      onSaved();
    } finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Avatar name={user.name} color={user.avatar_color} size="md" />
          <div>
            <div style={{ fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', textTransform: 'capitalize' }}>{user.role}</div>
          </div>
        </div>
        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 0400 000 000" />
          </div>
          <div className="form-group">
            <label className="form-label">Working Days</label>
            <input className="form-input" value={form.working_days} onChange={e => setForm(f => ({ ...f, working_days: e.target.value }))} placeholder="e.g. Mon, Wed, Fri" />
          </div>
          {isAdmin && (
            <div className="form-group">
              <label className="form-label">City</label>
              <select className="form-input form-select" value={form.city_id} onChange={e => setForm(f => ({ ...f, city_id: e.target.value }))}>
                <option value="">Unassigned</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 16, position: 'relative' }}>
      {canEdit && (
        <button
          className="btn btn-ghost btn-sm btn-icon"
          onClick={() => setEditing(true)}
          style={{ position: 'absolute', top: 10, right: 10, fontSize: 13 }}
          title="Edit"
        >✏️</button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar name={user.name} color={user.avatar_color} size="md" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3, flexWrap: 'wrap' }}>
            <span className={`badge ${ROLE_BADGE[user.role] || 'badge-gray'}`}>{user.role}</span>
            {user.department && <span style={{ fontSize: 12, color: 'var(--t3)' }}>{user.department}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <InfoRow icon="📍" value={user.city_name} empty="No city assigned" />
        <InfoRow icon="📞" value={user.phone} empty="No phone on file" />
        <InfoRow icon="📅" value={user.working_days} empty="Working days not set" />
      </div>
    </div>
  );
}

function InfoRow({ icon, value, empty }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
      <span style={{ flexShrink: 0, width: 18 }}>{icon}</span>
      <span style={{ color: value ? 'var(--t1)' : 'var(--t3)', fontStyle: value ? 'normal' : 'italic' }}>
        {value || empty}
      </span>
    </div>
  );
}
