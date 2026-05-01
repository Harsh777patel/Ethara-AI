'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

const statusColors = { todo: 'badge-todo', 'in-progress': 'badge-in-progress', review: 'badge-review', done: 'badge-done' };
const priorityColors = { low: 'badge-low', medium: 'badge-medium', high: 'badge-high', critical: 'badge-critical' };

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      
      const res = await api.get(`/tasks/all?${params.toString()}`);
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = async (taskId, projectId, newStatus) => {
    setUpdatingTaskId(taskId);
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus });
      setTasks(t => t.map(task => task._id === taskId ? res.data.task : task));
      toast.success('Task status updated');
      // Trigger window event to notify dashboard to refresh stats
      window.dispatchEvent(new Event('task-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="topbar">
            <div>
              <div className="topbar-title">Tasks</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                Manage work items across all projects.
              </div>
            </div>
            <div className="topbar-actions">
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>👋 Hello, <strong>{user?.name}</strong></span>
              <span className={`badge badge-${user?.role}`}>{user?.role}</span>
            </div>
          </div>

          <div className="page-content">
            {/* Filters */}
            <div className="filters-bar" style={{ background: 'var(--card)', padding: '16px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <select name="status" value={filters.status} onChange={handleFilterChange} className="filter-select">
                <option value="">All Status</option>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
              
              <select name="priority" value={filters.priority} onChange={handleFilterChange} className="filter-select">
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <div className="search-wrap" style={{ marginLeft: 'auto' }}>
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  name="search"
                  placeholder="Search tasks..." 
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="search-input" 
                />
              </div>
            </div>

            {/* Tasks Table */}
            <div className="card">
              <div className="table-wrap">
                {loading ? (
                  <div className="loading-screen" style={{ minHeight: 300 }}><div className="spinner-ring"></div></div>
                ) : tasks.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3>No tasks found</h3>
                    <p style={{ marginBottom: 16 }}>You don't have any tasks yet. Try:</p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Link href="/projects" className="btn btn-primary btn-sm">Create a Project</Link>
                      <button className="btn btn-secondary btn-sm" onClick={fetchTasks}>🔄 Refresh</button>
                    </div>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Project</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map(t => (
                        <tr key={t._id} style={{ cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg2)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}>
                          <td>
                            <Link href={`/projects/${t.project?._id}/tasks/${t._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                              <div style={{ fontWeight: 500, marginBottom: 4 }}>{t.title}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                                {t.description ? (t.description.length > 50 ? t.description.substring(0, 50) + '...' : t.description) : 'No description'}
                              </div>
                            </Link>
                          </td>
                          <td style={{ color: 'var(--text2)' }}>
                            <Link href={`/projects/${t.project?._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                              {t.project?.name || 'Unknown'}
                            </Link>
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <select 
                              value={t.status}
                              onChange={(e) => handleStatusChange(t._id, t.project?._id, e.target.value)}
                              disabled={updatingTaskId === t._id}
                              className="form-control"
                              style={{ padding: '6px 8px', fontSize: 12, height: 'auto', width: '140px' }}
                            >
                              <option value="todo">To Do</option>
                              <option value="in-progress">In Progress</option>
                              <option value="review">Review</option>
                              <option value="done">Done</option>
                            </select>
                          </td>
                          <td>
                            <span className={`badge ${priorityColors[t.priority]}`}>{t.priority}</span>
                          </td>
                          <td>
                            {t.assignedTo ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="avatar avatar-sm">{t.assignedTo.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2)}</div>
                                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{t.assignedTo.name}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Unassigned</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
