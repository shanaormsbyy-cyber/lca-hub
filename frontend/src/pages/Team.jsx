import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Avatar from '../components/Avatar';
import useLiveSync from '../hooks/useLiveSync';

const ROLE_BADGE = { admin: 'badge-blue', manager: 'badge-green', staff: 'badge-gray' };

export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const load = () => api.get('/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useLiveSync(load);

  const filtered = users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Team</h1>
        <p>{users.length} team members</p>
      </div>

      <input className="form-input mb-4" placeholder="Search team…" value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 20 }} />

      <div className="team-grid">
        {filtered.map(u => (
          <div key={u.id} className="team-card" onClick={() => navigate(`/team/${u.id}`)}>
            <Avatar name={u.name} color={u.avatar_color} size="lg" />
            <div className="team-name">{u.name}</div>
            <span className={`badge ${ROLE_BADGE[u.role] || 'badge-gray'}`}>{u.role}</span>
            {u.department && <div className="team-role">{u.department}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
