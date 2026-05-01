'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Link from 'next/link';

const statusColors = { 'todo': 'badge-todo', 'in-progress': 'badge-in-progress', 'review': 'badge-review', 'done': 'badge-done' };
const priorityColors = { 'low': 'badge-low', 'medium': 'badge-medium', 'high': 'badge-high', 'critical': 'badge-critical' };

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id;
  const taskId = params.taskId;

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTaskAndProject();
  }, [projectId, taskId]);

  const fetchTaskAndProject = async () => {
    setLoading(true);
    try {
      const [taskRes, projRes] = await Promise.all([
        api.get(`/projects/${projectId}/tasks/${taskId}`),
        api.get(`/projects/${projectId}`),
      ]);
      setTask(taskRes.data.task);
      setProject(projRes.data.project);
      setMembers(projRes.data.project.members || []);
      setForm({
        title: taskRes.data.task.title,
        description: taskRes.data.task.description,
        status: taskRes.data.task.status,
        priority: taskRes.data.task.priority,
        assignedTo: taskRes.data.task.assignedTo?._id || '',
        dueDate: taskRes.data.task.dueDate ? format(new Date(taskRes.data.task.dueDate), 'yyyy-MM-dd') : '',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load task');
      router.push(`/projects/${projectId}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, form);
      setTask(res.data.task);
      setEditing(false);
      toast.success('Task updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, { status: newStatus });
      setTask(res.data.task);
      setForm(f => ({ ...f, status: newStatus }));
      toast.success(`Task status changed to ${newStatus}`);
      // Trigger window event to notify other components to refresh
      window.dispatchEvent(new Event('task-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    setSubmitting(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { text: comment });
      setTask(res.data.comment ? { ...task, comments: [...(task.comments || []), res.data.comment] } : task);
      setComment('');
      toast.success('Comment added');
      // Refresh to get updated comments
      fetchTaskAndProject();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      toast.success('Task deleted');
      router.push(`/projects/${projectId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete task');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <div className="spinner-ring"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!task) {
    return (
      <ProtectedRoute>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            <div className="page-content">
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon">❌</div>
                  <h3>Task not found</h3>
                  <Link href={`/projects/${projectId}`} className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
                    Back to Project
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const canEdit = user?.role === 'admin';

  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="topbar">
            <div>
              <Link href={`/projects/${projectId}`} style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
                ← {project?.name}
              </Link>
              <div className="topbar-title" style={{ marginTop: 8 }}>{task.title}</div>
            </div>
            <div className="topbar-actions">
              {canEdit && !editing && (
                <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
                  ✏️ Edit
                </button>
              )}
              {canEdit && editing && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveTask} disabled={submitting}>
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="page-content">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
              {/* Main Content */}
              <div>
                {/* Description */}
                <div className="card" style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 12 }}>Description</div>
                  {editing ? (
                    <textarea
                      name="description"
                      className="form-control"
                      rows={4}
                      value={form.description}
                      onChange={handleFormChange}
                      placeholder="Add description..."
                      style={{ resize: 'vertical' }}
                    />
                  ) : (
                    <div style={{ color: 'var(--text3)', lineHeight: 1.6 }}>
                      {task.description || <em>No description</em>}
                    </div>
                  )}
                </div>

                {/* Comments */}
                <div className="card">
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text2)', marginBottom: 16 }}>
                    Comments ({task.comments?.length || 0})
                  </div>

                  {/* Comments List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
                    {task.comments && task.comments.length > 0 ? (
                      task.comments.map((c) => (
                        <div key={c._id} style={{ background: 'var(--bg3)', borderRadius: 8, padding: 12 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                            <div className="avatar avatar-sm" style={{ fontSize: 10 }}>
                              {c.author?.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{c.author?.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                                {c.createdAt ? format(new Date(c.createdAt), 'MMM d, HH:mm') : 'Just now'}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text2)' }}>{c.text}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 16 }}>
                        No comments yet
                      </div>
                    )}
                  </div>

                  {/* Add Comment */}
                  <form onSubmit={handleAddComment}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="form-control"
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !comment.trim()}>
                        Post
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Sidebar */}
              <div>
                {/* Status */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Status</div>
                  {editing ? (
                    <select
                      name="status"
                      className="form-control"
                      value={form.status}
                      onChange={handleFormChange}
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span className={`badge ${statusColors[task.status]}`}>{task.status}</span>
                      {canEdit && (
                        <select
                          className="form-control"
                          style={{ flex: 1, height: 32, fontSize: 12 }}
                          value={task.status}
                          onChange={(e) => handleStatusChange(e.target.value)}
                        >
                          <option value="todo">To Do</option>
                          <option value="in-progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="done">Done</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Priority</div>
                  {editing ? (
                    <select
                      name="priority"
                      className="form-control"
                      value={form.priority}
                      onChange={handleFormChange}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  ) : (
                    <span className={`badge ${priorityColors[task.priority]}`}>{task.priority}</span>
                  )}
                </div>

                {/* Assignee */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Assigned To</div>
                  {editing ? (
                    <select
                      name="assignedTo"
                      className="form-control"
                      value={form.assignedTo}
                      onChange={handleFormChange}
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.user._id} value={m.user._id}>
                          {m.user.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      {task.assignedTo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="avatar avatar-sm" style={{ fontSize: 10 }}>
                            {task.assignedTo.name?.[0]?.toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{task.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Due Date */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Due Date</div>
                  {editing ? (
                    <input
                      type="date"
                      name="dueDate"
                      className="form-control"
                      value={form.dueDate}
                      onChange={handleFormChange}
                    />
                  ) : (
                    <div style={{ fontSize: 13, color: task.dueDate ? 'var(--text2)' : 'var(--text3)' }}>
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date'}
                    </div>
                  )}
                </div>

                {/* Created By */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Created By</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="avatar avatar-sm" style={{ fontSize: 10 }}>
                      {task.createdBy?.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{task.createdBy?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {task.createdAt ? format(new Date(task.createdAt), 'MMM d, yyyy') : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                {canEdit && (
                  <div className="card">
                    <button
                      className="btn btn-danger btn-block"
                      onClick={handleDeleteTask}
                    >
                      🗑️ Delete Task
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
