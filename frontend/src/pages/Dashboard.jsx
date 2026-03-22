import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { getWeekStart } from '../utils/dates';
import { CheckCircle2, Circle, Target, Clock, Star, Sun, ChevronDown, ChevronUp } from 'lucide-react';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function todayName() { return DAYS[new Date().getDay()]; }

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
          <circle className="progress-ring-bar" cx={size/2} cy={size/2} r={r}
            stroke={color} strokeWidth={8} strokeDasharray={circ} strokeDashoffset={offset} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{Math.round(pct * 100)}%</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sublabel}</div>}
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome, linkedTasks, onToggleTask }) {
  const [open, setOpen] = useState(false);
  const achieved = linkedTasks.length > 0 && linkedTasks.every(t => t.is_completed);
  const userState = (() => { try { return (JSON.parse(localStorage.getItem('user') || '{}').state || 'NSW').toLowerCase(); } catch { return 'nsw'; } })();
  const code = outcome[`${userState}_code`] || outcome.acara_code || '';
  return (
    <div style={{ borderRadius: 'var(--radius-sm)', border: `1.5px solid ${achieved ? 'var(--primary-light)' : 'var(--border)'}`, background: achieved ? 'var(--primary-pale)' : 'var(--surface-2)', overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', cursor: 'pointer' }}>
        {achieved ? <CheckCircle2 size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} /> : <Circle size={16} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 2 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {code && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-pale)', padding: '1px 6px', borderRadius: 4 }}>{code}</span>}
            <span style={{ fontSize: 12, color: achieved ? 'var(--primary)' : 'var(--text)' }}>{outcome.description?.length > 70 ? outcome.description.slice(0,70)+'…' : outcome.description}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{linkedTasks.filter(t => t.is_completed).length}/{linkedTasks.length} tasks complete</div>
        </div>
        <span style={{ fontSize: 14, color: 'var(--text-3)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
      </div>
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px 8px 36px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {linkedTasks.map(t => (
            <div key={t.id} onClick={() => onToggleTask(t)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '3px 0' }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `2px solid ${t.is_completed ? 'var(--primary)' : 'var(--border)'}`, background: t.is_completed ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.is_completed && <CheckCircle2 size={10} color="white" />}
              </div>
              <span style={{ fontSize: 12, color: t.is_completed ? 'var(--text-3)' : 'var(--text)', textDecoration: t.is_completed ? 'line-through' : 'none', flex: 1 }}>{t.title}</span>
              {t.day_of_week && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t.day_of_week.slice(0,3)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TodayTask({ task, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: task.is_completed ? 'var(--surface-2)' : 'var(--surface)', borderRadius: 'var(--radius-sm)', border: `1px solid ${task.is_completed ? 'var(--border)' : (task.subject_color||'var(--border)')}30`, borderLeft: `3px solid ${task.subject_color||'var(--border)'}`, opacity: task.is_completed ? 0.7 : 1 }}>
      <button onClick={() => onToggle(task)} style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: `2px solid ${task.is_completed ? 'var(--primary)' : 'var(--border)'}`, background: task.is_completed ? 'var(--primary)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {task.is_completed && <CheckCircle2 size={13} color="white" />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: task.is_completed ? 'var(--text-3)' : 'var(--text)', textDecoration: task.is_completed ? 'line-through' : 'none' }}>{task.title}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
          {task.subject_name && <span style={{ fontSize: 11, color: task.subject_color||'var(--text-3)' }}>{task.subject_icon} {task.subject_name}</span>}
          {task.duration_minutes && <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10}/>{task.duration_minutes}m</span>}
        </div>
      </div>
    </div>
  );
}

function Pill({ color, bg, label }) {
  return <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: bg, color, whiteSpace: 'nowrap' }}>{label}</span>;
}

function ChildCard({ child, d, today, onToggleTask, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const totalTasks = d.tasks.length;
  const completedTasks = d.tasks.filter(t => t.is_completed).length;
  const todayTasks = d.tasks.filter(t => t.day_of_week === today);
  const todayDone = todayTasks.filter(t => t.is_completed).length;
  const allTodayDone = todayTasks.length > 0 && todayDone === todayTasks.length;

  // Build outcome groups from tasks
  const outcomeMap = {};
  for (const task of d.tasks) {
    if (!task.curriculum_outcome_id || !d.outcomeDetails[task.curriculum_outcome_id]) continue;
    if (!outcomeMap[task.curriculum_outcome_id]) outcomeMap[task.curriculum_outcome_id] = { outcome: d.outcomeDetails[task.curriculum_outcome_id], tasks: [] };
    outcomeMap[task.curriculum_outcome_id].tasks.push(task);
  }
  const outcomeEntries = Object.values(outcomeMap);
  const totalOutcomes = outcomeEntries.length;
  const achievedOutcomes = outcomeEntries.filter(e => e.tasks.every(t => t.is_completed)).length;
  const unlinkedCount = d.tasks.filter(t => !t.curriculum_outcome_id).length;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer', background: 'var(--surface)', borderBottom: open ? '1px solid var(--border)' : 'none' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: child.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'white', flexShrink: 0 }}>{child.name[0]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)' }}>{child.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Year {child.year_level}</div>
        </div>
        {!open && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', marginRight: 8 }}>
            <Pill color="var(--primary)" bg="var(--primary-pale)" label={`${completedTasks}/${totalTasks} tasks`} />
            {todayTasks.length > 0 && <Pill color={allTodayDone?'var(--primary)':'var(--accent)'} bg={allTodayDone?'var(--primary-pale)':'var(--accent-light)'} label={`Today: ${todayDone}/${todayTasks.length}`} />}
          </div>
        )}
        <div style={{ color: 'var(--text-3)', flexShrink: 0 }}>{open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</div>
      </div>

      {open && (
        <div style={{ padding: 20 }}>
          <div className="grid-3" style={{ marginBottom: 20 }}>
            {[
              { icon: Target, bg: 'var(--primary-pale)', color: 'var(--primary)', value: `${achievedOutcomes}/${totalOutcomes}`, label: 'Outcomes' },
              { icon: CheckCircle2, bg: 'var(--accent-light)', color: 'var(--accent)', value: `${completedTasks}/${totalTasks}`, label: 'Tasks This Week' },
              { icon: Star, bg: '#EEF2FF', color: '#6C63FF', value: d.subjects.length, label: 'Subjects' },
            ].map(({ icon: Icon, bg, color, value, label }) => (
              <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
                <div style={{ padding: 10, borderRadius: 10, background: bg, flexShrink: 0 }}><Icon size={20} color={color}/></div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ background: 'var(--surface-2)' }}>
              <h3 style={{ fontSize: 15, marginBottom: 20 }}>Weekly Progress</h3>
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 20 }}>
                <ProgressRing value={completedTasks} max={totalTasks||1} color="var(--primary)" label="Tasks" sublabel={`${completedTasks} of ${totalTasks}`}/>
                <ProgressRing value={achievedOutcomes} max={totalOutcomes||1} color="var(--accent)" label="Outcomes" sublabel={`${achievedOutcomes} of ${totalOutcomes}`}/>
              </div>
            </div>
            <div className="card" style={{ background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Sun size={16} color="var(--accent)"/>
                <h3 style={{ fontSize: 15 }}>Today — {today}</h3>
                {todayTasks.length > 0 && <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: allTodayDone?'var(--primary)':'var(--text-3)' }}>{todayDone}/{todayTasks.length}</span>}
              </div>
              {todayTasks.length === 0
                ? <div style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>🎉 Nothing today!</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{todayTasks.map(t => <TodayTask key={t.id} task={t} onToggle={onToggleTask}/>)}</div>
              }
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: d.subjects.length > 0 ? '2fr 1fr' : '1fr', gap: 16 }}>
            <div className="card" style={{ background: 'var(--surface-2)' }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Learning Outcomes This Week</h3>
              {outcomeEntries.length === 0 ? (
                <div style={{ color: 'var(--text-3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                  No curriculum outcomes linked yet — select an outcome when adding a task
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {outcomeEntries.map(({ outcome, tasks }) => (
                    <OutcomeBadge key={outcome.id} outcome={outcome} linkedTasks={tasks} onToggleTask={onToggleTask}/>
                  ))}
                </div>
              )}
              {unlinkedCount > 0 && outcomeEntries.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>+ {unlinkedCount} task{unlinkedCount > 1 ? 's' : ''} without outcome linked</div>
              )}
            </div>
            {d.subjects.length > 0 && (
              <div className="card" style={{ background: 'var(--surface-2)' }}>
                <h3 style={{ fontSize: 15, marginBottom: 16 }}>Subjects</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {d.subjects.map(s => {
                    const st = d.tasks.filter(t => t.subject_id === s.id);
                    const done = st.filter(t => t.is_completed).length;
                    return (
                      <div key={s.id} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: s.color+'18', border: `1.5px solid ${s.color}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{s.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{done}/{st.length} tasks</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [children, setChildren] = useState([]);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const weekStart = getWeekStart();
  const today = todayName();

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const childrenRes = await api.get('/children');
      const kids = Array.isArray(childrenRes.data) ? childrenRes.data : [];
      setChildren(kids);

      // Fetch curriculum outcomes once for lookup
      let allOutcomes = [];
      try {
        const outRes = await api.get('/curriculum');
        allOutcomes = Array.isArray(outRes.data) ? outRes.data : [];
      } catch {}
      const outcomeIndex = {};
      for (const o of allOutcomes) outcomeIndex[o.id] = o;

      const allData = {};
      await Promise.all(kids.map(async kid => {
        const [tasksRes, subjectsRes] = await Promise.all([
          api.get(`/tasks?child_id=${kid.id}&week_start=${weekStart}`),
          api.get(`/children/${kid.id}/subjects`),
        ]);
        const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];
        const subjects = Array.isArray(subjectsRes.data) ? subjectsRes.data : [];

        // Build outcomeDetails map for this child's tasks
        const outcomeDetails = {};
        for (const task of tasks) {
          if (task.curriculum_outcome_id && outcomeIndex[task.curriculum_outcome_id]) {
            outcomeDetails[task.curriculum_outcome_id] = outcomeIndex[task.curriculum_outcome_id];
          }
        }

        allData[kid.id] = { tasks, subjects, outcomeDetails };
      }));
      setData(allData);
    } catch (e) { console.error('Dashboard error:', e); }
    finally { setLoading(false); }
  }

  async function toggleTask(task) {
    await api.patch(`/tasks/${task.id}/complete`);
    loadDashboard();
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }}/>
    </div>
  );

  if (children.length === 0) return (
    <div>
      <div className="page-header"><div><h1 className="page-title">Dashboard</h1><p className="page-subtitle">Your learning overview</p></div></div>
      <div className="empty-state"><div className="empty-state-icon">🎒</div><h3>No children added yet</h3><p>Go to Account to add your first child</p></div>
    </div>
  );

  return (
    <div className="animate-fade">
      <div className="page-header"><div><h1 className="page-title">Dashboard</h1><p className="page-subtitle">Learning overview & progress</p></div></div>
      {children.map((child, i) => (
        <ChildCard key={child.id} child={child} d={data[child.id]||{tasks:[],subjects:[],outcomeDetails:{}}} today={today} defaultOpen={i===0} onToggleTask={toggleTask}/>
      ))}
    </div>
  );
}
