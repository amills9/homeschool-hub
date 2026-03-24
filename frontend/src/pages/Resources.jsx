import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, Link, FileText, BookOpen, Trash2, ExternalLink, X, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

const TYPE_ICONS  = { link: Link, pdf: FileText, book: BookOpen, note: FileText };
const TYPE_LABELS = { link: 'Website', pdf: 'PDF', book: 'Book', note: 'Note' };
const TYPE_COLORS = { link: '#6C63FF', pdf: '#E76F51', book: '#2D6A4F', note: '#F4A261' };

// ── Resource Card ─────────────────────────────────────────────
function ResourceCard({ resource, onDelete, onEdit }) {
  const Icon  = TYPE_ICONS[resource.type]  || Link;
  const color = TYPE_COLORS[resource.type] || '#6C63FF';
  return (
    <div className="card card-hover" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ padding: 8, borderRadius: 8, background: color + '18', flexShrink: 0 }}>
          <Icon size={16} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resource.title}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: resource.notes ? 4 : 0 }}>
            {resource.child_name && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>👤 {resource.child_name}</span>}
            {resource.subject_name && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>📚 {resource.subject_name}</span>}
            <span className="badge" style={{ background: color + '18', color, fontSize: 10 }}>{TYPE_LABELS[resource.type] || resource.type}</span>
          </div>
          {resource.notes && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{resource.notes}</div>}
          {resource.url && (
            <a href={resource.url} target="_blank" rel="noopener noreferrer"
              className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px', marginTop: 6 }}
              onClick={e => e.stopPropagation()}>
              <ExternalLink size={11} /> Open
            </a>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(resource)} style={{ color: 'var(--text-3)', padding: 4 }}><Pencil size={13} /></button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(resource.id)} style={{ color: 'var(--text-3)', padding: 4 }}><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

// ── Collapsible Group ─────────────────────────────────────────
function ResourceGroup({ label, count, color, resources, onDelete, onEdit }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 16 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer', marginBottom: open ? 10 : 0, borderLeft: color ? `4px solid ${color}` : '1px solid var(--border)' }}>
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{count} resource{count !== 1 ? 's' : ''}</span>
        {open ? <ChevronUp size={16} color="var(--text-3)" /> : <ChevronDown size={16} color="var(--text-3)" />}
      </div>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, paddingLeft: 4 }}>
          {resources.map(r => <ResourceCard key={r.id} resource={r} onDelete={onDelete} onEdit={onEdit} />)}
        </div>
      )}
    </div>
  );
}

