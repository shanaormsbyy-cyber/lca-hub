import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { fmtDate } from '../utils';
import useLiveSync from '../hooks/useLiveSync';

export default function Announcements() {
  const { isManager } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    const endpoint = isManager ? '/announcements/all' : '/announcements';
    api.get(endpoint).then(r => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [isManager]);
  useLiveSync(load);

  const submit = async e => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    await api.post('/announcements', form);
    setForm({ title: '', body: '' });
    setShowModal(false);
    await load();
    setSaving(false);
  };

  const toggle = async (id, is_active) => {
    const item = items.find(x => x.id === id);
    await api.put(`/announcements/${id}`, { ...item, is_active: is_active ? 1 : 0 });
    load();
  };

  const del = async id => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    load();
  };

  const dismiss = async id => {
    await api.post(`/announcements/${id}/dismiss`);
    load();
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Announcements</h1>
          <p>Important updates from management</p>
        </div>
        {isManager && <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Announcement</button>}
      </div>

      {items.length === 0 ? (
        <div className="empty-state"><div className="icon">📢</div>No announcements yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {items.map(item => (
            <div key={item.id} style={{
              background: item.is_active ? 'rgba(245,158,11,0.08)' : 'var(--card)',
              border: `1px solid ${item.is_active ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
              borderRadius: 12, padding: '16px 18px',
              opacity: item.is_active ? 1 : 0.5,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>📢</span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{item.title}</span>
                    {!item.is_active && <span className="badge badge-gray">Inactive</span>}
                  </div>
                  <p style={{ color: 'var(--t2)', fontSize: 13, lineHeight: 1.6 }}>{item.body}</p>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>
                    {item.author_name} · {fmtDate(item.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {isManager ? (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => toggle(item.id, !item.is_active)}>
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => del(item.id)}>Delete</button>
                    </>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => dismiss(item.id)}>Dismiss</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="New Announcement" onClose={() => setShowModal(false)}>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Announcement title…" />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-input" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="What do you want the team to know?" rows={4} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Posting…' : 'Post Announcement'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
