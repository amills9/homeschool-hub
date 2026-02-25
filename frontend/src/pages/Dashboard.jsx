import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getWeekStart } from '../utils/dates';
import { CheckCircle2, Circle, TrendingUp, Target, Clock, Star } from 'lucide-react';

function ProgressRing({ value, max, size = 80, color, label, sublabel }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} className="progress-ring">
          <circle className="progress-ring-track" cx={size/2} cy={size/2} r={r} stroke="var(--border)" strokeWidth={8} />
          <circle
            className="progress-ring-bar"
            cx={size/2} cy={size/2} r={r}
            stroke={color}
            strokeWidth={8}
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{Math.round(pct * 100)}%</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sublabel}</div>}
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome, onToggle }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 14px',
        background: outcome.achieved ? 'var(--primary-pale)' : 'var(--surface-2)',
        borderRadius: 'var(--radius-sm)',
        border: `1.5px solid ${outcome.achieved ? 'var(--primary-light)' : 'var(--border)'}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onClick={() => onToggle(outcome)}
    >
      {outcome.achieved
        ? <CheckCircle2 size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 1 }} />
        : <Circle size={18} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 1 }} />
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: outcome.achieved ? 'var(--primary)' : 'var(--text)',
          textDecoration: outcome.achieved ? 'line-through' : 'none',
        }}>{outcome.title}</div>
        {outcome.subject_name && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            {outcome.subject_icon} {outcome.subject_name}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [children, setChildren] = useState([]);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const weekStart = getWeekStart();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const childrenRes = await api.get('/children');
      const kids = childrenRes.data;
      setChildren(kids);

      const allData = {};
      await Promise.all(kids.map(async kid => {
        const [outcomesRes, tasksRes, subjectsRes] = await Promise.all([
          api.get(`/children/${kid.id}/outcomes`),
          api.get(`/tasks?child_id=${kid.id}&week_start=${weekStart}`),
          api.get(`/children/${kid.id}/subjects`),
        ]);
        allData[kid.id] = {
          outcomes: outcomesRes.data,
          tasks: tasksRes.data,
          subjects: subjectsRes.data,
        };
      }));
      setData(allData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function toggleOutcome(outcome, childId) {
    const updated = { ...outcome, achieved: !outcome.achieved };
    await api.put(`/children/${childId}/outcomes/${outcome.id}`, updated);
    loadDashboard();
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  if (children.length === 0) return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your learning overview</p>
        </div>
      </div>
      <div className="empty-state">
        <div className="empty-state-icon">🎒</div>
        <h3>No children added yet</h3>
        <p>Go to Admin → Setup to add your first child</p>
      </div>
    </div>
  );

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Learning overview & progress</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {children.map(child => {
          const d = data[child.id] || { outcomes: [], tasks: [], subjects: [] };
          const totalOutcomes = d.outcomes.length;
          const achievedOutcomes = d.outcomes.filter(o => o.achieved).length;
          const totalTasks = d.tasks.length;
          const completedTasks = d.tasks.filter(t => t.is_completed).length;
          const recent = d.outcomes.slice(0, 6);

          return (
            <div key={child.id}>
              {/* Child header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 44, height: 44,
                  borderRadius: '50%',
                  background: child.avatar_color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: 'white',
                }}>
                  {child.name[0]}
                </div>
                <div>
                  <h2 style={{ fontSize: 22, fontFamily: 'var(--font-display)' }}>{child.name}</h2>
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Year {child.year_level}</div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid-3" style={{ marginBottom: 20 }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: 'var(--primary-pale)' }}>
                    <Target size={22} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{achievedOutcomes}/{totalOutcomes}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Outcomes Achieved</div>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: 'var(--accent-light)' }}>
                    <CheckCircle2 size={22} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{completedTasks}/{totalTasks}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Tasks This Week</div>
                  </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: '#EEF2FF' }}>
                    <Star size={22} color="#6C63FF" />
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-display)' }}>{d.subjects.length}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Active Subjects</div>
                  </div>
                </div>
              </div>

              {/* Progress + Outcomes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 16 }}>
                {/* Progress rings */}
                <div className="card">
                  <h3 style={{ fontSize: 15, marginBottom: 24 }}>Weekly Progress</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 }}>
                    <ProgressRing
                      value={completedTasks} max={totalTasks || 1}
                      color="var(--primary)"
                      label="Tasks"
                      sublabel={`${completedTasks} of ${totalTasks}`}
                    />
                    <ProgressRing
                      value={achievedOutcomes} max={totalOutcomes || 1}
                      color="var(--accent)"
                      label="Outcomes"
                      sublabel={`${achievedOutcomes} of ${totalOutcomes}`}
                    />
                  </div>
                </div>

                {/* Recent outcomes */}
                <div className="card">
                  <h3 style={{ fontSize: 15, marginBottom: 16 }}>Learning Outcomes</h3>
                  {recent.length === 0 ? (
                    <div style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
                      No outcomes yet — add them in Setup
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recent.map(o => (
                        <OutcomeBadge key={o.id} outcome={o} onToggle={o => toggleOutcome(o, child.id)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject breakdown */}
              {d.subjects.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 15, marginBottom: 16 }}>Subjects</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {d.subjects.map(s => {
                      const subjectTasks = d.tasks.filter(t => t.subject_id === s.id);
                      const done = subjectTasks.filter(t => t.is_completed).length;
                      return (
                        <div key={s.id} style={{
                          padding: '10px 16px',
                          borderRadius: 'var(--radius-sm)',
                          background: s.color + '18',
                          border: `1.5px solid ${s.color}30`,
                          display: 'flex', alignItems: 'center', gap: 8,
                          minWidth: 140,
                        }}>
                          <span style={{ fontSize: 18 }}>{s.icon}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{done}/{subjectTasks.length} tasks</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {children.indexOf(child) < children.length - 1 && <div className="divider" style={{ margin: '24px 0 0' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
