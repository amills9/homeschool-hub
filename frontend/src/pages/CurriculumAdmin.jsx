import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Upload, Download, X, Check, AlertCircle, Trash2, RefreshCw } from 'lucide-react';

const STATES = ['NSW','VIC','QLD','SA','WA','TAS','ACT','NT'];
const STATE_LABELS = {
  NSW:'New South Wales', VIC:'Victoria', QLD:'Queensland', SA:'South Australia',
  WA:'Western Australia', TAS:'Tasmania', ACT:'Australian Capital Territory', NT:'Northern Territory',
};
const STAGE_ORDER = ['Foundation','Early Stage 1','Stage 1','Stage 2','Stage 3','Stage 4','Stage 5','Stage 6'];
function stageSort(a, b) { return (STAGE_ORDER.indexOf(a) ?? 99) - (STAGE_ORDER.indexOf(b) ?? 99); }

// Robust CSV parser — handles quoted fields with commas, newlines, escaped quotes
function parseCSV(text) {
  // Normalise line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  const rows = [];
  let i = 0;

  function parseField() {
    if (text[i] === '"') {
      i++; // skip opening quote
      let val = '';
      while (i < text.length) {
        if (text[i] === '"' && text[i+1] === '"') { val += '"'; i += 2; }
        else if (text[i] === '"') { i++; break; } // closing quote
        else { val += text[i++]; }
      }
      return val;
    } else {
      let val = '';
      while (i < text.length && text[i] !== ',' && text[i] !== '\n') val += text[i++];
      return val;
    }
  }

  function parseLine() {
    const fields = [];
    while (i < text.length && text[i] !== '\n') {
      fields.push(parseField());
      if (text[i] === ',') i++; // skip comma
    }
    if (text[i] === '\n') i++; // skip newline
    return fields;
  }

  // Parse header
  const headers = parseLine().map(h => h.trim().toLowerCase());

  // Parse data rows
  while (i < text.length) {
    const fields = parseLine();
    if (fields.every(f => !f.trim())) continue; // skip blank lines
    const obj = {};
    headers.forEach((h, idx) => obj[h] = (fields[idx] || '').trim());
    rows.push(obj);
  }

  return rows;
}

