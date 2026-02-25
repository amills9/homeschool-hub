import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Link, FileText, BookOpen, Trash2, ExternalLink, X } from 'lucide-react';

const TYPE_ICONS = { link: Link, pdf: FileText, book: BookOpen, note: FileText };
const TYPE_LABELS = { link: 'Website', pdf: 'PDF', book: 'Book', note: 'Note' };
const TYPE_COLORS = { link: '#6C63FF', pdf: '#E76F51', book: '#2D6A4F', note: '#F4A261' };

function ResourceCard({ resource, onDelete }) {
  const Icon = TYPE_ICONS[resource.type] || Link;
  const color = TYPE_COLORS[resource.type] || '#6C63FF';
  return (
    <div className="card card-hover" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ padding: 10, borderRadius: 10, background: color + '18', flexShrink: 0 }}>
          <Icon size={18} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{resource.title}</div>
          {resource.child_name && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>👤 {resource.child_name}</div>}
          {resource.subject_name && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>📚 {resource.subject_name}</div>}
          {resource.notes && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>{resource.notes}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <span className="badge" style={{ background: color + '18', color: color }}>
              {TYPE_LABELS[resource.type] || resource.type}
            </span>
            {resource.url && (
              <a href={resource.url} target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12, padding: '3px 10px' }}
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={12} /> Open
              </a>
            )}
          </div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(resource.id)} style={{ color: 'var(--text-3)', padding: 4 }}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function AddResourceModal({ onClose, onAdd, children, subjects }) {
  const [form, setForm] = useState({ child_id: '', subject_id: '', title: '', type: 'link', url: '', notes: '' });
  const availableSubjects = subjects.filter(s => !form.child_id || s.child_id === form.child_id);

  async function handleSubmit(e) {
    e.preventDefault();
    await api.post('/resources', form);
    onAdd();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Resource</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label>Title *</label>
            <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Resource name" required />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Type</label>
              <select className="select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="link">Website Link</option>
                <option value="pdf">PDF</option>
                <option value="book">Book</option>
                <option value="note">Note</option>
              </select>
            </div>
            <div className="input-group">
              <label>Child (optional)</label>
              <select className="select" value={form.child_id} onChange={e => setForm({...form, child_id: e.target.value, subject_id: ''})}>
                <option value="">All children</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Subject (optional)</label>
            <select className="select" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})}>
              <option value="">No subject</option>
              {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </div>
          {(form.type === 'link' || form.type === 'pdf') && (
            <div className="input-group">
              <label>URL</label>
              <input className="input" type="url" value={form.url} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." />
            </div>
          )}
          <div className="input-group">
            <label>Notes</label>
            <textarea className="textarea" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} placeholder="Optional description..." />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Add Resource</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [children, setChildren] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filterChild, setFilterChild] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [resRes, childRes] = await Promise.all([api.get('/resources'), api.get('/children')]);
    setResources(resRes.data);
    const kids = childRes.data;
    setChildren(kids);
    const subs = await Promise.all(kids.map(k => api.get(`/children/${k.id}/subjects`)));
    setSubjects(subs.flatMap(r => r.data));
  }

  async function deleteResource(id) {
    if (!confirm('Delete this resource?')) return;
    await api.delete(`/resources/${id}`);
    loadAll();
  }

  const filtered = resources.filter(r =>
    (!filterChild || r.child_id === filterChild || !r.child_id) &&
    (!filterType || r.type === filterType)
  );

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Resources</h1>
          <p className="page-subtitle">Learning materials & links</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Resource
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select className="select" style={{ width: 160 }} value={filterChild} onChange={e => setFilterChild(e.target.value)}>
          <option value="">All Children</option>
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select" style={{ width: 160 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option value="link">Websites</option>
          <option value="pdf">PDFs</option>
          <option value="book">Books</option>
          <option value="note">Notes</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>No resources yet</h3>
          <p>Add websites, books, and materials for your children</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {filtered.map(r => <ResourceCard key={r.id} resource={r} onDelete={deleteResource} />)}
        </div>
      )}

      {showModal && (
        <AddResourceModal
          onClose={() => setShowModal(false)}
          onAdd={loadAll}
          children={children}
          subjects={subjects}
        />
      )}
    </div>
  );
}