// ── Resource Modal ────────────────────────────────────────────
function ResourceModal({ resource, onClose, onSave, children, subjects }) {
  const isEdit = !!resource;
  const [form, setForm] = useState(resource || { child_id: '', subject_id: '', title: '', type: 'link', url: '', notes: '' });
  const availableSubjects = subjects.filter(s => !form.child_id || s.child_id === form.child_id);

  async function handleSubmit(e) {
    e.preventDefault();
    if (isEdit) await api.put(`/resources/${resource.id}`, form);
    else await api.post('/resources', form);
    onSave();
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Resource' : 'Add Resource'}</h2>
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
              <select className="select" value={form.child_id || ''} onChange={e => setForm({...form, child_id: e.target.value, subject_id: ''})}>
                <option value="">All children</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="input-group">
            <label>Subject (optional)</label>
            <select className="select" value={form.subject_id || ''} onChange={e => setForm({...form, subject_id: e.target.value})}>
              <option value="">No subject</option>
              {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </div>
          {(form.type === 'link' || form.type === 'pdf') && (
            <div className="input-group">
              <label>URL</label>
              <input className="input" type="url" value={form.url || ''} onChange={e => setForm({...form, url: e.target.value})} placeholder="https://..." />
            </div>
          )}
          <div className="input-group">
            <label>Notes</label>
            <textarea className="textarea" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} rows={2} placeholder="Optional description..." />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isEdit ? 'Save Changes' : 'Add Resource'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Grouping helpers ──────────────────────────────────────────
function groupBy(resources, mode, children, subjects) {
  if (mode === 'none') return [{ label: null, resources }];

  const groups = {};

  for (const r of resources) {
    let key, label, color;

    if (mode === 'child') {
      key   = r.child_id || '__none';
      label = r.child_name || 'No child assigned';
      const child = children.find(c => c.id === r.child_id);
      color = child?.avatar_color || null;
    } else if (mode === 'subject') {
      key   = r.subject_id || '__none';
      label = r.subject_name || 'No subject';
      const sub = subjects.find(s => s.id === r.subject_id);
      color = sub?.color || null;
    } else if (mode === 'child_subject') {
      const childLabel   = r.child_name || 'No child';
      const subjectLabel = r.subject_name || 'No subject';
      key   = `${r.child_id || '_'}__${r.subject_id || '_'}`;
      label = `${childLabel} — ${subjectLabel}`;
      const child = children.find(c => c.id === r.child_id);
      color = child?.avatar_color || null;
    } else if (mode === 'type') {
      key   = r.type;
      label = TYPE_LABELS[r.type] || r.type;
      color = TYPE_COLORS[r.type] || null;
    }

    if (!groups[key]) groups[key] = { label, color, resources: [] };
    groups[key].resources.push(r);
  }

  return Object.values(groups).sort((a, b) => a.label?.localeCompare(b.label));
}

// ── Main ──────────────────────────────────────────────────────
export default function Resources() {
  const [resources, setResources] = useState([]);
  const [children, setChildren]   = useState([]);
  const [subjects, setSubjects]   = useState([]);
  const [filterChild, setFilterChild] = useState('');
  const [filterType, setFilterType]   = useState('');
  const [groupMode, setGroupMode]     = useState('none');  // none | child | subject | child_subject | type
  const [showModal, setShowModal]     = useState(false);
  const [editResource, setEditResource] = useState(null);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [resRes, childRes] = await Promise.all([api.get('/resources'), api.get('/children')]);
    setResources(Array.isArray(resRes.data) ? resRes.data : []);
    const kids = Array.isArray(childRes.data) ? childRes.data : [];
    setChildren(kids);
    const subs = await Promise.all(kids.map(k => api.get(`/children/${k.id}/subjects`).catch(() => ({ data: [] }))));
    setSubjects(subs.flatMap(r => Array.isArray(r.data) ? r.data : []));
  }

  async function deleteResource(id) {
    if (!confirm('Delete this resource?')) return;
    await api.delete(`/resources/${id}`);
    loadAll();
  }

  const filtered = resources.filter(r =>
    (!filterChild || r.child_id === filterChild) &&
    (!filterType  || r.type === filterType)
  );

  const groups = groupBy(filtered, groupMode, children, subjects);

  const GROUP_OPTIONS = [
    { value: 'none',          label: 'No grouping' },
    { value: 'child',         label: 'Group by child' },
    { value: 'subject',       label: 'Group by subject' },
    { value: 'child_subject', label: 'Group by child & subject' },
    { value: 'type',          label: 'Group by type' },
  ];

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Resources</h1>
          <p className="page-subtitle">{resources.length} resource{resources.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditResource(null); setShowModal(true); }}>
          <Plus size={16} /> Add Resource
        </button>
      </div>

      {/* Filters + grouping */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="input-group" style={{ minWidth: 150 }}>
          <label style={{ fontSize: 12 }}>Filter by child</label>
          <select className="select" value={filterChild} onChange={e => setFilterChild(e.target.value)}>
            <option value="">All Children</option>
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="input-group" style={{ minWidth: 150 }}>
          <label style={{ fontSize: 12 }}>Filter by type</label>
          <select className="select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="link">Websites</option>
            <option value="pdf">PDFs</option>
            <option value="book">Books</option>
            <option value="note">Notes</option>
          </select>
        </div>
        <div className="input-group" style={{ minWidth: 200 }}>
          <label style={{ fontSize: 12 }}>Group by</label>
          <select className="select" value={groupMode} onChange={e => setGroupMode(e.target.value)}>
            {GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {(filterChild || filterType) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterChild(''); setFilterType(''); }}>
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>{resources.length === 0 ? 'No resources yet' : 'No resources match your filters'}</h3>
          <p>{resources.length === 0 ? 'Add websites, books, and materials for your children' : 'Try clearing your filters'}</p>
        </div>
      ) : groupMode === 'none' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(r => (
            <ResourceCard key={r.id} resource={r} onDelete={deleteResource} onEdit={r => { setEditResource(r); setShowModal(true); }} />
          ))}
        </div>
      ) : (
        <div>
          {groups.map((group, i) => (
            <ResourceGroup
              key={i}
              label={group.label}
              count={group.resources.length}
              color={group.color}
              resources={group.resources}
              onDelete={deleteResource}
              onEdit={r => { setEditResource(r); setShowModal(true); }}
            />
          ))}
        </div>
      )}

      {showModal && (
        <ResourceModal
          resource={editResource}
          onClose={() => { setShowModal(false); setEditResource(null); }}
          onSave={loadAll}
          children={children}
          subjects={subjects}
        />
      )}
    </div>
  );
}
