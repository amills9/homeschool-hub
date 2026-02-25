import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getWeekStart, getWeekDays, nextWeek, prevWeek, formatWeekRange } from '../utils/dates';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Clock, RotateCcw, X } from 'lucide-react';

function TaskCard({ task, onToggle, onDelete }) {
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 'var(--radius-sm)',
      background: task.is_completed ? 'var(--surface-2)' : 'var(--surface)',
      border: `1.5px solid ${task.is_completed ? 'var(--border)' : (task.subject_color || '#E2DDD8')}40`,
      borderLeft: `4px solid ${task.subject_color || 'var(--border)'}`,
      marginBottom: 8,
      transition: 'all 0.2s',
      opacity: task.is_completed ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <button
          onClick={() => onToggle(task)}
          style={{
            flexShrink: 0, width: 20, height: 20, borderRadius: 6,
            border: `2px solid ${task.is_completed ? 'var(--primary)' : 'var(--border)'}`,
            background: task.is_completed ? 'var(--primary)' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 2, transition: 'all 0.15s',
          }}
        >
          {task.is_completed && <Check size={12} color="white" strokeWidth={3} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500,
            color: task.is_completed ? 'var(--text-3)' : 'var(--text)',
            textDecoration: task.is_completed ? 'line-through' : 'none',
          }}>{task.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {task.subject_name && (
              <span style={{ fontSize: 11, color: task.subject_color || 'var(--text-3)' }}>
                {task.subject_icon} {task.subject_name}
              </span>
            )}
            {task.duration_minutes && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}>
                <Clock size={10} /> {task.duration_minutes}min
              </span>
            )}
            {task.is_recurring === 1 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}>
                <RotateCcw size={10} /> recurring
              </span>
            )}
          </div>
          {task.description && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{task.description}</div>
          )}
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(task.id)}
          style={{ flexShrink: 0, color: 'var(--text-3)', padding: 4 }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

function AddTaskModal({ onClose, onAdd, children, subjects, defaultDay, weekStart }) {
  const [form, setForm] = useState({
    child_id: children[0]?.id || '',
    subject_id: '',
    title: '',
    description: '',
    day_of_week: defaultDay || 'Monday',
    duration_minutes: 60,
    is_recurring: false,
  });
  const availableSubjects = subjects.filter(s => s.child_id === form.child_id);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post('/tasks', { ...form, week_start: weekStart });
    onAdd();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Task</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label>Child</label>
            <select className="select" value={form.child_id} onChange={e => setForm({...form, child_id: e.target.value, subject_id: ''})}>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Task Title *</label>
            <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Reading — Chapter 5" required />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Subject</label>
              <select className="select" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})}>
                <option value="">No subject</option>
                {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Day</label>
              <select className="select" value={form.day_of_week} onChange={e => setForm({...form, day_of_week: e.target.value})}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Duration (minutes)</label>
              <input className="input" type="number" min={5} max={480} value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: +e.target.value})} />
            </div>
            <div className="input-group" style={{ justifyContent: 'flex-end' }}>
              <label>&nbsp;</label>
              <label className="checkbox-wrap" style={{ height: 42 }}>
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm({...form, is_recurring: e.target.checked})} />
                <span style={{ fontSize: 14 }}>Recurring weekly</span>
              </label>
            </div>
          </div>
          <div className="input-group">
            <label>Notes</label>
            <textarea className="textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Optional notes..." rows={2} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WeeklyPlanner() {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [tasks, setTasks] = useState([]);
  const [children, setChildren] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedChild, setSelectedChild] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [addDay, setAddDay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [weekStart, selectedChild]);

  async function loadAll() {
    setLoading(true);
    try {
      const [childRes] = await Promise.all([api.get('/children')]);
      const kids = childRes.data;
      setChildren(kids);

      // Load all subjects
      const subjectArrays = await Promise.all(kids.map(k => api.get(`/children/${k.id}/subjects`)));
      setSubjects(subjectArrays.flatMap(r => r.data));

      const params = new URLSearchParams({ week_start: weekStart });
      if (selectedChild !== 'all') params.set('child_id', selectedChild);
      const tasksRes = await api.get(`/tasks?${params}`);
      setTasks(tasksRes.data);
    } finally { setLoading(false); }
  }

  async function toggleTask(task) {
    await api.patch(`/tasks/${task.id}/complete`);
    loadAll();
  }

  async function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${id}`);
    loadAll();
  }

  async function copyRecurring() {
    const prev = prevWeek(weekStart);
    await api.post('/tasks/copy-recurring', { from_week: prev, to_week: weekStart });
    loadAll();
  }

  const days = getWeekDays(weekStart);

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Weekly Planner</h1>
          <p className="page-subtitle">{formatWeekRange(weekStart)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={copyRecurring} title="Copy recurring tasks from previous week">
            <RotateCcw size={14} /> Copy Recurring
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => { setAddDay(null); setShowModal(true); }}>
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setWeekStart(prevWeek(weekStart))}>
            <ChevronLeft size={16} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(getWeekStart())}>Today</button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setWeekStart(nextWeek(weekStart))}>
            <ChevronRight size={16} />
          </button>
        </div>
        <select className="select" style={{ width: 160 }} value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
          <option value="all">All Children</option>
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Day columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {days.map(day => {
          const dayTasks = tasks.filter(t => t.day_of_week === day.name);
          const done = dayTasks.filter(t => t.is_completed).length;
          return (
            <div key={day.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Day header */}
              <div style={{
                padding: '10px 14px',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                borderBottom: '3px solid var(--primary)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{day.short}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{day.date}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                  {done}/{dayTasks.length} done
                </div>
              </div>

              {/* Tasks */}
              <div style={{ flex: 1 }}>
                {loading ? (
                  <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
                    <div className="spinner" />
                  </div>
                ) : dayTasks.length === 0 ? (
                  <div style={{ padding: '16px 10px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
                    No tasks
                  </div>
                ) : dayTasks.map(task => (
                  <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                ))}
              </div>

              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                onClick={() => { setAddDay(day.name); setShowModal(true); }}
              >
                <Plus size={12} /> Add
              </button>
            </div>
          );
        })}
      </div>

      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onAdd={loadAll}
          children={children}
          subjects={subjects}
          defaultDay={addDay}
          weekStart={weekStart}
        />
      )}
    </div>
  );
}
