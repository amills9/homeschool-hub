import React from 'react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

export default function PrintView({ child, tasks, subjects, weekStart }) {
  function getSubject(id) { return subjects.find(s => s.id === id); }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDate = d => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="print-view" style={{ display: 'none' }}>
      <div className="print-header">
        <div>
          <h1>📚 {child?.name}'s Weekly Plan</h1>
          <p>{formatDate(weekStart)} — {formatDate(weekEnd)}</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>
          <div>Homeschool HUB</div>
          <div>Printed {new Date().toLocaleDateString('en-AU')}</div>
        </div>
      </div>

      {DAYS.map(day => {
        const dayTasks = tasks.filter(t => t.day_of_week === day);
        if (dayTasks.length === 0) return null;
        return (
          <div key={day} className="print-day">
            <div className="print-day-title">{day}</div>
            {dayTasks.map(task => {
              const subject = getSubject(task.subject_id);
              return (
                <div key={task.id} className="print-task">
                  <div className="print-task-checkbox" />
                  {subject && <div className="print-task-subject" style={{ background: subject.color }} />}
                  <div className="print-task-body">
                    <div className="print-task-title">
                      {subject ? `${subject.icon} ` : ''}{task.title}
                      {subject && <span style={{ fontWeight: 400, color: '#888', fontSize: 12 }}> · {subject.name}</span>}
                    </div>
                    {task.description && <div className="print-task-desc">{task.description}</div>}
                    {task.duration_minutes > 0 && (
                      <div className="print-task-duration">⏱ {task.duration_minutes} minutes</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {tasks.length === 0 && (
        <div style={{ color: '#aaa', fontStyle: 'italic', padding: '20px 0' }}>No tasks planned for this week.</div>
      )}

      <div style={{ marginTop: 32, borderTop: '1px solid #ddd', paddingTop: 12, fontSize: 11, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
        <span>Total tasks: {tasks.length}</span>
        <span>Estimated time: {Math.round(tasks.reduce((a,t) => a + (t.duration_minutes||0), 0) / 60 * 10) / 10} hours</span>
      </div>
    </div>
  );
}
