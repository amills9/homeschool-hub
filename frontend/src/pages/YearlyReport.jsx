import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Printer, X, ChevronDown, ChevronUp, FileText } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getSchoolYearWeeks(year) {
  // Returns all Monday week-starts for the given year (Jan–Dec)
  const weeks = [];
  const d = new Date(`${year}-01-01`);
  // Move to first Monday
  while (d.getDay() !== 1) d.setDate(d.getDate() + 1);
  while (d.getFullYear() === year) {
    weeks.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 7);
  }
  return weeks;
}

export default function YearlyReport() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [allTasks, setAllTasks] = useState([]);
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [showIncomplete, setShowIncomplete] = useState(true);
  const [generated, setGenerated] = useState(false);

  useEffect(() => { loadChildren(); }, []);

  async function loadChildren() {
    const res = await api.get('/children');
    setChildren(res.data);
    if (res.data.length > 0) setSelectedChild(res.data[0].id);
  }

  async function generate() {
    if (!selectedChild) return;
    setLoading(true);
    setGenerated(false);
    try {
      // Fetch all tasks for this child across the whole year
      const weeks = getSchoolYearWeeks(selectedYear);
      const allTaskResults = await Promise.all(
        weeks.map(w => api.get(`/tasks?week_start=${w}&child_id=${selectedChild}`).then(r => r.data).catch(() => []))
      );
      const tasks = allTaskResults.flat();
      setAllTasks(tasks);

      // Fetch learning outcomes for this child
      const outRes = await api.get(`/children/${selectedChild}/outcomes`);
      setOutcomes(outRes.data || []);

      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }

  // Group tasks by subject, then show under each learning outcome
  const child = children.find(c => c.id === selectedChild);

  // Build subject map
  const tasksBySubject = {};
  for (const task of allTasks) {
    const key = task.subject_name || 'General';
    if (!tasksBySubject[key]) tasksBySubject[key] = { color: task.subject_color, icon: task.subject_icon, tasks: [] };
    tasksBySubject[key].tasks.push(task);
  }

  // Outcomes grouped by subject
  const outcomesBySubject = {};
  for (const o of outcomes) {
    const key = o.subject_name || 'General';
    if (!outcomesBySubject[key]) outcomesBySubject[key] = [];
    outcomesBySubject[key].push(o);
  }

  // All subjects that appear in either tasks or outcomes
  const allSubjects = [...new Set([...Object.keys(tasksBySubject), ...Object.keys(outcomesBySubject)])].sort();

  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }

  function getTaskMonth(task) {
    if (!task.week_start) return '';
    const d = new Date(task.week_start);
    return MONTHS[d.getMonth()];
  }

  function doPrint() {
    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    const childObj = children.find(c => c.id === selectedChild);

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Yearly Report — ${childObj?.name} — ${selectedYear}</title>
    <style>
      @page { size: A4 portrait; margin: 15mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a18; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      .subtitle { color: #888; font-size: 12px; margin-bottom: 20px; }
      .subject-section { margin-bottom: 24px; page-break-inside: avoid; }
      .subject-header { font-size: 14px; font-weight: 700; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; color: white; }
      .outcome-block { margin-bottom: 10px; padding: 8px 10px; border: 1px solid #e2ddd8; border-radius: 4px; border-left: 4px solid COLOR; }
      .outcome-title { font-weight: 700; font-size: 11px; margin-bottom: 2px; }
      .outcome-status { font-size: 9px; color: #888; margin-bottom: 6px; }
      .outcome-status.achieved { color: #2d6a4f; font-weight: 600; }
      .task-row { display: flex; gap: 8px; padding: 2px 0; border-bottom: 1px solid #f0ede8; font-size: 9px; }
      .task-row:last-child { border-bottom: none; }
      .task-date { color: #888; min-width: 60px; }
      .task-title { flex: 1; }
      .task-done { color: #2d6a4f; min-width: 50px; text-align: right; }
      .task-undone { color: #e76f51; min-width: 50px; text-align: right; }
      .unlinked-tasks { margin-top: 8px; padding: 8px 10px; background: #f7f5f0; border-radius: 4px; }
      .unlinked-label { font-weight: 700; font-size: 10px; margin-bottom: 6px; color: #5c5a55; }
      .divider { height: 1px; background: #e2ddd8; margin: 16px 0; }
    </style></head><body>`;

    html += `<h1>${childObj?.name} — Yearly Learning Report</h1>
    <div class="subtitle">School Year ${selectedYear} &nbsp;•&nbsp; Generated ${new Date().toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' })}</div>`;

    for (const subject of allSubjects) {
      const subjectTasks = (tasksBySubject[subject]?.tasks || []).filter(t =>
        (showCompleted && t.is_completed) || (showIncomplete && !t.is_completed)
      );
      const subjectOutcomes = outcomesBySubject[subject] || [];
      const color = tasksBySubject[subject]?.color || '#6C63FF';

      html += `<div class="subject-section">
        <div class="subject-header" style="background: ${color}">${tasksBySubject[subject]?.icon || '📚'} ${subject}</div>`;

      if (subjectOutcomes.length > 0) {
        for (const outcome of subjectOutcomes) {
          const linkedTasks = subjectTasks.filter(t => t.learning_outcome_id === outcome.id);
          html += `<div class="outcome-block" style="border-left-color: ${color}">
            <div class="outcome-title">${outcome.title}</div>
            <div class="outcome-status ${outcome.achieved ? 'achieved' : ''}">${outcome.achieved ? '✓ Achieved' + (outcome.achieved_date ? ' — ' + formatDate(outcome.achieved_date) : '') : 'In progress'}</div>`;
          if (linkedTasks.length > 0) {
            for (const t of linkedTasks) {
              html += `<div class="task-row">
                <span class="task-date">${getTaskMonth(t)}</span>
                <span class="task-title">${t.title}</span>
                <span class="${t.is_completed ? 'task-done' : 'task-undone'}">${t.is_completed ? '✓ Done' : '○ Planned'}</span>
              </div>`;
            }
          } else {
            html += `<div style="color:#ccc;font-size:9px;padding:4px 0">No tasks linked to this outcome</div>`;
          }
          html += `</div>`;
        }
      }

      // Tasks not linked to any outcome
      const unlinkedTasks = subjectTasks.filter(t => !t.learning_outcome_id);
      if (unlinkedTasks.length > 0) {
        html += `<div class="unlinked-tasks"><div class="unlinked-label">Additional Tasks</div>`;
        for (const t of unlinkedTasks) {
          html += `<div class="task-row">
            <span class="task-date">${getTaskMonth(t)}</span>
            <span class="task-title">${t.title}</span>
            <span class="${t.is_completed ? 'task-done' : 'task-undone'}">${t.is_completed ? '✓ Done' : '○ Planned'}</span>
          </div>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }

    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Yearly Report</h1>
          <p className="page-subtitle">DoE assessment report grouped by learning outcome</p>
        </div>
        {generated && (
          <button className="btn btn-primary" onClick={doPrint}><Printer size={16} /> Print Report</button>
        )}
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ minWidth: 180 }}>
            <label>Child</label>
            <select className="select" value={selectedChild} onChange={e => { setSelectedChild(e.target.value); setGenerated(false); }}>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="input-group" style={{ minWidth: 120 }}>
            <label>Year</label>
            <select className="select" value={selectedYear} onChange={e => { setSelectedYear(+e.target.value); setGenerated(false); }}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Include tasks</label>
            <div style={{ display: 'flex', gap: 16, height: 42, alignItems: 'center' }}>
              <label className="checkbox-wrap">
                <input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} />
                <span>Completed</span>
              </label>
              <label className="checkbox-wrap">
                <input type="checkbox" checked={showIncomplete} onChange={e => setShowIncomplete(e.target.checked)} />
                <span>Incomplete</span>
              </label>
            </div>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={loading || !selectedChild}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Generating...</> : <><FileText size={15} /> Generate Report</>}
          </button>
        </div>
      </div>

      {/* Report preview */}
      {generated && (
        <div>
          {allSubjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <h3>No tasks found</h3>
              <p>No tasks were recorded for {child?.name} in {selectedYear}</p>
            </div>
          ) : (
            allSubjects.map(subject => {
              const subjectTasks = (tasksBySubject[subject]?.tasks || []).filter(t =>
                (showCompleted && t.is_completed) || (showIncomplete && !t.is_completed)
              );
              const subjectOutcomes = outcomesBySubject[subject] || [];
              const color = tasksBySubject[subject]?.color || '#6C63FF';
              const icon = tasksBySubject[subject]?.icon || '📚';

              return (
                <div key={subject} className="card" style={{ marginBottom: 16, borderLeft: `5px solid ${color}` }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color }}>
                    {icon} {subject}
                    <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>
                      {subjectTasks.length} tasks · {subjectTasks.filter(t => t.is_completed).length} completed
                    </span>
                  </h3>

                  {subjectOutcomes.map(outcome => {
                    const linkedTasks = subjectTasks.filter(t => t.learning_outcome_id === outcome.id);
                    return (
                      <div key={outcome.id} style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', borderLeft: `3px solid ${outcome.achieved ? '#2D6A4F' : color}` }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{outcome.title}</div>
                            <div style={{ fontSize: 12, color: outcome.achieved ? '#2D6A4F' : 'var(--text-3)', marginTop: 2 }}>
                              {outcome.achieved ? `✓ Achieved${outcome.achieved_date ? ' — ' + formatDate(outcome.achieved_date) : ''}` : 'In progress'}
                            </div>
                          </div>
                        </div>
                        {linkedTasks.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {linkedTasks.map(t => (
                              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                <span style={{ color: 'var(--text-3)', minWidth: 60 }}>{getTaskMonth(t)}</span>
                                <span style={{ flex: 1 }}>{t.title}</span>
                                <span style={{ fontSize: 11, color: t.is_completed ? '#2D6A4F' : '#E76F51' }}>
                                  {t.is_completed ? '✓ Done' : '○ Planned'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {linkedTasks.length === 0 && (
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>No tasks linked to this outcome</div>
                        )}
                      </div>
                    );
                  })}

                  {/* Unlinked tasks */}
                  {(() => {
                    const unlinked = subjectTasks.filter(t => !t.learning_outcome_id);
                    if (unlinked.length === 0) return null;
                    return (
                      <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', borderLeft: '3px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>Additional Tasks</div>
                        {unlinked.map(t => (
                          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, marginBottom: 2 }}>
                            <span style={{ color: 'var(--text-3)', minWidth: 60 }}>{getTaskMonth(t)}</span>
                            <span style={{ flex: 1 }}>{t.title}</span>
                            <span style={{ fontSize: 11, color: t.is_completed ? '#2D6A4F' : '#E76F51' }}>
                              {t.is_completed ? '✓ Done' : '○ Planned'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>
      )}

      {!generated && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>Select a child and year</h3>
          <p>Then click Generate Report to build the yearly summary</p>
        </div>
      )}
    </div>
  );
}
