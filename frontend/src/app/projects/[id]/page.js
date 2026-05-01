'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';

const COLUMNS = [
  { key:'todo', label:'To Do', color:'var(--text2)', dot:'#64748b' },
  { key:'in-progress', label:'In Progress', color:'var(--primary)', dot:'#6366f1' },
  { key:'review', label:'Review', color:'var(--yellow)', dot:'#f59e0b' },
  { key:'done', label:'Done', color:'var(--green)', dot:'#10b981' },
];
const priorityColors = { low:'badge-low', medium:'badge-medium', high:'badge-high', critical:'badge-critical' };

// ── Task Modal ────────────────────────────────────────────────────────────────
function TaskModal({ task, onClose, onSave, onDelete, members, userRole }) {
  const isNew = !task._id;
  const [form, setForm] = useState({ title:task.title||'', description:task.description||'', status:task.status||'todo', priority:task.priority||'medium', assignedTo:task.assignedTo?._id||task.assignedTo||'', dueDate:task.dueDate ? format(new Date(task.dueDate),'yyyy-MM-dd') : '' });
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(task.comments || []);
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try { await onSave(form, task._id); }
    finally { setLoading(false); }
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    try {
      const r = await api.post(`/projects/${task.project}/tasks/${task._id}/comments`, { text: comment });
      setComments(c => [...c, r.data.comment]);
      setComment('');
    } catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const canEdit = isNew || userRole === 'admin';

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:600 }}>
        <div className="modal-header">
          <div className="modal-title">{isNew ? 'New Task' : 'Edit Task'}</div>
          <div style={{ display:'flex', gap:8 }}>
            {!isNew && userRole==='admin' && <button className="btn btn-danger btn-sm" onClick={() => onDelete(task._id)}>Delete</button>}
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Title *</label>
              <input name="title" className="form-control" value={form.title} onChange={handle} required disabled={!canEdit && !isNew} />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Description</label>
              <textarea name="description" className="form-control" rows={3} value={form.description} onChange={handle} disabled={!canEdit && !isNew} style={{ resize:'vertical' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Status</label>
                <select name="status" className="form-control" value={form.status} onChange={handle}>
                  {['todo','in-progress','review','done'].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Priority</label>
                <select name="priority" className="form-control" value={form.priority} onChange={handle} disabled={!canEdit && !isNew}>
                  {['low','medium','high','critical'].map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Assign To</label>
                <select name="assignedTo" className="form-control" value={form.assignedTo} onChange={handle} disabled={!canEdit && !isNew}>
                  <option value="">Unassigned</option>
                  {members.map(m=><option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label>Due Date</label>
                <input name="dueDate" type="date" className="form-control" value={form.dueDate} onChange={handle} disabled={!canEdit && !isNew} />
              </div>
            </div>

            {/* Comments */}
            {!isNew && (
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text2)', marginBottom:12 }}>Comments ({comments.length})</div>
                <div style={{ maxHeight:160, overflowY:'auto', display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                  {comments.map(c => (
                    <div key={c._id} style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 12px' }}>
                      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                        <div className="avatar avatar-sm">{c.author?.name?.[0]?.toUpperCase()}</div>
                        <span style={{ fontSize:12, fontWeight:600 }}>{c.author?.name}</span>
                        <span style={{ fontSize:11, color:'var(--text3)', marginLeft:'auto' }}>{format(new Date(c.createdAt),'MMM d, HH:mm')}</span>
                      </div>
                      <div style={{ fontSize:13, color:'var(--text2)' }}>{c.text}</div>
                    </div>
                  ))}
                  {!comments.length && <div style={{ fontSize:13, color:'var(--text3)', textAlign:'center', padding:'16px 0' }}>No comments yet</div>}
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <input className="form-control" placeholder="Add a comment..." value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&postComment()} style={{ flex:1 }} />
                  <button type="button" className="btn btn-primary btn-sm" onClick={postComment}>Post</button>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : isNew ? 'Create Task' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({ projectId, onClose, onAdded }) {
  const [form, setForm] = useState({ email:'', role:'member' });
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const r = await api.post(`/projects/${projectId}/members`, form);
      toast.success('Member added!');
      onAdded(r.data.project);
      onClose();
    } catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><div className="modal-title">Add Team Member</div><button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button></div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group"><label>Email Address</label><input type="email" className="form-control" placeholder="member@example.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required /></div>
            <div className="form-group"><label>Project Role</label>
              <select className="form-control" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading?'Adding...':'Add Member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [userRole, setUserRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [taskModal, setTaskModal] = useState(null);
  const [addMember, setAddMember] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [pr, tr] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
      ]);
      setProject(pr.data.project);
      setUserRole(pr.data.userRole);
      setTasks(tr.data.tasks);
    } catch { router.replace('/projects'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openNewTask = () => setTaskModal({ title:'', description:'', status:'todo', priority:'medium', assignedTo:'', dueDate:'', project: id, comments:[] });
  const openTask = t => setTaskModal(t);

  const handleSaveTask = async (form, taskId) => {
    try {
      if (taskId) {
        const r = await api.put(`/projects/${id}/tasks/${taskId}`, form);
        setTasks(ts => ts.map(t => t._id===taskId ? r.data.task : t));
        toast.success('Task updated!');
      } else {
        const r = await api.post(`/projects/${id}/tasks`, form);
        setTasks(ts => [...ts, r.data.task]);
        toast.success('Task created!');
      }
      setTaskModal(null);
    } catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteTask = async taskId => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`);
      setTasks(ts => ts.filter(t => t._id !== taskId));
      toast.success('Task deleted');
      setTaskModal(null);
    } catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRemoveMember = async userId => {
    if (!confirm('Remove this member?')) return;
    try {
      const r = await api.delete(`/projects/${id}/members/${userId}`);
      setProject(r.data.project);
      toast.success('Member removed');
    } catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project and ALL its tasks? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${id}`);
      toast.success('Project deleted');
      router.replace('/projects');
    } catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <ProtectedRoute><div className="loading-screen"><div className="spinner-ring"></div></div></ProtectedRoute>;
  if (!project) return null;

  const tasksByStatus = col => tasks.filter(t => t.status === col);
  const initials = n => n?.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)||'?';

  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          {/* Topbar */}
          <div className="topbar">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>← Back</button>
              <div>
                <div className="topbar-title">{project.name}</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>{tasks.length} tasks · {project.members?.length} members</div>
              </div>
            </div>
            <div className="topbar-actions">
              {userRole==='admin' && <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Delete Project</button>}
              {userRole==='admin' && <button className="btn btn-secondary btn-sm" onClick={() => setAddMember(true)}>+ Member</button>}
              <button className="btn btn-primary btn-sm" onClick={openNewTask}>+ Task</button>
            </div>
          </div>

          <div className="page-content">
            {/* Tabs */}
            <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--bg2)', padding:4, borderRadius:10, width:'fit-content', border:'1px solid var(--border)' }}>
              {[['board','📋 Board'],['members','👥 Members'],['settings','⚙️ Settings']].map(([key,label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`btn btn-sm ${tab===key?'btn-primary':'btn-ghost'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Board Tab */}
            {tab === 'board' && (
              <div className="board-columns">
                {COLUMNS.map(col => {
                  const colTasks = tasksByStatus(col.key);
                  return (
                    <div key={col.key} className="board-col">
                      <div className="board-col-header">
                        <div className="board-col-title">
                          <span style={{ width:8, height:8, borderRadius:'50%', background:col.dot, display:'inline-block' }}></span>
                          {col.label}
                        </div>
                        <span className="col-count">{colTasks.length}</span>
                      </div>
                      {colTasks.map(t => (
                        <div key={t._id} className="task-card" onClick={() => openTask(t)}>
                          {t.labels?.length>0 && (
                            <div className="task-card-labels">
                              {t.labels.map(l => <span key={l} className="label-chip">{l}</span>)}
                            </div>
                          )}
                          <div className="task-title">{t.title}</div>
                          <div className="task-meta">
                            <span className={`badge ${priorityColors[t.priority]}`}>{t.priority}</span>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              {t.dueDate && (
                                <span className={`task-due ${isPast(new Date(t.dueDate))&&t.status!=='done'?'overdue':''}`}>
                                  📅 {format(new Date(t.dueDate),'MMM d')}
                                </span>
                              )}
                              {t.assignedTo && (
                                <div className="avatar avatar-sm" title={t.assignedTo.name}>{initials(t.assignedTo.name)}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {colTasks.length===0 && (
                        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text3)', fontSize:13 }}>No tasks</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Members Tab */}
            {tab === 'members' && (
              <div className="card">
                <div style={{ padding:'20px 24px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div className="section-title" style={{ fontSize:15 }}>Team Members</div>
                  {userRole==='admin' && <button className="btn btn-primary btn-sm" onClick={() => setAddMember(true)}>+ Add Member</button>}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Member</th><th>Email</th><th>Project Role</th><th>Joined</th>{userRole==='admin'&&<th>Actions</th>}</tr></thead>
                    <tbody>
                      {project.members?.map(m => (
                        <tr key={m.user?._id}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div className="avatar avatar-sm">{initials(m.user?.name)}</div>
                              <span style={{ fontWeight:500 }}>{m.user?.name}</span>
                              {m.user?._id === project.owner?._id && <span className="badge" style={{ background:'rgba(245,158,11,0.15)', color:'var(--yellow)', fontSize:10 }}>Owner</span>}
                            </div>
                          </td>
                          <td style={{ color:'var(--text2)', fontSize:13 }}>{m.user?.email}</td>
                          <td><span className={`badge badge-${m.role}`}>{m.role}</span></td>
                          <td style={{ color:'var(--text3)', fontSize:12 }}>{m.joinedAt ? format(new Date(m.joinedAt),'MMM d, yyyy') : '—'}</td>
                          {userRole==='admin' && (
                            <td>
                              {m.user?._id !== project.owner?._id && (
                                <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.user?._id)}>Remove</button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {tab === 'settings' && (
              <div style={{ maxWidth:600 }}>
                <div className="card card-pad">
                  <div className="section-title" style={{ marginBottom:20 }}>Project Info</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {[['Name', project.name],['Description', project.description||'—'],['Status', project.status],['Priority', project.priority],['Owner', project.owner?.name],['Created', format(new Date(project.createdAt),'PPP')]].map(([k,v])=>(
                      <div key={k} style={{ display:'flex', gap:16, padding:'12px 0', borderBottom:'1px solid var(--border)' }}>
                        <span style={{ minWidth:100, fontSize:13, color:'var(--text3)', fontWeight:500 }}>{k}</span>
                        <span style={{ fontSize:13 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {project.dueDate && <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(245,158,11,0.1)', borderRadius:8, fontSize:13, color:'var(--yellow)' }}>
                    📅 Due: {format(new Date(project.dueDate),'PPP')}
                  </div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {taskModal && (
        <TaskModal
          task={taskModal}
          members={project.members || []}
          userRole={userRole}
          onClose={() => setTaskModal(null)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}
      {addMember && (
        <AddMemberModal
          projectId={id}
          onClose={() => setAddMember(false)}
          onAdded={p => setProject(p)}
        />
      )}
    </ProtectedRoute>
  );
}
