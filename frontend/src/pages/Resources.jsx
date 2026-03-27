import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { fmtDate, fmtFileSize } from '../utils';
import useLiveSync from '../hooks/useLiveSync';

function fileIcon(mime) {
  if (!mime) return '📄';
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📕';
  if (mime.includes('word')) return '📝';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return '📊';
  if (mime.startsWith('video/')) return '🎥';
  return '📄';
}

const DEFAULT_CATEGORIES = ['SOPs', 'Forms', 'Brand', 'Training', 'General'];

export default function Resources() {
  const { isManager } = useAuth();
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'General' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [res, cats] = await Promise.all([api.get('/resources'), api.get('/resources/categories')]);
    setResources(res.data);
    const allCats = [...new Set([...DEFAULT_CATEGORIES, ...cats.data])].sort();
    setCategories(allCats);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useLiveSync(load);

  const submit = async e => {
    e.preventDefault();
    if (!file) return alert('Please select a file');
    setSaving(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', form.name || file.name);
    fd.append('description', form.description);
    fd.append('category', form.category);
    try {
      await api.post('/resources', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowModal(false);
      setForm({ name: '', description: '', category: 'General' });
      setFile(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Delete this file?')) return;
    await api.delete(`/resources/${id}`);
    load();
  };

  const filtered = activeCategory === 'All' ? resources : resources.filter(r => r.category === activeCategory);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page-wide" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Sidebar categories */}
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Categories</div>
        {['All', ...categories].map(cat => (
          <button key={cat} className={`nav-item${activeCategory === cat ? ' active' : ''}`} onClick={() => setActiveCategory(cat)} style={{ width: '100%', marginBottom: 2 }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Resources</h1>
            <p style={{ color: 'var(--t2)', marginTop: 4 }}>SOPs, forms, brand assets and more</p>
          </div>
          {isManager && <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Upload File</button>}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><div className="icon">📁</div>No files in this category yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(r => (
              <div key={r.id} className="resource-card">
                <div className="resource-icon">{fileIcon(r.mime_type)}</div>
                <div className="resource-info">
                  <div className="resource-name">{r.name}</div>
                  <div className="resource-meta">{r.category} · {fmtFileSize(r.file_size)} · {fmtDate(r.created_at)} · {r.uploader_name}</div>
                  {r.description && <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>{r.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={`/uploads/resources/${r.filename}`} download={r.original_name} className="btn btn-secondary btn-sm">⬇ Download</a>
                  {isManager && <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>🗑</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Upload File" onClose={() => setShowModal(false)}>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">File</label>
              <input className="form-input" type="file" onChange={e => setFile(e.target.files[0] || null)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Display Name (optional)</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Leave blank to use filename" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {DEFAULT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Uploading…' : 'Upload'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
