import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { fmtDate } from '../utils';
import useLiveSync from '../hooks/useLiveSync';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const EVENT_COLORS = ['#3AB5D9','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#f97316'];
const EVENT_TYPES = ['general','meeting','shift','deadline'];

function calDays(year, month) {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = first - 1; i >= 0; i--) days.push({ date: daysInPrev - i, month: month - 1, year, other: true });
  for (let d = 1; d <= daysInMonth; d++) days.push({ date: d, month, year, other: false });
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) days.push({ date: d, month: month + 1, year, other: true });
  return days;
}

export default function Calendar() {
  const { isManager } = useAuth();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', start_date: '', end_date: '', start_time: '', end_time: '', event_type: 'general', color: '#3AB5D9' });
  const [saving, setSaving] = useState(false);
  const [viewEvent, setViewEvent] = useState(null);

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const load = () => {
    api.get(`/events?month=${monthStr}`).then(r => setEvents(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [monthStr]);
  useLiveSync(load);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const openNewEvent = (day) => {
    const dateStr = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
    setForm({ title: '', description: '', start_date: dateStr, end_date: '', start_time: '', end_time: '', event_type: 'general', color: '#3AB5D9' });
    setSelectedDay(day);
    setShowModal(true);
  };

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/events', form);
      setShowModal(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const del = async id => {
    if (!confirm('Delete this event?')) return;
    await api.delete(`/events/${id}`);
    setViewEvent(null);
    load();
  };

  const days = calDays(viewYear, viewMonth);
  const eventsByDate = {};
  events.forEach(ev => {
    const k = ev.start_date;
    if (!eventsByDate[k]) eventsByDate[k] = [];
    eventsByDate[k].push(ev);
  });

  return (
    <div className="page-wide">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Calendar</h1>
        {isManager && <button className="btn btn-primary" onClick={() => { setForm({ title: '', description: '', start_date: '', end_date: '', start_time: '', end_time: '', event_type: 'general', color: '#3AB5D9' }); setShowModal(true); }}>+ Add Event</button>}
      </div>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>←</button>
        <span style={{ fontWeight: 700, fontSize: 16, minWidth: 160, textAlign: 'center' }}>{MONTHS[viewMonth]} {viewYear}</span>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>→</button>
      </div>

      {/* Day headers */}
      <div className="cal-grid" style={{ marginBottom: 4 }}>
        {DAYS.map(d => <div key={d} className="cal-header-cell">{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div className="cal-grid">
        {days.map((day, i) => {
          const dateKey = `${day.year}-${String(day.month + 1).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
          const isToday = day.date === today.getDate() && day.month === today.getMonth() && day.year === today.getFullYear();
          const dayEvents = eventsByDate[dateKey] || [];
          return (
            <div key={i} className={`cal-day${isToday ? ' today' : ''}${day.other ? ' other-month' : ''}`}
              onClick={() => !day.other && isManager && openNewEvent(day)}>
              <div className="cal-day-num" style={{ color: isToday ? 'var(--cyan)' : undefined }}>{day.date}</div>
              {dayEvents.slice(0, 3).map(ev => (
                <div key={ev.id} className="cal-dot" style={{ background: ev.color }}
                  onClick={e => { e.stopPropagation(); setViewEvent(ev); }}>
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && <div style={{ fontSize: 9, color: 'var(--t3)' }}>+{dayEvents.length - 3}</div>}
            </div>
          );
        })}
      </div>

      {/* Upcoming events list */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>This Month</div>
        {events.length === 0 ? (
          <div style={{ color: 'var(--t3)', fontSize: 13 }}>No events this month.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map(ev => (
              <div key={ev.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '10px 14px', cursor: 'pointer', borderLeft: `3px solid ${ev.color}` }} onClick={() => setViewEvent(ev)}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>{fmtDate(ev.start_date)}{ev.start_time ? ` · ${ev.start_time}` : ''}</div>
                </div>
                <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{ev.event_type}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Event detail modal */}
      {viewEvent && (
        <Modal title={viewEvent.title} onClose={() => setViewEvent(null)}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{viewEvent.event_type}</span>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: viewEvent.color, alignSelf: 'center', flexShrink: 0 }} />
          </div>
          <div style={{ color: 'var(--t2)', fontSize: 13, marginBottom: 8 }}>
            📅 {fmtDate(viewEvent.start_date)}{viewEvent.end_date && viewEvent.end_date !== viewEvent.start_date ? ` – ${fmtDate(viewEvent.end_date)}` : ''}
            {viewEvent.start_time && <> · {viewEvent.start_time}{viewEvent.end_time ? ` – ${viewEvent.end_time}` : ''}</>}
          </div>
          {viewEvent.description && <p style={{ fontSize: 14, color: 'var(--t1)', lineHeight: 1.6 }}>{viewEvent.description}</p>}
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 12 }}>Created by {viewEvent.creator_name}</div>
          {isManager && (
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-danger btn-sm" onClick={() => del(viewEvent.id)}>Delete Event</button>
            </div>
          )}
        </Modal>
      )}

      {/* Add event modal */}
      {showModal && (
        <Modal title="Add Event" onClose={() => setShowModal(false)}>
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">End Date (optional)</label>
                <input className="form-input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Start Time (optional)</label>
                <input className="form-input" type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">End Time (optional)</label>
                <input className="form-input" type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Type</label>
                <select className="form-input form-select" value={form.event_type} onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}>
                  {EVENT_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Color</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {EVENT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Event'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
