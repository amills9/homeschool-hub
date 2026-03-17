import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Upload, Download, RefreshCw, Save, Trash2, Plus, X, Check, AlertCircle } from 'lucide-react';

const STATES = ['nsw','vic','qld','sa','wa','tas','act','nt'];
const STATE_LABELS = { nsw:'NSW', vic:'VIC', qld:'QLD', sa:'SA', wa:'WA', tas:'TAS', act:'ACT', nt:'NT' };

const STAGE_ORDER = ['Foundation','Early Stage 1','Stage 1','Stage 2','Stage 3','Stage 4','Stage 5','Stage 6'];

function stageSort(a, b) {
  return (STAGE_ORDER.indexOf(a) ?? 99) - (STAGE_ORDER.indexOf(b) ?? 99);
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
  return lines.slice(1).map(line => {
    // Handle quoted fields
    const fields = [];
    let inQuote = false, current = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && !inQuote) { inQuote = true; }
      else if (ch === '"' && inQuote) {
        if (line[i+1] === '"') { current += '"'; i++; }
        else inQuote = false;
      } else if (ch === ',' && !inQuote) { fields.push(current); current = ''; }
      else current += ch;
    }
    fields.push(current);
    const obj = {};
    headers.forEach((h, i) => obj[h] = (fields[i] || '').trim());
    return obj;
  });
}

