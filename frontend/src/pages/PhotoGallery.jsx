import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, X, Facebook, Instagram, Copy, Trash2, ZoomIn } from 'lucide-react';

function PhotoViewer({ photo, onClose, onDelete }) {
  const [copied, setCopied] = useState(false);
  const shareText = `${photo.caption || photo.task_title} — shared from Homeschool HUB`;

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

  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 24, gap: 16 }}>
      <button onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 36, height: 36, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={18} />
      </button>

      <img src={photo.url} alt={photo.caption || photo.task_title}
        style={{ maxWidth: '85vw', maxHeight: '55vh', borderRadius: 12, objectFit: 'contain' }} />

      <div style={{ textAlign: 'center', maxWidth: 500 }}>
        {photo.caption && <div style={{ color: 'white', fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{photo.caption}</div>}
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
          {photo.child_name} · {photo.subject_icon} {photo.subject_name || 'General'} · {photo.task_title}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>{formatDate(photo.created_at)}</div>
      </div>

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
    </div>
  );
}

function PhotoCard({ photo, onClick }) {
  function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="card card-hover" style={{ padding: 0, overflow: 'hidden' }} onClick={() => onClick(photo)}>
      {/* Image */}
      <div style={{ position: 'relative', paddingBottom: '66%', background: 'var(--surface-2)' }}>
        <img
          src={photo.thumbnail_url || photo.url}
          alt={photo.caption || photo.task_title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.25)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}>
          <ZoomIn size={24} color="white" style={{ opacity: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          />
        </div>
        {/* Child avatar badge */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          width: 28, height: 28, borderRadius: '50%',
          background: photo.child_color || 'var(--primary)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}>
          {photo.child_name?.[0]}
        </div>
      </div>

      {/* Caption & metadata */}
      <div style={{ padding: '12px 14px' }}>
        {photo.caption ? (
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, lineHeight: 1.4 }}>{photo.caption}</div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 6, fontStyle: 'italic' }}>No caption</div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: photo.child_color || 'var(--primary)', fontWeight: 600 }}>{photo.child_name}</span>
          {photo.subject_name && <span>{photo.subject_icon} {photo.subject_name}</span>}
          <span style={{ marginLeft: 'auto' }}>{formatDate(photo.created_at)}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📋 {photo.task_title}
        </div>
      </div>
    </div>
  );
}

export default function PhotoGallery() {
  const [photos, setPhotos] = useState([]);
  const [children, setChildren] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewPhoto, setViewPhoto] = useState(null);

  // Filters
  const [filterChild, setFilterChild] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => { loadChildren(); }, []);
  useEffect(() => { loadPhotos(); }, [filterChild, filterSubject, dateFrom, dateTo, search]);

  async function loadChildren() {
    const res = await api.get('/children');
    const kids = Array.isArray(res.data) ? res.data : [];
    setChildren(kids);
    const subjectArrays = await Promise.all(kids.map(k => api.get(`/children/${k.id}/subjects`).catch(() => ({ data: [] }))));
    setSubjects(subjectArrays.flatMap(r => Array.isArray(r.data) ? r.data : []));
  }

  async function loadPhotos() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterChild) params.set('child_id', filterChild);
      if (filterSubject) params.set('subject_id', filterSubject);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (search) params.set('search', search);
      const res = await api.get(`/photos/gallery?${params}`);
      setPhotos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Gallery load error:', err);
      setPhotos([]);
    } finally { setLoading(false); }
  }

  function handleDeletePhoto(id) {
    setPhotos(prev => prev.filter(p => p.id !== id));
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput);
  }

  function clearFilters() {
    setFilterChild('');
    setFilterSubject('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setSearchInput('');
  }

  const hasFilters = filterChild || filterSubject || dateFrom || dateTo || search;
  const availableSubjects = filterChild
    ? subjects.filter(s => s.child_id === filterChild)
    : subjects;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Photo Gallery</h1>
          <p className="page-subtitle">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Search */}
          <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
            <label>Search</label>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
              <input className="input" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Search captions or tasks..." />
              <button type="submit" className="btn btn-primary btn-sm"><Search size={14} /></button>
            </form>
          </div>

          {/* Child filter */}
          <div className="input-group" style={{ minWidth: 150 }}>
            <label>Child</label>
            <select className="select" value={filterChild} onChange={e => { setFilterChild(e.target.value); setFilterSubject(''); }}>
              <option value="">All Children</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Subject filter */}
          <div className="input-group" style={{ minWidth: 150 }}>
            <label>Subject</label>
            <select className="select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
            </select>
          </div>

          {/* Date range */}
          <div className="input-group" style={{ minWidth: 140 }}>
            <label>From</label>
            <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="input-group" style={{ minWidth: 140 }}>
            <label>To</label>
            <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>

          {hasFilters && (
            <div style={{ paddingBottom: 2 }}>
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <X size={13} /> Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Gallery grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      ) : photos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📷</div>
          <h3>{hasFilters ? 'No photos match your filters' : 'No photos yet'}</h3>
          <p>{hasFilters ? 'Try adjusting your filters' : 'Add photos to tasks in the Weekly Planner'}</p>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters} style={{ marginTop: 12 }}>Clear filters</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {photos.map(photo => (
            <PhotoCard key={photo.id} photo={photo} onClick={setViewPhoto} />
          ))}
        </div>
      )}

      {viewPhoto && (
        <PhotoViewer
          photo={viewPhoto}
          onClose={() => setViewPhoto(null)}
          onDelete={handleDeletePhoto}
        />
      )}
    </div>
  );
}
