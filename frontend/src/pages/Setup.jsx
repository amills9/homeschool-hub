import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const SUBJECT_ICONS = ['📚','🔢','🌍','🔬','🎨','🎵','💻','🏃','✍️','🌿','🗣️','📖','🧪','🏛️','⚽'];
const COLORS = ['#2D6A4F','#52B788','#6C63FF','#F4A261','#E76F51','#264653','#E9C46A','#219EBC','#FB8500','#8338EC'];

// Standard NSW learning areas shown as quick-add buttons
const STANDARD_SUBJECTS = [
  { name: 'English',       icon: '📖', color: '#6C63FF' },
  { name: 'Mathematics',   icon: '🔢', color: '#219EBC' },
  { name: 'Science',       icon: '🔬', color: '#2D6A4F' },
  { name: 'HSIE',          icon: '🌍', color: '#E76F51' },
  { name: 'Creative Arts', icon: '🎨', color: '#E9C46A' },
  { name: 'PDHPE',         icon: '🏃', color: '#52B788' },
  { name: 'TAS',           icon: '💻', color: '#264653' },
];

function SubjectForm({ child, subject, subjects, onSave, onCancel }) {
  const [form, setForm] = useState(subject || { name: '', color: COLORS[0], icon: '📚', target_hours_per_week: 5 });

  function quickPick(s) {
    setForm({ ...form, name: s.name, icon: s.icon, color: s.color });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (subject) {
      await api.put(`/children/${child.id}/subjects/${subject.id}`, form);
    } else {
      await api.post(`/children/${child.id}/subjects`, form);
    }
    onSave();
  }
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface-2)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
      {!subject && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>Quick pick a learning area</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STANDARD_SUBJECTS.map(s => (
              <button key={s.name} type="button" onClick={() => quickPick(s)}
                style={{ padding: '5px 12px', borderRadius: 20, border: `2px solid ${s.color}`, background: form.name === s.name ? s.color : 'transparent', color: form.name === s.name ? 'white' : s.color, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                {s.icon} {s.name}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Or type a custom name below</div>
        </div>
      )}
      <div className="grid-2">
        <div className="input-group">
          <label>Subject Name *</label>
          <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Mathematics" required />
        </div>
        <div className="input-group">
          <label>Hours / Week</label>
          <input className="input" type="number" min={0.5} max={40} step={0.5} value={form.target_hours_per_week} onChange={e => setForm({...form, target_hours_per_week: +e.target.value})} />
        </div>
      </div>
      <div className="input-group">
        <label>Icon</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {SUBJECT_ICONS.map(icon => (
            <button key={icon} type="button"
              onClick={() => setForm({...form, icon})}
              style={{
                width: 36, height: 36, fontSize: 18, cursor: 'pointer', borderRadius: 8,
                background: form.icon === icon ? 'var(--primary-pale)' : 'var(--surface)',
                border: `2px solid ${form.icon === icon ? 'var(--primary)' : 'var(--border)'}`,
              }}>{icon}</button>
          ))}
        </div>
      </div>
      <div className="input-group">
        <label>Color</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setForm({...form, color: c})}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `3px solid ${form.color === c ? 'var(--text)' : 'transparent'}`, cursor: 'pointer' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm"><Check size={14} /> Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}><X size={14} /> Cancel</button>
      </div>
    </form>
  );
}

function OutcomeRow({ outcome, childId, subjects, onDelete, onRefresh }) {
  async function toggle() {
    await api.put(`/children/${childId}/outcomes/${outcome.id}`, { ...outcome, achieved: !outcome.achieved });
    onRefresh();
  }
  async function del() {
    if (!confirm('Delete this outcome?')) return;
    await api.delete(`/children/${childId}/outcomes/${outcome.id}`);
    onRefresh();
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <input type="checkbox" checked={!!outcome.achieved} onChange={toggle} style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, textDecoration: outcome.achieved ? 'line-through' : 'none', color: outcome.achieved ? 'var(--text-3)' : 'var(--text)' }}>{outcome.title}</div>
        {outcome.subject_name && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{outcome.subject_icon} {outcome.subject_name}</div>}
      </div>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={del} style={{ color: 'var(--text-3)', padding: 4 }}><Trash2 size={13} /></button>
    </div>
  );
}

