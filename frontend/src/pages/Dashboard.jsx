import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { fmtRelative } from '../utils';
import useLiveSync from '../hooks/useLiveSync';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function AnnouncementBanner({ announcement, onDismiss }) {
  return (
    <div className="announcement-banner">
      <div style={{ fontSize: 20, flexShrink: 0 }}>📢</div>
      <div className="announcement-banner-content">
        <div className="announcement-banner-title">{announcement.title}</div>
        <div className="announcement-banner-body">{announcement.body}</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>— {announcement.author_name}</div>
      </div>
      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onDismiss(announcement.id)} title="Dismiss">✕</button>
    </div>
  );
}

export default function Dashboard() {
  const { user, isManager } = useAuth();
  const navigate = useNavigate();
  const [tiles, setTiles] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => Promise.all([
    api.get('/tiles'),
    api.get('/announcements'),
    api.get('/posts'),
  ]).then(([t, a, p]) => {
    setTiles(t.data);
    setAnnouncements(a.data);
    setPosts(p.data.slice(0, 5));
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);
  useLiveSync(load);

  const dismissAnnouncement = async id => {
    await api.post(`/announcements/${id}/dismiss`);
    setAnnouncements(a => a.filter(x => x.id !== id));
  };

  const reactionMap = { like: '👍', love: '❤️', fire: '🔥' };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--t1)', letterSpacing: -0.3 }}>
          Good {getGreeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--t3)', marginTop: 4, fontSize: 14 }}>Welcome back to LCA Hub</p>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {announcements.map(a => (
            <AnnouncementBanner key={a.id} announcement={a} onDismiss={dismissAnnouncement} />
          ))}
        </div>
      )}

      {/* App Tiles */}
      <div style={{ marginBottom: 32 }}>
        <div className="section-heading">
          <span className="section-heading-title">Apps</span>
          <Link to="/apps" className="section-heading-link">See all →</Link>
        </div>
        {tiles.length === 0 ? (
          <div style={{ color: 'var(--t3)', fontSize: 13 }}>No apps added yet.{isManager && ' Go to Apps to add some.'}</div>
        ) : (
          <div className="tile-grid">
            {tiles.slice(0, 6).map(tile => (
              <a key={tile.id} href={tile.url} target="_blank" rel="noopener noreferrer" className="tile-card" style={{ background: tile.color }}>
                <div className="tile-icon">{tile.icon}</div>
                <div className="tile-name">{tile.name}</div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Feed Preview */}
      <div>
        <div className="section-heading">
          <span className="section-heading-title">Recent Posts</span>
          <Link to="/feed" className="section-heading-link">See all →</Link>
        </div>
        {posts.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div className="icon">📰</div>
            Nothing posted yet. <Link to="/feed" style={{ color: 'var(--cyan)' }}>Start the conversation →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.map(post => (
              <div key={post.id} className="post-card" onClick={() => navigate('/feed')} style={{ cursor: 'pointer' }}>
                <div className="post-card-header">
                  <Avatar name={post.author_name} color={post.author_color} size="sm" />
                  <div className="post-card-meta">
                    <div className="post-author">{post.author_name}</div>
                    <div className="post-time">{fmtRelative(post.created_at)}</div>
                  </div>
                  {post.is_pinned === 1 && <span className="pin-indicator">📌</span>}
                </div>
                {post.body && (
                  <div className="post-body" style={{ WebkitLineClamp: 3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                    {post.body}
                  </div>
                )}
                {post.image_url && <img src={post.image_url} alt="" className="post-image" style={{ maxHeight: 200 }} />}
                <div className="post-actions" style={{ pointerEvents: 'none' }}>
                  {Object.entries(reactionMap).map(([key, emoji]) => {
                    const count = post.reactions?.find(r => r.reaction === key)?.count || 0;
                    return count > 0 ? (
                      <span key={key} className="reaction-btn" style={{ cursor: 'default' }}>
                        <span className="emoji">{emoji}</span> {count}
                      </span>
                    ) : null;
                  })}
                  {post.commentCount > 0 && <span className="reaction-btn" style={{ cursor: 'default', marginLeft: 'auto' }}>💬 {post.commentCount}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
