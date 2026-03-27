import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';
import { fmtRelative } from '../utils';
import useLiveSync from '../hooks/useLiveSync';

export default function Messages() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const bottomRef = useRef();

  const loadConversations = () => api.get('/messages/conversations').then(r => setConversations(r.data));
  const loadMessages = async (uid) => {
    const r = await api.get(`/messages/${uid}`);
    setMessages(r.data);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    loadConversations();
    api.get('/users').then(r => setAllUsers(r.data.filter(u => u.id !== me?.id)));
  }, []);

  useEffect(() => {
    if (userId) {
      const uid = parseInt(userId);
      api.get(`/users/${uid}`).then(r => { setActiveUser(r.data); loadMessages(uid); });
    }
  }, [userId]);

  useLiveSync(() => {
    loadConversations();
    if (activeUser) loadMessages(activeUser.id);
  });

  const selectUser = (user) => {
    setActiveUser(user);
    setShowNewChat(false);
    navigate(`/messages/${user.id}`);
    loadMessages(user.id);
  };

  const sendMessage = async e => {
    e.preventDefault();
    if (!text.trim() || !activeUser) return;
    setSending(true);
    await api.post(`/messages/${activeUser.id}`, { body: text });
    setText('');
    await loadMessages(activeUser.id);
    loadConversations();
    setSending(false);
  };

  const existingPartnerIds = new Set(conversations.map(c => c.partner.id));
  const newChatUsers = allUsers.filter(u => !existingPartnerIds.has(u.id));

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)', overflow: 'hidden' }}>
      {/* Conversations list */}
      <div className="conversations-panel">
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Messages</span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowNewChat(v => !v)} title="New message">✏️</button>
        </div>

        {showNewChat && (
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6, padding: '0 4px' }}>Start a new conversation</div>
            {newChatUsers.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--t3)', padding: '0 4px' }}>No other users available</div>
            ) : newChatUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => selectUser(u)}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <Avatar name={u.name} color={u.avatar_color} size="sm" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
              </div>
            ))}
          </div>
        )}

        {conversations.length === 0 && !showNewChat && (
          <div style={{ padding: '20px 16px', color: 'var(--t3)', fontSize: 13 }}>No conversations yet. Start one with a team member!</div>
        )}

        {conversations.map(c => (
          <div key={c.partner.id} className={`conversation-item${activeUser?.id === c.partner.id ? ' active' : ''}`} onClick={() => selectUser(c.partner)}>
            <Avatar name={c.partner.name} color={c.partner.avatar_color} size="sm" />
            <div className="conversation-info">
              <div className="conversation-name">{c.partner.name}</div>
              <div className="conversation-preview">{c.last?.body || 'No messages yet'}</div>
            </div>
            {c.unread > 0 && <span className="nav-badge">{c.unread}</span>}
          </div>
        ))}
      </div>

      {/* Chat panel */}
      <div className="chat-panel">
        {!activeUser ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--t3)', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 40 }}>💬</div>
            <div>Select a conversation or start a new one</div>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <Avatar name={activeUser.name} color={activeUser.avatar_color} size="sm" />
              <div>
                <div style={{ fontWeight: 700 }}>{activeUser.name}</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', textTransform: 'capitalize' }}>{activeUser.role}</div>
              </div>
            </div>

            <div className="chat-messages">
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 13, margin: 'auto' }}>
                  Start a conversation with {activeUser.name}
                </div>
              )}
              {messages.map(msg => {
                const mine = msg.from_user_id === me.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                    {!mine && <Avatar name={msg.from_name} color={msg.from_color} size="sm" />}
                    <div>
                      <div className={`chat-bubble${mine ? ' mine' : ' theirs'}`}>
                        {msg.body}
                        <div className="chat-bubble-time">{fmtRelative(msg.created_at)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form className="chat-input-bar" onSubmit={sendMessage}>
              <input
                className="form-input" style={{ flex: 1 }}
                placeholder={`Message ${activeUser.name}…`}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={sending || !text.trim()}>Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
