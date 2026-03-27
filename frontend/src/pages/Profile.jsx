import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { fmtDate } from '../utils';

const ROLE_BADGE = { admin: 'badge-blue', manager: 'badge-green', staff: 'badge-gray' };

export default function Profile() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${id}`).then(r => setUser(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!user) return <div className="page"><p>User not found.</p></div>;

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/team')} style={{ marginBottom: 20 }}>← Back to Team</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
        <Avatar name={user.name} color={user.avatar_color} size="xl" />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{user.name}</h1>
            <span className={`badge ${ROLE_BADGE[user.role] || 'badge-gray'}`}>{user.role}</span>
          </div>
          {user.department && <div style={{ color: 'var(--t2)', marginTop: 4 }}>{user.department}</div>}
          <div style={{ color: 'var(--t3)', fontSize: 13, marginTop: 4 }}>Joined {fmtDate(user.created_at)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => navigate(`/messages/${user.id}`)}>💬 Send Message</button>
        {me?.id === user.id && <button className="btn btn-ghost" onClick={() => navigate('/profile')}>Edit Profile</button>}
      </div>
    </div>
  );
}
