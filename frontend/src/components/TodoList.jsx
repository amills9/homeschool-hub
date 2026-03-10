import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Plus, Trash2, CheckSquare, Square, X } from 'lucide-react';

export default function TodoList({ child }) {
  const [todos, setTodos] = useState([]);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => { loadTodos(); }, [child.id]);

  async function loadTodos() {
    setLoading(true);
    try {
      const res = await api.get(`/todos/${child.id}`);
      setTodos(res.data);
    } finally {
      setLoading(false);
    }
  }

  async function addTodo(e) {
    e.preventDefault();
    if (!newText.trim()) return;
    const res = await api.post('/todos', { child_id: child.id, text: newText });
    setTodos([...todos, res.data]);
    setNewText('');
    inputRef.current?.focus();
  }

  async function toggleTodo(todo) {
    await api.put(`/todos/${todo.id}`, { is_done: !todo.is_done });
    setTodos(todos.map(t => t.id === todo.id ? { ...t, is_done: t.is_done ? 0 : 1 } : t));
  }

  async function deleteTodo(id) {
    await api.delete(`/todos/${id}`);
    setTodos(todos.filter(t => t.id !== id));
  }

  async function clearDone() {
    await api.delete(`/todos/${child.id}/done`);
    setTodos(todos.filter(t => !t.is_done));
  }

  const pending = todos.filter(t => !t.is_done);
  const done = todos.filter(t => t.is_done);

  return (
    <div>
      {/* Add item */}
      <form onSubmit={addTodo} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          ref={inputRef}
          className="input"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Add a to-do..."
          style={{ flex: 1, fontSize: 14 }}
        />
        <button type="submit" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
          <Plus size={15} />
        </button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 16 }}><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /></div>
      ) : todos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-3)', fontSize: 13 }}>
          No to-dos yet — add one above!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Pending */}
          {pending.map(todo => (
            <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
          ))}

          {/* Done section */}
          {done.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px', opacity: 0.5 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                  {done.length} completed
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              {done.map(todo => (
                <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
              ))}
              <button
                className="btn btn-ghost btn-sm"
                onClick={clearDone}
                style={{ alignSelf: 'flex-end', fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}
              >
                <X size={12} /> Clear completed
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 12px',
      borderRadius: 'var(--radius-sm)',
      background: todo.is_done ? 'transparent' : 'var(--surface-2)',
      border: `1px solid ${todo.is_done ? 'transparent' : 'var(--border)'}`,
      transition: 'all 0.15s',
    }}>
      <button
        onClick={() => onToggle(todo)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: todo.is_done ? 'var(--primary)' : 'var(--text-3)', flexShrink: 0 }}
      >
        {todo.is_done ? <CheckSquare size={18} /> : <Square size={18} />}
      </button>
      <span style={{
        flex: 1, fontSize: 14,
        textDecoration: todo.is_done ? 'line-through' : 'none',
        color: todo.is_done ? 'var(--text-3)' : 'var(--text)',
        transition: 'all 0.15s',
      }}>
        {todo.text}
      </span>
      <button
        onClick={() => onDelete(todo.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-3)', flexShrink: 0, opacity: 0.5 }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
