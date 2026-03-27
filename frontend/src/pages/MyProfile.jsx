import { useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { AVATAR_COLORS } from '../utils';

export default function MyProfile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', department: user?.department || '', avatar_color: user?.avatar_color || '#3AB5D9', phone: user?.phone || '', working_days: user?.working_days || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const saveProfile = async e => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.put(`/users/${user.id}/profile`, form);
      await refreshUser();
      setMsg('Profile saved!');
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const savePassword = async e => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return setPwMsg('Passwords do not match');
    setSavingPw(true);
    setPwMsg('');
    try {
      await api.post('/auth/change-password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setPwMsg('Password changed!');
    } catch (err) {
      setPwMsg(err.response?.data?.error || 'Failed to change password');
    } finally { setSavingPw(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <Avatar name={form.name || user?.name} color={form.avatar_color} size="xl" />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{user?.name}</div>
          <div style={{ color: 'var(--t3)', fontSize: 13, textTransform: 'capitalize' }}>{user?.role}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>Edit Profile</div>
        <form onSubmit={saveProfile}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <input className="form-input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Operations" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 0400 000 000" />
          </div>
          <div className="form-group">
            <label className="form-label">Working Days</label>
            <input className="form-input" value={form.working_days} onChange={e => setForm(f => ({ ...f, working_days: e.target.value }))} placeholder="e.g. Mon, Wed, Fri" />
          </div>
          <div className="form-group">
            <label className="form-label">Avatar Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: form.avatar_color === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          {msg && <div style={{ color: msg.includes('!') ? 'var(--green)' : 'var(--red)', fontSize: 13, marginBottom: 8 }}>{msg}</div>}
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Profile'}</button>
        </form>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 16 }}>Change Password</div>
        <form onSubmit={savePassword}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
          </div>
          {pwMsg && <div style={{ color: pwMsg.includes('!') ? 'var(--green)' : 'var(--red)', fontSize: 13, marginBottom: 8 }}>{pwMsg}</div>}
          <button type="submit" className="btn btn-primary" disabled={savingPw}>{savingPw ? 'Saving…' : 'Change Password'}</button>
        </form>
      </div>
    </div>
  );
}
