import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getWeekStart, getWeekDays, nextWeek, prevWeek, formatWeekRange } from '../utils/dates';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Clock, RotateCcw, X, Link, Pencil, Printer, ExternalLink } from 'lucide-react';

const PRINT_STYLE = `
@media print {
  body * { visibility: hidden !important; }
  #print-area, #print-area * { visibility: visible !important; }
  #print-area { position: fixed; inset: 0; background: white; padding: 24px; z-index: 9999; }
  @page { size: A4 landscape; margin: 12mm; }
}
`;
function injectPrintStyle() {
  if (!document.getElementById('planner-print-style')) {
    const s = document.createElement('style');
    s.id = 'planner-print-style';
    s.textContent = PRINT_STYLE;
    document.head.appendChild(s);
  }
}

// ── Task Card ─────────────────────────────────────────────────
function TaskCard({ task, onToggle, onDelete, onEdit }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
      background: task.is_completed ? 'var(--surface-2)' : 'var(--surface)',
      border: `1.5px solid ${task.is_completed ? 'var(--border)' : (task.subject_color || '#E2DDD8')}40`,
      borderLeft: `4px solid ${task.subject_color || 'var(--border)'}`,
      marginBottom: 8, transition: 'all 0.2s', opacity: task.is_completed ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <button onClick={() => onToggle(task)} style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: 6,
          border: `2px solid ${task.is_completed ? 'var(--primary)' : 'var(--border)'}`,
          background: task.is_completed ? 'var(--primary)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginTop: 2, transition: 'all 0.15s',
        }}>
          {task.is_completed && <Check size={12} color="white" strokeWidth={3} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: task.is_completed ? 'var(--text-3)' : 'var(--text)', textDecoration: task.is_completed ? 'line-through' : 'none' }}>
            {task.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {task.subject_name && <span style={{ fontSize: 11, color: task.subject_color || 'var(--text-3)' }}>{task.subject_icon} {task.subject_name}</span>}
            {task.duration_minutes > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}><Clock size={10} />{task.duration_minutes}min</span>}
            {task.is_recurring === 1 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}><RotateCcw size={10} />recurring</span>}
            {task.resource_title && (
              task.resource_url ? (
                <a href={task.resource_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--primary)', textDecoration: 'none' }}
                  onClick={e => e.stopPropagation()}>
                  <ExternalLink size={10} />{task.resource_title}
                </a>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}>
                  <Link size={10} />{task.resource_title}
                </span>
              )
            )}
          </div>
          {task.description && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{task.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(task)} style={{ color: 'var(--text-3)', padding: 4 }} title="Edit"><Pencil size={12} /></button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(task.id)} style={{ color: 'var(--text-3)', padding: 4 }} title="Delete"><Trash2 size={12} /></button>
        </div>
      </div>
    </div>
  );
}

