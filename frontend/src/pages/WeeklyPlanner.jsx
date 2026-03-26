import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getWeekStart, getWeekDays, nextWeek, prevWeek, formatWeekRange } from '../utils/dates';
import {
  ChevronLeft, ChevronRight, Plus, Check, Trash2, Clock, RotateCcw,
  X, Link, Pencil, Printer, ExternalLink, Camera, ZoomIn,
  Facebook, Instagram, Copy, BookmarkPlus,
} from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// ── URL detection helper ──────────────────────────────────────
function linkifyText(text) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--primary)', textDecoration: 'underline' }}
          onClick={e => e.stopPropagation()}>{part}</a>
      : part
  );
}

// ── Modal wrapper ─────────────────────────────────────────────
function Modal({ onClose, children, maxWidth = 560 }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth, width: '100%' }}>
        {children}
      </div>
    </div>
  );
}

// ── Photo Upload ──────────────────────────────────────────────
function PhotoUploadModal({ task, onClose, onUploaded }) {
  const [preview, setPreview] = useState(null);
  const [base64, setBase64] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('Image must be under 8MB'); return; }
    setError('');
    const reader = new FileReader();
    reader.onload = ev => { setPreview(ev.target.result); setBase64(ev.target.result); };
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!base64) return;
    setUploading(true); setError('');
    try {
      const res = await api.post('/photos/upload', { task_id: task.id, image_base64: base64, caption });
      onUploaded(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Upload failed');
    } finally { setUploading(false); }
  }

  return (
    <Modal onClose={onClose} maxWidth={480}>
      <div className="modal-header">
        <h2 className="modal-title">Add Photo</h2>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Task: <strong>{task.title}</strong></div>
        {preview ? (
          <div style={{ position: 'relative' }}>
            <img src={preview} alt="" style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: 280, objectFit: 'cover' }} />
            <button onClick={() => { setPreview(null); setBase64(null); }}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <div onClick={() => fileRef.current.click()}
            style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '32px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)' }}>
            <Camera size={32} color="var(--text-3)" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Tap to add photo</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>JPG, PNG · max 8MB</div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
        <div className="input-group">
          <label>Caption <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
          <textarea className="textarea" rows={2} value={caption} onChange={e => setCaption(e.target.value)} placeholder="What did we learn today?" />
        </div>
        {error && <div style={{ color: 'var(--danger)', fontSize: 13, padding: '8px 12px', background: 'rgba(231,111,81,0.1)', borderRadius: 6 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={!base64 || uploading}>
            {uploading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Uploading...</> : <><Camera size={14} /> Upload</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Photo Viewer ──────────────────────────────────────────────
function PhotoViewer({ photo, task, onClose, onDelete }) {
  const [copied, setCopied] = useState(false);
  const shareText = `${photo.caption || task.title} — shared from Homeschool HUB`;

  function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photo.url)}&quote=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=400');
  }
  function shareInstagram() {
    navigator.clipboard.writeText(shareText).then(() => alert('Caption copied! Open Instagram and paste when creating your post.'));
  }
  async function copyLink() { await navigator.clipboard.writeText(photo.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  async function handleDelete() {
    if (!confirm('Delete this photo?')) return;
    await api.delete(`/photos/${photo.id}`);
    onDelete(photo.id);
    onClose();
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 24, gap: 16 }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={18} />
      </button>
      <img src={photo.url} alt={photo.caption || task.title} style={{ maxWidth: '85vw', maxHeight: '60vh', borderRadius: 12, objectFit: 'contain' }} />
      {photo.caption && <div style={{ color: 'white', fontSize: 15, textAlign: 'center', maxWidth: 500 }}>{photo.caption}</div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={shareFacebook} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1877F2', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <Facebook size={16} /> Facebook
        </button>
        <button onClick={shareInstagram} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <Instagram size={16} /> Instagram
        </button>
        <button onClick={copyLink} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <Copy size={16} /> {copied ? 'Copied!' : 'Copy Link'}
        </button>
        <button onClick={handleDelete} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgba(231,111,81,0.3)', color: '#ff9988', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <Trash2 size={16} /> Delete
        </button>
      </div>
      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Instagram: tap Copy for Instagram, then paste the caption in the app</div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────
function TaskCard({ task, onToggle, onDelete, onEdit }) {
  const [photos, setPhotos] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);

  useEffect(() => {
    api.get(`/photos?task_id=${task.id}`).then(r => setPhotos(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [task.id]);

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
      background: task.is_completed ? 'var(--surface-2)' : 'var(--surface)',
      border: `1.5px solid ${(task.subject_color || '#E2DDD8')}40`,
      borderLeft: `4px solid ${task.subject_color || 'var(--border)'}`,
      marginBottom: 8, opacity: task.is_completed ? 0.85 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <button onClick={() => onToggle(task)} style={{
          flexShrink: 0, width: 20, height: 20, borderRadius: 6,
          border: `2px solid ${task.is_completed ? 'var(--primary)' : 'var(--border)'}`,
          background: task.is_completed ? 'var(--primary)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
        }}>
          {task.is_completed && <Check size={12} color="white" strokeWidth={3} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: task.is_completed ? 'var(--text-3)' : 'var(--text)', textDecoration: task.is_completed ? 'line-through' : 'none', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {task.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {task.subject_name && <span style={{ fontSize: 11, color: task.subject_color || 'var(--text-3)' }}>{task.subject_icon} {task.subject_name}</span>}
            {task.duration_minutes > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}><Clock size={10} />{task.duration_minutes}min</span>}
            {task.is_recurring === 1 && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}><RotateCcw size={10} />recurring</span>}
            {task.resource_title && (
              task.resource_url
                ? <a href={task.resource_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--primary)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}><ExternalLink size={10} />{task.resource_title}</a>
                : <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}><Link size={10} />{task.resource_title}</span>
            )}
            {task.nsw_code && <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>{task.nsw_code}</span>}
          </div>
          {/* Notes with clickable URLs */}
          {task.description && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, wordBreak: 'break-word' }}>
              {linkifyText(task.description)}
            </div>
          )}
          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {photos.map(photo => (
                <div key={photo.id} onClick={() => setViewPhoto(photo)}
                  style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
                  <img src={photo.thumbnail_url || photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
              <div onClick={() => setShowUpload(true)}
                style={{ width: 52, height: 52, borderRadius: 6, border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--surface-2)', flexShrink: 0 }}>
                <Plus size={16} color="var(--text-3)" />
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(task)} style={{ color: 'var(--text-3)', padding: 4 }}><Pencil size={12} /></button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowUpload(true)} style={{ color: 'var(--text-3)', padding: 4 }}><Camera size={12} /></button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(task.id)} style={{ color: 'var(--text-3)', padding: 4 }}><Trash2 size={12} /></button>
        </div>
      </div>
      {showUpload && <PhotoUploadModal task={task} onClose={() => setShowUpload(false)} onUploaded={p => setPhotos(prev => [...prev, p])} />}
      {viewPhoto && <PhotoViewer photo={viewPhoto} task={task} onClose={() => setViewPhoto(null)} onDelete={id => setPhotos(prev => prev.filter(p => p.id !== id))} />}
    </div>
  );
}

// ── Task Form ─────────────────────────────────────────────────
function TaskForm({ initial, kids, subjects, resources, weekStart, onSubmit, onClose, isEdit, onResourceSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState(initial);
  const [outcomes, setOutcomes] = useState([]);
  const [loadingOutcomes, setLoadingOutcomes] = useState(false);

  // Quick resource (one-off link)
  const [quickUrl, setQuickUrl] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [saveToResources, setSaveToResources] = useState(false);
  const [showQuickResource, setShowQuickResource] = useState(false);

  const userState = (user?.state || 'NSW').toLowerCase();
  const stateCodeKey = `${userState}_code`;

  const availableSubjects = subjects.filter(s => s.child_id === form.child_id);
  const availableResources = resources.filter(r => {
    if (r.child_id && r.child_id !== form.child_id) return false;
    if (form.subject_id && r.subject_id && r.subject_id !== form.subject_id) return false;
    return true;
  });

  useEffect(() => {
    if (!form.child_id || !form.subject_id) { setOutcomes([]); return; }
    const subject = subjects.find(s => s.id === form.subject_id)?.name;
    if (!subject) { setOutcomes([]); return; }
    setLoadingOutcomes(true);
    api.get(`/curriculum/for-child/${form.child_id}`, { params: { subject } })
      .then(r => setOutcomes(r.data || []))
      .catch(() => setOutcomes([]))
      .finally(() => setLoadingOutcomes(false));
  }, [form.child_id, form.subject_id]);

  function getOutcomeLabel(o) {
    const code = o[stateCodeKey] || o.acara_code || '';
    return code ? `${code} — ${o.description}` : o.description;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    let finalForm = { ...form, week_start: weekStart };

    // If quick resource was filled in, save it first
    if (quickUrl && quickTitle) {
      if (saveToResources) {
        // Save permanently to resources
        const res = await api.post('/resources', {
          title: quickTitle,
          type: 'link',
          url: quickUrl,
          child_id: form.child_id || null,
          subject_id: form.subject_id || null,
        });
        finalForm.resource_id = res.data.id;
        onResourceSaved?.();
      } else {
        // Save as a temporary resource just for this task — save to resources anyway but don't show in picker
        const res = await api.post('/resources', {
          title: quickTitle,
          type: 'link',
          url: quickUrl,
          child_id: form.child_id || null,
          subject_id: form.subject_id || null,
        });
        finalForm.resource_id = res.data.id;
      }
    }

    await onSubmit(finalForm);
    onClose();
  }

  return (
    <Modal onClose={onClose} maxWidth={580}>
      <div className="modal-header">
        <h2 className="modal-title">{isEdit ? 'Edit Task' : 'Add Task'}</h2>
        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Child selector — add only */}
        {!isEdit && (
          <div className="input-group">
            <label>Child</label>
            <select className="select" value={form.child_id}
              onChange={e => setForm({ ...form, child_id: e.target.value, subject_id: '', resource_id: '', curriculum_outcome_id: '' })}>
              {(Array.isArray(kids) ? kids : []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {/* Title */}
        <div className="input-group">
          <label>Task Title *</label>
          <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Reading — Chapter 5" required />
        </div>

        {/* Subject */}
        <div className="input-group">
          <label>Subject</label>
          <select className="select" value={form.subject_id || ''}
            onChange={e => setForm({ ...form, subject_id: e.target.value, resource_id: '', curriculum_outcome_id: '' })}>
            <option value="">No subject</option>
            {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
        </div>

        {/* Learning Outcome */}
        <div className="input-group">
          <label>
            Learning Outcome
            <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 6, fontSize: 12 }}>
              ({(user?.state || 'NSW')} · optional)
            </span>
          </label>
          {!form.subject_id ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}>
              Select a subject first
            </div>
          ) : loadingOutcomes ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 14px' }}>Loading outcomes...</div>
          ) : outcomes.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}>
              No outcomes for this subject yet
            </div>
          ) : (
            <select className="select" value={form.curriculum_outcome_id || ''}
              onChange={e => setForm({ ...form, curriculum_outcome_id: e.target.value })}>
              <option value="">No outcome</option>
              {outcomes.map(o => <option key={o.id} value={o.id}>{getOutcomeLabel(o)}</option>)}
            </select>
          )}
        </div>

        {/* Day + Duration on same row */}
        <div className="grid-2">
          <div className="input-group">
            <label>Day</label>
            <select className="select" value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })}>
              {DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Duration (minutes)</label>
            <input className="input" type="number" min={5} max={480} value={form.duration_minutes}
              onChange={e => setForm({ ...form, duration_minutes: +e.target.value })} />
          </div>
        </div>

        {/* Resource — existing or quick add */}
        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Resource <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></span>
            <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => setShowQuickResource(v => !v)}>
              <Link size={11} /> {showQuickResource ? 'Use existing' : 'Add a link'}
            </button>
          </label>
          {showQuickResource ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}>
              <input className="input" placeholder="Link title e.g. Khan Academy" value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)} />
              <input className="input" placeholder="https://..." value={quickUrl}
                onChange={e => setQuickUrl(e.target.value)} type="url" />
              <label className="checkbox-wrap" style={{ fontSize: 13 }}>
                <input type="checkbox" checked={saveToResources} onChange={e => setSaveToResources(e.target.checked)} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookmarkPlus size={13} color="var(--primary)" /> Save to Resources library
                </span>
              </label>
            </div>
          ) : (
            <select className="select" value={form.resource_id || ''} onChange={e => setForm({ ...form, resource_id: e.target.value })}>
              <option value="">No resource</option>
              {availableResources.map(r => (
                <option key={r.id} value={r.id}>
                  {r.type === 'link' ? '🔗' : r.type === 'pdf' ? '📄' : r.type === 'book' ? '📚' : '📝'} {r.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Recurring + completed */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="checkbox-wrap">
            <input type="checkbox" checked={!!form.is_recurring} onChange={e => setForm({ ...form, is_recurring: e.target.checked })} />
            <span style={{ fontSize: 14 }}>Recurring weekly</span>
          </label>
          {isEdit && (
            <label className="checkbox-wrap">
              <input type="checkbox" checked={!!form.is_completed} onChange={e => setForm({ ...form, is_completed: e.target.checked })} />
              <span style={{ fontSize: 14 }}>Mark completed</span>
            </label>
          )}
        </div>

        {/* Notes */}
        <div className="input-group">
          <label>Notes</label>
          <textarea className="textarea" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Optional notes or paste a URL..." rows={2} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{isEdit ? 'Save Changes' : 'Add Task'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ── Print Preview ─────────────────────────────────────────────
function PrintPreview({ tasks, kids, weekStart, onClose }) {
  const weekLabel = formatWeekRange(weekStart);
  const [excluded, setExcluded] = useState(new Set());
  const [selectedChildren, setSelectedChildren] = useState(new Set(kids.map(c => c.id)));

  function toggleTask(id) { setExcluded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleChild(id) { setSelectedChildren(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function doPrint() {
    const pw = window.open('', '_blank', 'width=1200,height=800');
    const printKids = kids.filter(c => selectedChildren.has(c.id));
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Weekly Plan</title>
    <style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;font-size:10px}
    .s{margin-bottom:20px;page-break-after:always}.s:last-child{page-break-after:auto}
    .h{display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-bottom:8px}
    .av{width:34px;height:34px;border-radius:50%;color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px}
    .g{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
    .dh{padding:4px 6px;border-radius:4px 4px 0 0;font-weight:700;font-size:10px;color:white}
    .db{border:1px solid #e2ddd8;border-top:none;border-radius:0 0 4px 4px;min-height:90px;padding:4px}
    .t{padding:3px 5px;margin-bottom:3px;border-radius:3px;border-left:3px solid;font-size:9px}
    .nt{color:#ccc;font-size:9px;padding:8px 2px;text-align:center}</style></head><body>`;
    for (const child of printKids) {
      const ct = tasks.filter(t => t.child_id === child.id && !excluded.has(t.id));
      html += `<div class="s"><div class="h" style="border-bottom:3px solid ${child.avatar_color};padding-bottom:8px">
        <div class="av" style="background:${child.avatar_color}">${child.name[0]}</div>
        <div><div style="font-weight:700;font-size:18px">${child.name}</div><div style="font-size:11px;color:#888">Week of ${weekLabel}</div></div>
      </div><div class="g">`;
      for (const day of DAYS) {
        const dt = ct.filter(t => t.day_of_week === day);
        const mins = dt.reduce((s, t) => s + (t.duration_minutes || 0), 0);
        const wknd = day === 'Saturday' || day === 'Sunday';
        html += `<div><div class="dh" style="background:${wknd ? '#9b9890' : child.avatar_color}">${day.slice(0,3)}${mins > 0 ? `<br><span style="font-weight:400;font-size:8px">${mins}min</span>` : ''}</div><div class="db">`;
        if (!dt.length) html += `<div class="nt">—</div>`;
        else for (const t of dt) html += `<div class="t" style="background:${t.subject_color || child.avatar_color}15;border-left-color:${t.subject_color || child.avatar_color}"><div style="font-weight:600">${t.title}</div>${t.subject_name ? `<div style="color:#888;font-size:8px">${t.subject_icon || ''} ${t.subject_name}</div>` : ''}</div>`;
        html += `</div></div>`;
      }
      html += `</div></div>`;
    }
    html += `</body></html>`;
    pw.document.write(html); pw.document.close(); pw.focus(); setTimeout(() => pw.print(), 500);
  }

  return (
    <Modal onClose={onClose} maxWidth={820}>
      <div className="modal-header" style={{ flexShrink: 0 }}>
        <h2 className="modal-title">Print Preview</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={doPrint}><Printer size={15} /> Print</button>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {kids.map(c => (
          <button key={c.id} onClick={() => toggleChild(c.id)}
            style={{ padding: '5px 14px', borderRadius: 20, border: `2px solid ${c.avatar_color}`, background: selectedChildren.has(c.id) ? c.avatar_color : 'transparent', color: selectedChildren.has(c.id) ? 'white' : c.avatar_color, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            {c.name}
          </button>
        ))}
      </div>
      <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
        {kids.filter(c => selectedChildren.has(c.id)).map(child => {
          const ct = tasks.filter(t => t.child_id === child.id);
          return (
            <div key={child.id} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: `3px solid ${child.avatar_color}` }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: child.avatar_color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{child.name[0]}</div>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{child.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{weekLabel}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
                {DAYS.map(day => {
                  const dt = ct.filter(t => t.day_of_week === day);
                  const wknd = day === 'Saturday' || day === 'Sunday';
                  return (
                    <div key={day}>
                      <div style={{ background: wknd ? 'var(--text-3)' : child.avatar_color, color: 'white', padding: '4px 6px', borderRadius: '4px 4px 0 0', fontWeight: 700, fontSize: 10 }}>{day.slice(0,3)}</div>
                      <div style={{ border: `1px solid ${child.avatar_color}40`, borderTop: 'none', borderRadius: '0 0 4px 4px', minHeight: 70, padding: 4 }}>
                        {!dt.length ? <div style={{ color: 'var(--text-3)', fontSize: 10, textAlign: 'center', padding: '8px 0' }}>—</div>
                          : dt.map(task => (
                            <div key={task.id} onClick={() => toggleTask(task.id)} title="Click to exclude"
                              style={{ padding: '3px 5px', marginBottom: 3, borderRadius: 3, cursor: 'pointer', borderLeft: `3px solid ${task.subject_color || child.avatar_color}`, background: excluded.has(task.id) ? '#f0f0f0' : `${task.subject_color || child.avatar_color}15`, opacity: excluded.has(task.id) ? 0.4 : 1, fontSize: 10 }}>
                              <div style={{ fontWeight: 600, textDecoration: excluded.has(task.id) ? 'line-through' : 'none' }}>{task.title}</div>
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
      <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)' }}>
        💡 Click any task to exclude from print. Toggle children above.
      </div>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function WeeklyPlanner() {
  const { preferences } = useAuth();
  const schoolName = preferences?.school_name || '';
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
  const [error, setError] = useState(null);

  // Drag and drop state
  const [dragTask, setDragTask] = useState(null);      // task being dragged
  const [dragOver, setDragOver] = useState(null);       // {day, index} drop target
  const dragNode = useRef(null);

  useEffect(() => { loadAll(); }, [weekStart, selectedChild]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [childRes, resourceRes] = await Promise.all([
        api.get('/children'),
        api.get('/resources'),
      ]);
      const kids = childRes.data || [];
      setChildren(Array.isArray(kids) ? kids : []);
      setResources(Array.isArray(resourceRes.data) ? resourceRes.data : []);
      if (kids.length > 0) {
        const subjectArrays = await Promise.all(kids.map(k => api.get(`/children/${k.id}/subjects`).catch(() => ({ data: [] }))));
        setSubjects(subjectArrays.flatMap(r => Array.isArray(r.data) ? r.data : []));
      }
      const params = new URLSearchParams({ week_start: weekStart });
      if (selectedChild !== 'all') params.set('child_id', selectedChild);
      const tasksRes = await api.get(`/tasks?${params}`);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
    } catch (err) {
      console.error('WeeklyPlanner error:', err);
      setError('Could not load planner data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }

  // ── Drag and drop handlers ──────────────────────────────────

  function handleDragStart(task, e) {
    setDragTask(task);
    dragNode.current = e.currentTarget;
    dragNode.current.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd(e) {
    if (dragNode.current) dragNode.current.style.opacity = '1';
    setDragTask(null);
    setDragOver(null);
    dragNode.current = null;
  }

  function handleDragOver(day, index, e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver({ day, index });
  }

  function handleDragLeave() {
    setDragOver(null);
  }

  async function handleDrop(targetDay, targetIndex, e) {
    e.preventDefault();
    if (!dragTask) return;
    setDragOver(null);

    // Build new ordered task list for the target day
    const dayTasks = tasks
      .filter(t => t.day_of_week === targetDay)
      .filter(t => t.id !== dragTask.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    // Insert dragged task at target position
    dayTasks.splice(targetIndex, 0, { ...dragTask, day_of_week: targetDay });

    // Build update payload
    const updates = dayTasks.map((t, i) => ({
      id: t.id,
      day_of_week: targetDay,
      sort_order: i,
    }));

    // Also update the source day if task moved between days
    if (dragTask.day_of_week !== targetDay) {
      const sourceDayTasks = tasks
        .filter(t => t.day_of_week === dragTask.day_of_week && t.id !== dragTask.id)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      sourceDayTasks.forEach((t, i) => updates.push({ id: t.id, day_of_week: t.day_of_week, sort_order: i }));
    }

    // Optimistic update — reorder locally immediately
    setTasks(prev => {
      const others = prev.filter(t => t.id !== dragTask.id && t.day_of_week !== targetDay && (dragTask.day_of_week === targetDay || t.day_of_week !== dragTask.day_of_week));
      const newDayTasks = dayTasks.map((t, i) => ({ ...t, day_of_week: targetDay, sort_order: i }));
      let result = [...newDayTasks];
      if (dragTask.day_of_week !== targetDay) {
        const srcUpdated = tasks
          .filter(t => t.day_of_week === dragTask.day_of_week && t.id !== dragTask.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((t, i) => ({ ...t, sort_order: i }));
        result = [...result, ...srcUpdated, ...prev.filter(t =>
          t.day_of_week !== targetDay && t.day_of_week !== dragTask.day_of_week
        )];
      } else {
        result = [...result, ...prev.filter(t => t.day_of_week !== targetDay)];
      }
      return result;
    });

    // Persist to server
    try {
      await api.patch('/tasks/reorder', { updates });
    } catch (err) {
      console.error('Reorder failed:', err);
      loadAll(); // Reload on error
    }
  }

  async function toggleTask(task) { await api.patch(`/tasks/${task.id}/complete`); loadAll(); }
  async function deleteTask(id) { if (!confirm('Delete this task?')) return; await api.delete(`/tasks/${id}`); loadAll(); }
  async function handleAddTask(form) { await api.post('/tasks', form); loadAll(); }
  async function handleEditTask(form) { await api.put(`/tasks/${form.id}`, form); loadAll(); }
  async function copyRecurring() {
    await api.post('/tasks/copy-recurring', { from_week: prevWeek(weekStart), to_week: weekStart });
    loadAll();
  }

  const days = getWeekDays(weekStart);

  // Default child: if a specific child is selected in the filter, use that; else first child
  const defaultChildId = selectedChild !== 'all' ? selectedChild : (children[0]?.id || '');

  const addInitial = {
    child_id: defaultChildId,
    subject_id: '', resource_id: '', curriculum_outcome_id: '',
    title: '', description: '',
    day_of_week: addDay || 'Monday',
    duration_minutes: 60, is_recurring: false,
  };

  if (error) {
    return (
      <div className="animate-fade">
        <div className="page-header">
          <h1 className="page-title">Weekly Planner</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--danger)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{error}</div>
          <button className="btn btn-primary" onClick={loadAll}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <div className="page-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          {schoolName && <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>{schoolName}</div>}
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
          {(Array.isArray(children) ? children : []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Desktop — 7 col grid */}
      <div className="planner-desktop" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 10 }}>
        {days.map(day => {
          const dt = tasks
            .filter(t => t.day_of_week === day.name)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
          const done = dt.filter(t => t.is_completed).length;
          const wknd = day.name === 'Saturday' || day.name === 'Sunday';
          return (
            <div key={day.name} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <div style={{ padding: '10px 12px', background: wknd ? 'var(--surface-2)' : 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderBottom: `3px solid ${wknd ? 'var(--border)' : 'var(--primary)'}` }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{day.short}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{day.date}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{done}/{dt.length}</div>
              </div>
              {/* Add button at TOP */}
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                onClick={() => { setAddDay(day.name); setShowModal(true); }}>
                <Plus size={12} /> Add
              </button>
              {/* Drop zone — entire column is droppable */}
              <div
                style={{
                  flex: 1, minWidth: 0,
                  borderRadius: 'var(--radius-sm)',
                  border: dragOver?.day === day.name ? '2px dashed var(--primary)' : '2px dashed transparent',
                  padding: 2,
                  transition: 'border-color 0.15s',
                  background: dragOver?.day === day.name ? 'var(--primary-pale)' : 'transparent',
                }}
                onDragOver={e => handleDragOver(day.name, dt.length, e)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(day.name, dt.length, e)}
              >
                {loading
                  ? <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
                  : dt.length === 0
                    ? <div style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>No tasks</div>
                    : dt.map((task, idx) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={e => handleDragStart(task, e)}
                          onDragEnd={handleDragEnd}
                          onDragOver={e => { e.stopPropagation(); handleDragOver(day.name, idx, e); }}
                          onDrop={e => { e.stopPropagation(); handleDrop(day.name, idx, e); }}
                          style={{
                            cursor: 'grab',
                            borderRadius: 'var(--radius-sm)',
                            outline: dragOver?.day === day.name && dragOver?.index === idx
                              ? '2px solid var(--primary)' : 'none',
                            marginBottom: 4,
                          }}
                        >
                          <TaskCard task={task} onToggle={toggleTask} onDelete={deleteTask} onEdit={t => setEditTask(t)} />
                        </div>
                      ))
                }
              </div>
            </div>
          );
        })}
      </div>


            {showModal && <TaskForm initial={addInitial} kids={children} subjects={subjects} resources={resources} weekStart={weekStart} onSubmit={handleAddTask} onClose={() => { setShowModal(false); setAddDay(null); }} isEdit={false} onResourceSaved={loadAll} />}
      {editTask && <TaskForm initial={{ ...editTask, is_recurring: editTask.is_recurring === 1 }} kids={children} subjects={subjects} resources={resources} weekStart={weekStart} onSubmit={handleEditTask} onClose={() => setEditTask(null)} isEdit={true} onResourceSaved={loadAll} />}
      {showPrint && <PrintPreview tasks={tasks} kids={children} weekStart={weekStart} onClose={() => setShowPrint(false)} />}
    </div>
  );
}