export default function CurriculumAdmin() {
  const [outcomes, setOutcomes] = useState([]);
  const [meta, setMeta] = useState({ subjects: [], stages: [] });
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const fileRef = useRef();

  useEffect(() => { loadAll(); }, [filterSubject, filterStage]);

  async function loadAll() {
    const [outRes, metaRes] = await Promise.all([
      api.get('/curriculum', { params: { subject: filterSubject || undefined, stage: filterStage || undefined } }),
      api.get('/curriculum/meta'),
    ]);
    setOutcomes(outRes.data);
    setTotalCount(outRes.data.length);
    setMeta(metaRes.data);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function startEdit(outcome) {
    setEditingId(outcome.id);
    setEditForm({ ...outcome });
  }

  async function saveEdit() {
    await api.put(`/curriculum/${editingId}`, editForm);
    setEditingId(null);
    loadAll();
    showToast('Saved ✓');
  }

  async function deleteOutcome(id) {
    if (!confirm('Delete this outcome?')) return;
    await api.delete(`/curriculum/${id}`);
    loadAll();
    showToast('Deleted');
  }

  async function syncACARA() {
    setSyncing(true);
    try {
      await api.post('/curriculum/sync-acara');
      showToast('ACARA sync started — refreshing in 30s...');
      setTimeout(() => { loadAll(); setSyncing(false); }, 30000);
    } catch (e) {
      showToast('Sync failed: ' + e.message);
      setSyncing(false);
    }
  }

  async function exportCSV() {
    const res = await api.get('/curriculum/export', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'curriculum_outcomes.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exported ✓');
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) { showToast('No valid rows found in CSV'); return; }
      const res = await api.post('/curriculum/import', { rows });
      showToast(`Imported ${res.data.imported} outcomes ✓`);
      loadAll();
    } catch (err) {
      showToast('Import failed: ' + err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  const sortedStages = [...meta.stages].sort(stageSort);

  return (
    <div className="animate-fade">
      {toast && (
        <div className="toast" style={{ background: toast.includes('failed') ? 'var(--danger)' : 'var(--text)' }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Curriculum Outcomes</h1>
          <p className="page-subtitle">{totalCount} outcomes loaded</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={syncACARA} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? 'spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync ACARA'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => fileRef.current.click()} disabled={importing}>
            <Upload size={14} /> {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      {/* CSV format hint */}
      <div className="card" style={{ marginBottom: 20, background: 'var(--surface-2)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
            <strong>CSV columns:</strong> acara_code, subject, stage, year_levels, description, nsw_code, vic_code, qld_code, sa_code, wa_code, tas_code, act_code, nt_code
            <br />State code columns are optional — leave blank and the ACARA code will be used as fallback.
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="select" style={{ width: 200 }} value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {meta.subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select" style={{ width: 200 }} value={filterStage} onChange={e => setFilterStage(e.target.value)}>
          <option value="">All Stages</option>
          {sortedStages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterSubject || filterStage) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterSubject(''); setFilterStage(''); }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {outcomes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>No outcomes loaded</h3>
          <p>Import a CSV or click Sync ACARA to get started</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                <th style={th}>ACARA Code</th>
                <th style={th}>Subject</th>
                <th style={th}>Stage</th>
                <th style={th}>Years</th>
                <th style={{ ...th, minWidth: 260 }}>Description</th>
                {STATES.map(s => <th key={s} style={{ ...th, minWidth: 80 }}>{STATE_LABELS[s]}</th>)}
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map(outcome => {
                const isEditing = editingId === outcome.id;
                const form = isEditing ? editForm : outcome;
                return (
                  <tr key={outcome.id} style={{ borderBottom: '1px solid var(--border)', background: isEditing ? 'var(--primary-pale)' : 'var(--surface)' }}>
                    <td style={td}>
                      {isEditing
                        ? <input className="input" style={{ padding: '4px 8px', fontSize: 12, minWidth: 100 }} value={form.acara_code} onChange={e => setEditForm({...editForm, acara_code: e.target.value})} />
                        : <code style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{outcome.acara_code}</code>
                      }
                    </td>
                    <td style={td}>
                      {isEditing
                        ? <input className="input" style={{ padding: '4px 8px', fontSize: 12, minWidth: 90 }} value={form.subject} onChange={e => setEditForm({...editForm, subject: e.target.value})} />
                        : outcome.subject
                      }
                    </td>
                    <td style={td}>
                      {isEditing
                        ? <input className="input" style={{ padding: '4px 8px', fontSize: 12, minWidth: 80 }} value={form.stage} onChange={e => setEditForm({...editForm, stage: e.target.value})} />
                        : <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{outcome.stage}</span>
                      }
                    </td>
                    <td style={td}>
                      {isEditing
                        ? <input className="input" style={{ padding: '4px 8px', fontSize: 12, minWidth: 50 }} value={form.year_levels} onChange={e => setEditForm({...editForm, year_levels: e.target.value})} />
                        : <span className="badge" style={{ background: 'var(--primary-pale)', color: 'var(--primary)', fontSize: 11 }}>Yr {outcome.year_levels}</span>
                      }
                    </td>
                    <td style={{ ...td, maxWidth: 300 }}>
                      {isEditing
                        ? <textarea className="textarea" style={{ padding: '4px 8px', fontSize: 12, minWidth: 240, minHeight: 60 }} value={form.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                        : <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{outcome.description}</span>
                      }
                    </td>
                    {STATES.map(s => (
                      <td key={s} style={td}>
                        {isEditing
                          ? <input className="input" style={{ padding: '4px 6px', fontSize: 12, minWidth: 70 }} value={form[`${s}_code`] || ''} onChange={e => setEditForm({...editForm, [`${s}_code`]: e.target.value})} placeholder="—" />
                          : <span style={{ fontSize: 12, color: outcome[`${s}_code`] ? 'var(--text)' : 'var(--text-3)' }}>{outcome[`${s}_code`] || '—'}</span>
                        }
                      </td>
                    ))}
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-primary btn-sm" onClick={saveEdit} style={{ padding: '4px 10px' }}><Check size={13} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)} style={{ padding: '4px 10px' }}><X size={13} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(outcome)} style={{ padding: '4px 8px', fontSize: 11 }}>Edit</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => deleteOutcome(outcome.id)} style={{ padding: '4px 8px', color: 'var(--danger)' }}><Trash2 size={12} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' };
const td = { padding: '8px 12px', verticalAlign: 'top' };
