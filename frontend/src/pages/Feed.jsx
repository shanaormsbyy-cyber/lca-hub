import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { fmtRelative } from '../utils';
import useLiveSync from '../hooks/useLiveSync';

function PostCard({ post, onReact, onDelete, onPin, onCommentPosted, currentUser, isManager }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadComments = async () => {
    setLoadingComments(true);
    const r = await api.get(`/posts/${post.id}/comments`);
    setComments(r.data);
    setLoadingComments(false);
  };

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(v => !v);
  };

  const submitComment = async e => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    await api.post(`/posts/${post.id}/comments`, { body: commentText });
    setCommentText('');
    await loadComments();
    setSubmitting(false);
    onCommentPosted?.();
  };

  const deleteComment = async (cid) => {
    if (!confirm('Delete comment?')) return;
    await api.delete(`/posts/${post.id}/comments/${cid}`);
    loadComments();
  };

  const reactionMap = { like: '👍', love: '❤️', fire: '🔥' };

  return (
    <div className={`post-card${post.is_pinned ? ' pinned' : ''}`}>
      <div className="post-card-header">
        <Avatar name={post.author_name} color={post.author_color} size="sm" />
        <div className="post-card-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="post-author">{post.author_name}</span>
            {post.is_pinned === 1 && <span className="pin-indicator">📌 Pinned</span>}
          </div>
          <div className="post-time">{fmtRelative(post.created_at)}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {isManager && (
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onPin(post.id)} title={post.is_pinned ? 'Unpin' : 'Pin'}>
              {post.is_pinned ? '📌' : '📍'}
            </button>
          )}
          {(post.author_id === currentUser.id || currentUser.role === 'admin') && (
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onDelete(post.id)} title="Delete post">🗑</button>
          )}
        </div>
      </div>

      {post.body && <div className="post-body">{post.body}</div>}
      {post.image_url && <img src={post.image_url} alt="" className="post-image" />}

      <div className="post-actions">
        {Object.entries(reactionMap).map(([key, emoji]) => {
          const count = post.reactions?.find(r => r.reaction === key)?.count || 0;
          const active = post.userReactions?.includes(key);
          return (
            <button key={key} className={`reaction-btn${active ? ' active' : ''}`} onClick={() => onReact(post.id, key)}>
              <span className="emoji">{emoji}</span>
              {count > 0 && <span>{count}</span>}
            </button>
          );
        })}
        <button className="reaction-btn comment-btn" onClick={toggleComments}>
          💬 {post.commentCount > 0 ? post.commentCount : ''} {showComments ? 'Hide' : 'Comment'}
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {loadingComments ? (
            <div style={{ padding: '12px 16px' }}><span className="spinner" /></div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="comment-item">
                <Avatar name={c.author_name} color={c.author_color} size="sm" />
                <div className="comment-body-wrap">
                  <div className="comment-author">{c.author_name}</div>
                  <div className="comment-text">{c.body}</div>
                  <div className="comment-time">{fmtRelative(c.created_at)}</div>
                </div>
                {(c.author_id === currentUser.id || currentUser.role === 'admin') && (
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deleteComment(c.id)} style={{ alignSelf: 'flex-start' }}>🗑</button>
                )}
              </div>
            ))
          )}
          <form className="comment-input-row" onSubmit={submitComment}>
            <Avatar name={currentUser.name} color={currentUser.avatar_color} size="sm" />
            <input
              className="form-input" style={{ flex: 1 }}
              placeholder="Write a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={submitting || !commentText.trim()}>Post</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function Feed() {
  const { user, isManager } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [image, setImage] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef();

  const load = () => api.get('/posts').then(r => setPosts(r.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  useLiveSync(load);

  const submitPost = async e => {
    e.preventDefault();
    if (!body.trim() && !image) return;
    setPosting(true);
    const fd = new FormData();
    fd.append('body', body);
    if (image) fd.append('image', image);
    await api.post('/posts', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    setBody(''); setImage(null);
    if (fileRef.current) fileRef.current.value = '';
    await load();
    setPosting(false);
  };

  const handleReact = async (postId, reaction) => {
    await api.post(`/posts/${postId}/reactions`, { reaction });
    load();
  };

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post?')) return;
    await api.delete(`/posts/${postId}`);
    load();
  };

  const handlePin = async (postId) => {
    await api.patch(`/posts/${postId}/pin`);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Company Feed</h1>
        <p>Share updates, celebrate wins, keep the team in the loop</p>
      </div>

      {/* Compose */}
      <div className="card mb-6" style={{ marginBottom: 24 }}>
        <form onSubmit={submitPost}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Avatar name={user?.name} color={user?.avatar_color} size="md" />
            <div style={{ flex: 1 }}>
              <textarea
                className="form-input"
                placeholder={`What's on your mind, ${user?.name?.split(' ')[0]}?`}
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={3}
                style={{ minHeight: 72, resize: 'none' }}
              />
              {image && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🖼️ {image.name}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ''; }}>✕</button>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <label style={{ cursor: 'pointer', color: 'var(--t2)', fontSize: 20 }} title="Add photo">
                  🖼️
                  <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileRef} onChange={e => setImage(e.target.files[0] || null)} />
                </label>
                <button className="btn btn-primary btn-sm" type="submit" disabled={posting || (!body.trim() && !image)}>
                  {posting ? <><span className="spinner" /> Posting…</> : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="empty-state"><div className="icon">📰</div>No posts yet. Be the first!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={user}
              isManager={isManager}
              onReact={handleReact}
              onDelete={handleDelete}
              onPin={handlePin}
              onCommentPosted={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}