export default function CurriculumAdmin() {
  const [outcomes, setOutcomes] = useState([]);
  const [meta, setMeta] = useState({ subjects: [], stages: [] });
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [viewState, setViewState] = useState('NSW');
  const [importState, setImportState] = useState('NSW');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef();

  useEffect(() => { loadAll(); }, [filterSubject, filterStage]);

  async function loadAll() {
    const [outRes, metaRes] = await Promise.all([
      api.get('/curriculum', { params: { subject: filterSubject||undefined, stage: filterStage||undefined } }),
      api.get('/curriculum/meta'),
    ]);
    setOutcomes(outRes.data);
    setMeta(metaRes.data);
  }

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 5000);
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

  async function exportCSV() {
    const res = await api.get('/curriculum/export', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'curriculum_outcomes.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Exported ✓');
  }

  async function clearStateData() {
    if (!confirm(`This will delete all ${importState} outcome data. Are you sure?`)) return;
    setClearing(true);
    try {
      await api.delete(`/curriculum/clear/${importState}`);
      showToast(`${importState} data cleared — ready for fresh import`);
      loadAll();
    } catch (err) {
      showToast('Clear failed: ' + (err.response?.data?.error || err.message), true);
    } finally { setClearing(false); }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    showToast(`Reading ${file.name}...`);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length === 0) { showToast('No valid rows found in CSV', true); return; }
      showToast(`Parsed ${rows.length} rows — uploading to server...`);
      const res = await api.post('/curriculum/import', { state: importState, rows });
      const d = res.data;
      showToast(`✅ ${d.written} outcomes imported for ${importState}. Skipped duplicates: ${d.skipped}`);
      loadAll();
    } catch (err) {
      showToast('Import failed: ' + (err.response?.data?.error || err.message), true);
    } finally { setImporting(false); e.target.value = ''; }
  }

  const stateCodeKey = `${viewState.toLowerCase()}_code`;
  const sortedStages = [...meta.stages].sort(stageSort);
  const stateCount = outcomes.filter(o => o[stateCodeKey]).length;

  return (
    <div className="animate-fade">
      {toast && (
        <div className="toast" style={{ background: toast.isError ? 'var(--danger)' : 'var(--text)', maxWidth: 520, lineHeight: 1.5 }}>
          {toast.msg}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Curriculum Outcomes</h1>
          <p className="page-subtitle">{outcomes.length} outcomes in database</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
          <Download size={14} /> Export All CSV
        </button>
      </div>

      {/* ── Import card ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>Import State Outcomes</h3>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertCircle size={15} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>CSV columns:</strong> <code>subject, outcome_code, stage, year_levels, description</code><br />
            Descriptions with commas are fine — wrap them in quotes.<br />
            Re-importing the same file is safe — it will update existing rows, not create duplicates.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ minWidth: 220 }}>
            <label>State</label>
            <select className="select" value={importState} onChange={e => setImportState(e.target.value)}>
              {STATES.map(s => <option key={s} value={s}>{STATE_LABELS[s]} ({s})</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={importing}>
            <Upload size={14} /> {importing ? 'Importing...' : `Import CSV for ${importState}`}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={clearStateData} disabled={clearing}
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
            <Trash2 size={13} /> {clearing ? 'Clearing...' : `Clear ${importState} data`}
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      {/* ── View / filter ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="input-group" style={{ minWidth: 200 }}>
          <label>View state codes</label>
          <select className="select" value={viewState} onChange={e => setViewState(e.target.value)}>
            {STATES.map(s => <option key={s} value={s}>{STATE_LABELS[s]} ({s})</option>)}
          </select>
        </div>
        <div className="input-group" style={{ minWidth: 160 }}>
          <label>Subject</label>
          <select className="select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {meta.subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="input-group" style={{ minWidth: 150 }}>
          <label>Stage</label>
          <select className="select" value={filterStage} onChange={e => setFilterStage(e.target.value)}>
            <option value="">All Stages</option>
            {sortedStages.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {(filterSubject || filterStage) && (
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 2 }}
            onClick={() => { setFilterSubject(''); setFilterStage(''); }}>
            <X size={13} /> Clear
          </button>
        )}
        {outcomes.length > 0 && (
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 2 }}>
            {stateCount} of {outcomes.length} have {viewState} codes
          </div>
        )}
      </div>

      {outcomes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📚</div>
          <h3>No outcomes loaded</h3>
          <p>Select a state and import a CSV file above to get started</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)' }}>
                <th style={th}>Subject</th>
                <th style={th}>Stage</th>
                <th style={th}>Years</th>
                <th style={{ ...th, minWidth: 280 }}>Description</th>
                <th style={{ ...th, minWidth: 150 }}>{viewState} Code</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {outcomes.map(outcome => {
                const isEditing = editingId === outcome.id;
                const form = isEditing ? editForm : outcome;
                const stateCode = outcome[stateCodeKey];

                return (
                  <tr key={outcome.id} style={{
                    borderBottom: '1px solid var(--border)',
                    background: isEditing ? 'var(--primary-pale)' : stateCode ? 'var(--surface)' : 'var(--surface-2)',
                  }}>
                    <td style={td}>
                      {isEditing
                        ? <input className="input" style={inp} value={form.subject} onChange={e => setEditForm({...editForm, subject: e.target.value})} />
                        : <strong style={{ fontSize: 12 }}>{outcome.subject}</strong>}
                    </td>
                    <td style={td}>
                      {isEditing
                        ? <input className="input" style={inp} value={form.stage} onChange={e => setEditForm({...editForm, stage: e.target.value})} />
                        : <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{outcome.stage}</span>}
                    </td>
                    <td style={td}>
                      {isEditing
                        ? <input className="input" style={{ ...inp, width: 55 }} value={form.year_levels} onChange={e => setEditForm({...editForm, year_levels: e.target.value})} />
                        : <span className="badge" style={{ background: 'var(--primary-pale)', color: 'var(--primary)', fontSize: 11 }}>Yr {outcome.year_levels}</span>}
                    </td>
                    <td style={{ ...td, maxWidth: 320 }}>
                      {isEditing
                        ? <textarea className="textarea" style={{ fontSize: 12, minWidth: 220, minHeight: 52 }} value={form.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                        : <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{outcome.description}</span>}
                    </td>
                    <td style={td}>
                      {isEditing
                        ? <input className="input" style={{ ...inp, width: 130 }}
                            value={form[stateCodeKey] || ''}
                            onChange={e => setEditForm({...editForm, [stateCodeKey]: e.target.value})}
                            placeholder="e.g. EN3-RECOM-01" />
                        : stateCode
                          ? <code style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, background: 'var(--primary-pale)', padding: '2px 8px', borderRadius: 4 }}>{stateCode}</code>
                          : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-primary btn-sm" onClick={saveEdit} style={{ padding: '4px 10px' }}><Check size={13} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)} style={{ padding: '4px 10px' }}><X size={13} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(outcome.id); setEditForm({...outcome}); }} style={{ padding: '4px 8px', fontSize: 11 }}>Edit</button>
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

const th  = { padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' };
const td  = { padding: '8px 12px', verticalAlign: 'top' };
const inp = { padding: '4px 8px', fontSize: 12, minWidth: 80 };
