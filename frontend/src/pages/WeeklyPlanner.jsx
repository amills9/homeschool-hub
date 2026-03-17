import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { getWeekStart, getWeekDays, nextWeek, prevWeek, formatWeekRange } from '../utils/dates';
import {
  ChevronLeft, ChevronRight, Plus, Check, Trash2, Clock, RotateCcw,
  X, Link, Pencil, Printer, ExternalLink, Camera, Share2, Facebook,
  Instagram, Copy, ZoomIn,
} from 'lucide-react';

// ── Photo Upload Modal ────────────────────────────────────────
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
      setError(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2 className="modal-title">Add Photo</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Task: <strong>{task.title}</strong></div>

          {/* Image picker */}
          {preview ? (
            <div style={{ position: 'relative' }}>
              <img src={preview} alt="Preview" style={{ width: '100%', borderRadius: 'var(--radius-sm)', maxHeight: 280, objectFit: 'cover' }} />
              <button onClick={() => { setPreview(null); setBase64(null); }}
                style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div onClick={() => fileRef.current.click()}
              style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', padding: '32px 16px', textAlign: 'center', cursor: 'pointer', background: 'var(--surface-2)', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <Camera size={32} color="var(--text-3)" style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Tap to add photo</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>JPG, PNG or HEIC · max 8MB</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />

          {/* Caption */}
          <div className="input-group">
            <label>Caption <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
            <textarea className="textarea" rows={2} value={caption} onChange={e => setCaption(e.target.value)} placeholder="What did we learn today?" />
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleUpload} disabled={!base64 || uploading}>
              {uploading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Uploading...</> : <><Camera size={14} /> Upload Photo</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fullscreen Photo Viewer ───────────────────────────────────
function PhotoViewer({ photo, task, onClose, onDelete }) {
  const [copied, setCopied] = useState(false);
  const shareText = photo.caption
    ? `${photo.caption} — shared from Homeschool HUB`
    : `${task.title} — shared from Homeschool HUB`;
  const shareUrl = photo.url;

  function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=400');
  }

  function shareInstagram() {
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Caption copied! Open Instagram and paste when creating your post.');
    });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm('Delete this photo?')) return;
    await api.delete(`/photos/${photo.id}`);
    onDelete(photo.id);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}
      style={{ alignItems: 'center', background: 'rgba(0,0,0,0.85)' }}>
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Close */}
        <button onClick={onClose}
          style={{ position: 'absolute', top: -44, right: 0, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} />
        </button>

        {/* Image */}
        <img src={photo.url} alt={photo.caption || task.title}
          style={{ maxWidth: '85vw', maxHeight: '65vh', borderRadius: 12, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />

        {/* Caption */}
        {photo.caption && (
          <div style={{ color: 'white', fontSize: 15, textAlign: 'center', maxWidth: 500, fontWeight: 500 }}>
            {photo.caption}
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={shareFacebook}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1877F2', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <Facebook size={16} /> Share on Facebook
          </button>
          <button onClick={shareInstagram}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <Instagram size={16} /> Copy for Instagram
          </button>
          <button onClick={copyLink}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <Copy size={16} /> {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button onClick={handleDelete}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgba(231,111,81,0.3)', color: '#ff9988', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            <Trash2 size={16} /> Delete
          </button>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
          Instagram: tap "Copy for Instagram", then open Instagram app and paste the caption
        </div>
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────
function TaskCard({ task, onToggle, onDelete, onEdit, onPhotoAdded }) {
  const [photos, setPhotos] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  useEffect(() => { loadPhotos(); }, [task.id]);

  async function loadPhotos() {
    setLoadingPhotos(true);
    try {
      const res = await api.get(`/photos?task_id=${task.id}`);
      setPhotos(res.data);
    } catch (e) { /* silent */ } finally { setLoadingPhotos(false); }
  }

  function handlePhotoUploaded(photo) {
    setPhotos(prev => [...prev, photo]);
    if (onPhotoAdded) onPhotoAdded();
  }

  function handlePhotoDeleted(photoId) {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  }

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 'var(--radius-sm)',
      background: task.is_completed ? 'var(--surface-2)' : 'var(--surface)',
      border: `1.5px solid ${(task.subject_color || '#E2DDD8')}40`,
      borderLeft: `4px solid ${task.subject_color || 'var(--border)'}`,
      marginBottom: 8, transition: 'all 0.2s', opacity: task.is_completed ? 0.85 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Complete toggle */}
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
              task.resource_url
                ? <a href={task.resource_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--primary)', textDecoration: 'none' }} onClick={e => e.stopPropagation()}><ExternalLink size={10} />{task.resource_title}</a>
                : <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text-3)' }}><Link size={10} />{task.resource_title}</span>
            )}
          </div>
          {task.description && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{task.description}</div>}

          {/* Photo thumbnails */}
          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {photos.map(photo => (
                <div key={photo.id} onClick={() => setViewPhoto(photo)}
                  style={{ position: 'relative', cursor: 'pointer', borderRadius: 6, overflow: 'hidden', width: 52, height: 52, flexShrink: 0 }}>
                  <img src={photo.thumbnail_url || photo.url} alt={photo.caption || ''}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}>
                    <ZoomIn size={14} color="white" style={{ opacity: 0.8 }} />
                  </div>
                </div>
              ))}
              <div onClick={() => setShowUpload(true)}
                style={{ width: 52, height: 52, borderRadius: 6, border: '1.5px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--surface-2)', flexShrink: 0 }}>
                <Plus size={16} color="var(--text-3)" />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(task)} style={{ color: 'var(--text-3)', padding: 4 }} title="Edit"><Pencil size={12} /></button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowUpload(true)} style={{ color: 'var(--text-3)', padding: 4 }} title="Add photo"><Camera size={12} /></button>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onDelete(task.id)} style={{ color: 'var(--text-3)', padding: 4 }} title="Delete"><Trash2 size={12} /></button>
        </div>
      </div>

      {showUpload && <PhotoUploadModal task={task} onClose={() => setShowUpload(false)} onUploaded={handlePhotoUploaded} />}
      {viewPhoto && <PhotoViewer photo={viewPhoto} task={task} onClose={() => setViewPhoto(null)} onDelete={handlePhotoDeleted} />}
    </div>
  );
}