function ChildSection({ child, onRefresh }) {
  const [subjects, setSubjects] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editSubject, setEditSubject] = useState(null);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const [newOutcome, setNewOutcome] = useState({ title: '', subject_id: '', target_date: '' });

  useEffect(() => { loadChild(); }, [child.id]);

  async function loadChild() {
    const [subRes, outRes] = await Promise.all([
      api.get(`/children/${child.id}/subjects`),
      api.get(`/children/${child.id}/outcomes`),
    ]);
    setSubjects(subRes.data);
    setOutcomes(outRes.data);
  }

  async function addAllStandardSubjects() {
    const existing = subjects.map(s => s.name.toLowerCase());
    const toAdd = STANDARD_SUBJECTS.filter(s => !existing.includes(s.name.toLowerCase()));
    if (toAdd.length === 0) { alert('All standard subjects already added!'); return; }
    await Promise.all(toAdd.map(s => api.post(`/children/${child.id}/subjects`, { name: s.name, icon: s.icon, color: s.color, target_hours_per_week: 5 })));
    loadChild();
  }

  async function deleteSubject(id) {
    if (!confirm('Delete this subject?')) return;
    await api.delete(`/children/${child.id}/subjects/${id}`);
    loadChild();
  }

  async function addOutcome(e) {
    e.preventDefault();
    await api.post(`/children/${child.id}/outcomes`, newOutcome);
    setNewOutcome({ title: '', subject_id: '', target_date: '' });
    setShowOutcomeForm(false);
    loadChild();
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: child.avatar_color, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16,
        }}>{child.name[0]}</div>
        <div>
          <h3 style={{ fontSize: 18, fontFamily: 'var(--font-display)' }}>{child.name}</h3>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Year {child.year_level}</div>
        </div>
      </div>

      {/* Subjects */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h4 style={{ fontSize: 15 }}>Subjects</h4>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={addAllStandardSubjects} title="Add all NSW learning areas at once">
              ✨ Add All Standard
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowSubjectForm(!showSubjectForm); setEditSubject(null); }}>
              <Plus size={14} /> Add Subject
            </button>
          </div>
        </div>
        {showSubjectForm && !editSubject && (
          <div style={{ marginBottom: 12 }}>
            <SubjectForm child={child} subjects={subjects} onSave={() => { setShowSubjectForm(false); loadChild(); }} onCancel={() => setShowSubjectForm(false)} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {subjects.map(s => editSubject?.id === s.id ? (
            <SubjectForm key={s.id} child={child} subject={s} subjects={subjects} onSave={() => { setEditSubject(null); loadChild(); }} onCancel={() => setEditSubject(null)} />
          ) : (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: s.color + '12', border: `1.5px solid ${s.color}30` }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.target_hours_per_week}h / week</div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditSubject(s)} style={{ padding: 4 }}><Pencil size={13} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteSubject(s.id)} style={{ color: 'var(--danger)', padding: 4 }}><Trash2 size={13} /></button>
            </div>
          ))}
          {subjects.length === 0 && !showSubjectForm && <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0' }}>No subjects yet</div>}
        </div>
      </div>

      {/* Learning Outcomes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h4 style={{ fontSize: 15 }}>Learning Outcomes</h4>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowOutcomeForm(!showOutcomeForm)}>
            <Plus size={14} /> Add Outcome
          </button>
        </div>
        {showOutcomeForm && (
          <form onSubmit={addOutcome} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, background: 'var(--surface-2)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <input className="input" value={newOutcome.title} onChange={e => setNewOutcome({...newOutcome, title: e.target.value})} placeholder="e.g. Can multiply fractions" required />
            <div className="grid-2">
              <select className="select" value={newOutcome.subject_id} onChange={e => setNewOutcome({...newOutcome, subject_id: e.target.value})}>
                <option value="">No subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
              <input className="input" type="date" value={newOutcome.target_date} onChange={e => setNewOutcome({...newOutcome, target_date: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary btn-sm"><Check size={14} /> Save</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowOutcomeForm(false)}><X size={14} /> Cancel</button>
            </div>
          </form>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {outcomes.map(o => <OutcomeRow key={o.id} outcome={o} childId={child.id} subjects={subjects} onDelete={loadChild} onRefresh={loadChild} />)}
          {outcomes.length === 0 && !showOutcomeForm && <div style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '12px 0' }}>No outcomes yet</div>}
        </div>
      </div>
    </div>
  );
}

export default function Setup() {
  const [children, setChildren] = useState([]);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [childRes, settRes] = await Promise.all([api.get('/children'), api.get('/settings')]);
    setChildren(childRes.data);
    setSettings(settRes.data);
  }

  async function saveSettings() {
    setSaving(true);
    await api.put('/settings', settings);
    setSaving(false);
  }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Setup</h1>
          <p className="page-subtitle">Subjects, outcomes & school settings</p>
        </div>
      </div>

      {/* School settings */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 16 }}>School Settings</h3>
        <div className="grid-2">
          <div className="input-group">
            <label>School Name</label>
            <input className="input" value={settings.school_name || ''} onChange={e => setSettings({...settings, school_name: e.target.value})} placeholder="Our Homeschool" />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Per-child setup */}
      {children.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎒</div>
          <h3>No children added yet</h3>
          <p>Go to the Admin page to add children first</p>
        </div>
      ) : (
        children.map(child => <ChildSection key={child.id} child={child} onRefresh={loadAll} />)
      )}
    </div>
  );
}
