import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import useLiveSync from '../hooks/useLiveSync';

const COLORS = ['#3AB5D9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#f97316','#14b8a6'];

export default function Apps() {
  const { isAdmin } = useAuth();
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', icon: '🔗', color: '#3AB5D9' });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/tiles').then(r => setTiles(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useLiveSync(load);

  const openNew = () => { setEditing(null); setForm({ name: '', url: '', icon: '🔗', color: '#3AB5D9' }); setShowModal(true); };
  const openEdit = tile => { setEditing(tile); setForm({ name: tile.name, url: tile.url, icon: tile.icon, color: tile.color }); setShowModal(true); };

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/tiles/${editing.id}`, form);
      else await api.post('/tiles', form);
      setShowModal(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Delete this tile?')) return;
    await api.delete(`/tiles/${id}`);
    load();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Apps</h1>
          <p style={{ color: 'var(--t2)', marginTop: 4 }}>All your tools in one place</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={openNew}>+ Add App</button>}
      </div>

      {tiles.length === 0 ? (
        <div className="empty-state"><div className="icon">🔗</div>No apps added yet.</div>
      ) : (
        <div className="tile-grid">
          {tiles.map(tile => (
            <div key={tile.id} style={{ position: 'relative' }}>
              <a href={tile.url} target="_blank" rel="noopener noreferrer" className="tile-card" style={{ background: tile.color }}>
                <div className="tile-icon">{tile.icon}</div>
                <div className="tile-name">{tile.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', wordBreak: 'break-all', maxWidth: '100%' }}>{tile.url.replace(/^https?:\/\//, '').slice(0, 30)}</div>
              </a>
              {isAdmin && (
                <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4 }}>
                  <button className="btn btn-secondary btn-sm btn-icon" onClick={e => { e.preventDefault(); openEdit(tile); }}>✏️</button>
                  <button className="btn btn-danger btn-sm btn-icon" onClick={e => { e.preventDefault(); del(tile.id); }}>🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit App' : 'Add App'} onClose={() => setShowModal(false)}>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. QC App" required />
            </div>
            <div className="form-group">
              <label className="form-label">URL</label>
              <input className="form-input" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" required />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Icon (emoji)</label>
                <input className="form-input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🔗" maxLength={4} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