// ── Task Form ─────────────────────────────────────────────────
function TaskForm({ initial, children, subjects, resources, weekStart, onSubmit, onClose, isEdit }) {
  const [form, setForm] = useState(initial);
  const availableSubjects = subjects.filter(s => s.child_id === form.child_id);
  const availableResources = resources.filter(r => {
    if (r.child_id && r.child_id !== form.child_id) return false;
    if (form.subject_id && r.subject_id && r.subject_id !== form.subject_id) return false;
    return true;
  });
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  async function handleSubmit(e) {
    e.preventDefault();
    await onSubmit({ ...form, week_start: weekStart });
    onClose();
  }

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
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label>Duration (minutes)</label>
              <input className="input" type="number" min={5} max={480} value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: +e.target.value })} />
            </div>
            <div className="input-group">
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
              <label className="checkbox-wrap">
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

// ── Print Preview ─────────────────────────────────────────────
function PrintPreview({ tasks, children, weekStart, onClose }) {
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const weekLabel = formatWeekRange(weekStart);
  const [excluded, setExcluded] = useState(new Set());
  const [selectedChildren, setSelectedChildren] = useState(new Set(children.map(c => c.id)));

  function toggleTask(id) { setExcluded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleChild(id) { setSelectedChildren(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  function doPrint() {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    const printKids = children.filter(c => selectedChildren.has(c.id));
    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Weekly Plan — ${weekLabel}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: Arial, sans-serif; font-size: 10px; background: white; color: #1a1a18; }
      .section { margin-bottom: 20px; page-break-after: always; }
      .section:last-child { page-break-after: auto; }
      .header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; padding-bottom: 8px; }
      .avatar { width: 34px; height: 34px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; }
      .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
      .day-head { padding: 4px 6px; border-radius: 4px 4px 0 0; font-weight: 700; font-size: 10px; color: white; }
      .day-body { border: 1px solid #e2ddd8; border-top: none; border-radius: 0 0 4px 4px; min-height: 90px; padding: 4px; }
      .task { padding: 3px 5px; margin-bottom: 3px; border-radius: 3px; border-left: 3px solid; font-size: 9px; }
      .task-title { font-weight: 600; }
      .task-meta { color: #888; font-size: 8px; margin-top: 1px; }
      .no-tasks { color: #ccc; font-size: 9px; padding: 8px 2px; text-align: center; }
    </style></head><body>`;

    for (const child of printKids) {
      const childTasks = tasks.filter(t => t.child_id === child.id && !excluded.has(t.id));
      html += `<div class="section">
        <div class="header" style="border-bottom: 3px solid ${child.avatar_color}; margin-bottom: 10px; padding-bottom: 8px;">
          <div class="avatar" style="background:${child.avatar_color}">${child.name[0]}</div>
          <div><div style="font-weight:700;font-size:18px">${child.name}</div><div style="font-size:11px;color:#888">Week of ${weekLabel}</div></div>
        </div>
        <div class="grid">`;

      for (const day of DAYS) {
        const dt = childTasks.filter(t => t.day_of_week === day);
        const mins = dt.reduce((s,t) => s + (t.duration_minutes||0), 0);
        const wknd = day === 'Saturday' || day === 'Sunday';
        html += `<div><div class="day-head" style="background:${wknd ? '#9b9890' : child.avatar_color}">${day.slice(0,3)}${mins > 0 ? `<br><span style="font-weight:400;font-size:8px">${mins}min</span>` : ''}</div>
          <div class="day-body">`;
        if (dt.length === 0) html += `<div class="no-tasks">—</div>`;
        else for (const t of dt) html += `<div class="task" style="background:${t.subject_color||child.avatar_color}15;border-left-color:${t.subject_color||child.avatar_color}"><div class="task-title">${t.title}</div>${t.subject_name ? `<div class="task-meta">${t.subject_icon||''} ${t.subject_name}</div>` : ''}${t.duration_minutes > 0 ? `<div class="task-meta">⏱ ${t.duration_minutes}min</div>` : ''}</div>`;
        html += `</div></div>`;
      }
      html += `</div></div>`;
    }
    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 820, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2 className="modal-title">Print Preview</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={doPrint}><Printer size={15} /> Print</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        <div style={{ padding: '0 0 16px', flexShrink: 0, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {children.map(c => (
            <button key={c.id} onClick={() => toggleChild(c.id)}
              style={{ padding: '5px 14px', borderRadius: 20, border: `2px solid ${c.avatar_color}`, background: selectedChildren.has(c.id) ? c.avatar_color : 'transparent', color: selectedChildren.has(c.id) ? 'white' : c.avatar_color, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s' }}>
              {c.name}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children.filter(c => selectedChildren.has(c.id)).map(child => {
            const childTasks = tasks.filter(t => t.child_id === child.id);
            return (
              <div key={child.id} style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: `3px solid ${child.avatar_color}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: child.avatar_color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{child.name[0]}</div>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{child.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{weekLabel}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                  {DAYS.map(day => {
                    const dt = childTasks.filter(t => t.day_of_week === day);
                    const wknd = day === 'Saturday' || day === 'Sunday';
                    return (
                      <div key={day}>
                        <div style={{ background: wknd ? 'var(--text-3)' : child.avatar_color, color: 'white', padding: '4px 6px', borderRadius: '4px 4px 0 0', fontWeight: 700, fontSize: 10 }}>{day.slice(0,3)}</div>
                        <div style={{ border: `1px solid ${child.avatar_color}40`, borderTop: 'none', borderRadius: '0 0 4px 4px', minHeight: 70, padding: 4 }}>
                          {dt.length === 0 ? <div style={{ color: 'var(--text-3)', fontSize: 10, textAlign: 'center', padding: '8px 0' }}>—</div>
                            : dt.map(task => (
                              <div key={task.id} onClick={() => toggleTask(task.id)}
                                style={{ padding: '3px 5px', marginBottom: 3, borderRadius: 3, cursor: 'pointer', borderLeft: `3px solid ${task.subject_color||child.avatar_color}`, background: excluded.has(task.id) ? '#f0f0f0' : `${task.subject_color||child.avatar_color}15`, opacity: excluded.has(task.id) ? 0.4 : 1, fontSize: 10 }}
                                title="Click to exclude from print">
                                <div style={{ fontWeight: 600, textDecoration: excluded.has(task.id) ? 'line-through' : 'none' }}>{task.title}</div>
                                {task.subject_name && <div style={{ color: 'var(--text-3)', fontSize: 9 }}>{task.subject_icon} {task.subject_name}</div>}
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
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
          💡 Click any task to exclude it from the print. Toggle children using the buttons above.
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

  useEffect(() => {
    const allDays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const idx = new Date().getDay();
    setExpandedDay(allDays[idx === 0 ? 6 : idx - 1]);
  }, []);

  useEffect(() => { loadAll(); }, [weekStart, selectedChild]);

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
  const addInitial = { child_id: children[0]?.id || '', subject_id: '', resource_id: '', title: '', description: '', day_of_week: addDay || 'Monday', duration_minutes: 60, is_recurring: false };

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

      {/* Desktop */}
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
              <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }} onClick={() => { setAddDay(day.name); setShowModal(true); }}>
                <Plus size={12} /> Add
              </button>
            </div>
          );
        })}
      </div>

      {/* Mobile accordion */}
      <div className="planner-mobile" style={{ flexDirection: 'column', gap: 10 }}>
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
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', fontSize: 13, marginTop: 4 }} onClick={() => { setAddDay(day.name); setShowModal(true); }}>
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
      {showPrint && <PrintPreview tasks={tasks} children={children} weekStart={weekStart} onClose={() => setShowPrint(false)} />}
    </div>
  );
}