// ── Task Form ─────────────────────────────────────────────────
function TaskForm({ initial, children, subjects, resources, weekStart, onSubmit, onClose, isEdit }) {
  const [form, setForm] = useState(initial);

  const availableSubjects = subjects.filter(s => s.child_id === form.child_id);

  // Filter resources: match the selected subject (or show all for child if no subject selected)
  const availableResources = resources.filter(r => {
    if (r.child_id && r.child_id !== form.child_id) return false;
    if (form.subject_id && r.subject_id && r.subject_id !== form.subject_id) return false;
    return true;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    await onSubmit({ ...form, week_start: weekStart });
    onClose();
  }

  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Task' : 'Add Task'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isEdit && (
            <div className="input-group">
              <label>Child</label>
              <select className="select" value={form.child_id} onChange={e => setForm({ ...form, child_id: e.target.value, subject_id: '', resource_id: '' })}>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="input-group">
            <label>Task Title *</label>
            <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Reading — Chapter 5" required />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Subject</label>
              <select className="select" value={form.subject_id || ''} onChange={e => setForm({ ...form, subject_id: e.target.value, resource_id: '' })}>
                <option value="">No subject</option>
                {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label>Day</label>
              <select className="select" value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })}>
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Resource <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
            <select className="select" value={form.resource_id || ''} onChange={e => setForm({ ...form, resource_id: e.target.value })}>
              <option value="">No resource</option>
              {availableResources.map(r => (
                <option key={r.id} value={r.id}>
                  {r.type === 'link' ? '🔗' : r.type === 'pdf' ? '📄' : r.type === 'book' ? '📚' : '📝'} {r.title}
                </option>
              ))}
            </select>
            {form.subject_id && availableResources.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>No resources for this subject yet</div>
            )}
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Duration (minutes)</label>
              <input className="input" type="number" min={5} max={480} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: +e.target.value })} />
            </div>
            <div className="input-group" style={{ justifyContent: 'flex-end' }}>
              <label>&nbsp;</label>
              <label className="checkbox-wrap" style={{ height: 42 }}>
                <input type="checkbox" checked={!!form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} />
                <span style={{ fontSize: 14 }}>Recurring weekly</span>
              </label>
            </div>
          </div>
          <div className="input-group">
            <label>Notes</label>
            <textarea className="textarea" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional notes..." rows={2} />
          </div>
          {isEdit && (
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form.is_completed} onChange={e => setForm({ ...form, is_completed: e.target.checked })} />
                <span>Mark as completed</span>
              </label>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isEdit ? 'Save Changes' : 'Add Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Print View ────────────────────────────────────────────────
function PrintView({ tasks, children, weekStart, onClose }) {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const weekLabel = formatWeekRange(weekStart);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 900, width: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">Print Weekly Plan</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => window.print()}><Printer size={15} /> Print</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div id="print-area">
          {children.map((child, ci) => {
            const childTasks = tasks.filter(t => t.child_id === child.id);
            if (childTasks.length === 0) return null;
            return (
              <div key={child.id} style={{ marginBottom: 40, pageBreakAfter: ci < children.length - 1 ? 'always' : 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: `3px solid ${child.avatar_color}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: child.avatar_color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
                    {child.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 20 }}>{child.name}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>Week of {weekLabel}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                  {days.map(day => {
                    const dayTasks = childTasks.filter(t => t.day_of_week === day);
                    const totalMins = dayTasks.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
                    return (
                      <div key={day}>
                        <div style={{ background: child.avatar_color, color: 'white', padding: '5px 8px', borderRadius: '5px 5px 0 0', fontWeight: 700, fontSize: 11 }}>
                          {day.slice(0,3)}
                          {totalMins > 0 && <div style={{ fontWeight: 400, fontSize: 10, opacity: 0.85 }}>{totalMins}min</div>}
                        </div>
                        <div style={{ border: `1px solid ${child.avatar_color}40`, borderTop: 'none', borderRadius: '0 0 5px 5px', minHeight: 100, padding: 5 }}>
                          {dayTasks.length === 0 ? (
                            <div style={{ color: '#ccc', fontSize: 11, padding: '6px 2px', textAlign: 'center' }}>—</div>
                          ) : dayTasks.map(task => (
                            <div key={task.id} style={{ padding: '4px 6px', marginBottom: 4, borderRadius: 3, borderLeft: `3px solid ${task.subject_color || child.avatar_color}`, background: `${task.subject_color || child.avatar_color}12`, fontSize: 11 }}>
                              <div style={{ fontWeight: 600 }}>{task.title}</div>
                              {task.subject_name && <div style={{ color: task.subject_color || '#888', fontSize: 10 }}>{task.subject_icon} {task.subject_name}</div>}
                              {task.duration_minutes > 0 && <div style={{ color: '#888', fontSize: 10 }}>⏱ {task.duration_minutes}min</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function WeeklyPlanner() {
  const [weekStart, setWeekStart] = useState(getWeekStart());
  const [tasks, setTasks] = useState([]);
  const [children, setChildren] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [resources, setResources] = useState([]);
  const [selectedChild, setSelectedChild] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [addDay, setAddDay] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(null);

  useEffect(() => { injectPrintStyle(); }, []);
  useEffect(() => { loadAll(); }, [weekStart, selectedChild]);
  useEffect(() => {
    const allDays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const todayName = allDays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
    setExpandedDay(todayName);
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [childRes, resourceRes] = await Promise.all([api.get('/children'), api.get('/resources')]);
      const kids = childRes.data;
      setChildren(kids);
      setResources(resourceRes.data);
      const subjectArrays = await Promise.all(kids.map(k => api.get(`/children/${k.id}/subjects`)));
      setSubjects(subjectArrays.flatMap(r => r.data));
      const params = new URLSearchParams({ week_start: weekStart });
      if (selectedChild !== 'all') params.set('child_id', selectedChild);
      const tasksRes = await api.get(`/tasks?${params}`);
      setTasks(tasksRes.data);
    } finally { setLoading(false); }
  }

  async function toggleTask(task) { await api.patch(`/tasks/${task.id}/complete`); loadAll(); }
  async function deleteTask(id) { if (!confirm('Delete this task?')) return; await api.delete(`/tasks/${id}`); loadAll(); }
  async function handleAddTask(form) { await api.post('/tasks', form); loadAll(); }
  async function handleEditTask(form) { await api.put(`/tasks/${form.id}`, form); loadAll(); }
  async function copyRecurring() { await api.post('/tasks/copy-recurring', { from_week: prevWeek(weekStart), to_week: weekStart }); loadAll(); }

  const days = getWeekDays(weekStart);
  const addInitial = {
    child_id: children[0]?.id || '',
    subject_id: '', resource_id: '', title: '', description: '',
    day_of_week: addDay || 'Monday', duration_minutes: 60, is_recurring: false,
  };

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Weekly Planner</h1>
          <p className="page-subtitle">{formatWeekRange(weekStart)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPrint(true)}><Printer size={14} /> Print</button>
          <button className="btn btn-ghost btn-sm" onClick={copyRecurring}><RotateCcw size={14} /> Copy Recurring</button>
          <button className="btn btn-primary btn-sm" onClick={() => { setAddDay(null); setShowModal(true); }}><Plus size={14} /> Add Task</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setWeekStart(prevWeek(weekStart))}><ChevronLeft size={16} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(getWeekStart())}>Today</button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setWeekStart(nextWeek(weekStart))}><ChevronRight size={16} /></button>
        </div>
        <select className="select" style={{ width: 160 }} value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
          <option value="all">All Children</option>
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Desktop — 7 column grid */}
      <div className="planner-desktop" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
        {days.map(day => {
          const dayTasks = tasks.filter(t => t.day_of_week === day.name);
          const done = dayTasks.filter(t => t.is_completed).length;
          const isWeekend = day.name === 'Saturday' || day.name === 'Sunday';
          return (
            <div key={day.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '10px 12px', background: isWeekend ? 'var(--surface-2)' : 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderBottom: `3px solid ${isWeekend ? 'var(--border)' : 'var(--primary)'}` }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{day.short}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{day.date}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{done}/{dayTasks.length}</div>
              </div>
              <div style={{ flex: 1 }}>
                {loading ? <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
                  : dayTasks.length === 0 ? <div style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>No tasks</div>
                  : dayTasks.map(task => <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onEdit={t => setEditTask(t)} />)}
              </div>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                onClick={() => { setAddDay(day.name); setShowModal(true); }}>
                <Plus size={12} /> Add
              </button>
            </div>
          );
        })}
      </div>

      {/* Mobile accordion */}
      <div className="planner-mobile" style={{ lexDirection: 'column', gap: 10 }}>
        {days.map(day => {
          const dayTasks = tasks.filter(t => t.day_of_week === day.name);
          const done = dayTasks.filter(t => t.is_completed).length;
          const isOpen = expandedDay === day.name;
          const isWeekend = day.name === 'Saturday' || day.name === 'Sunday';
          return (
            <div key={day.name} style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div onClick={() => setExpandedDay(isOpen ? null : day.name)}
                style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: isWeekend ? 'var(--surface-2)' : 'var(--surface)', cursor: 'pointer', borderBottom: isOpen ? `2px solid ${isWeekend ? 'var(--border)' : 'var(--primary)'}` : 'none' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{day.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 10 }}>{day.date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: done === dayTasks.length && dayTasks.length > 0 ? 'var(--primary)' : 'var(--text-3)' }}>{done}/{dayTasks.length}</span>
                  <span style={{ fontSize: 18, color: 'var(--text-3)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: '12px 12px 8px', background: 'var(--surface-2)' }}>
                  {loading ? <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
                    : dayTasks.length === 0 ? <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No tasks for {day.name}</div>
                    : dayTasks.map(task => <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} onEdit={t => setEditTask(t)} />)}
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 13, marginTop: 4 }}
                    onClick={() => { setAddDay(day.name); setShowModal(true); }}>
                    <Plus size={13} /> Add task
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && <TaskForm initial={addInitial} children={children} subjects={subjects} resources={resources} weekStart={weekStart} onSubmit={handleAddTask} onClose={() => setShowModal(false)} isEdit={false} />}
      {editTask && <TaskForm initial={{ ...editTask, is_recurring: editTask.is_recurring === 1 }} children={children} subjects={subjects} resources={resources} weekStart={weekStart} onSubmit={handleEditTask} onClose={() => setEditTask(null)} isEdit={true} />}
      {showPrint && <PrintView tasks={tasks} children={children} weekStart={weekStart} onClose={() => setShowPrint(false)} />}
    </div>
  );
}
