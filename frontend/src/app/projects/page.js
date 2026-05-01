'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { format } from 'date-fns';

const statusOpts = ['active','on-hold','completed','cancelled'];
const priorityOpts = ['low','medium','high','critical'];
const statusColors = { active:'badge-in-progress', 'on-hold':'badge-review', completed:'badge-done', cancelled:'badge-todo' };
const priorityColors = { low:'badge-low', medium:'badge-medium', high:'badge-high', critical:'badge-critical' };

function CreateModal({ onClose, onCreated, currentUser }) {
  const [form, setForm] = useState({ name:'', description:'', priority:'medium', dueDate:'', memberIds: [] });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    api.get('/auth/users').then(res => {
      setUsers(res.data.users.filter(u => u._id !== currentUser?._id));
    }).catch(console.error);
  }, [currentUser]);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  
  const toggleMember = (userId) => {
    setForm(f => {
      if (f.memberIds.includes(userId)) {
        return { ...f, memberIds: f.memberIds.filter(id => id !== userId) };
      } else {
        return { ...f, memberIds: [...f.memberIds, userId] };
      }
    });
  };

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const r = await api.post('/projects', form);
      toast.success('Project created!');
      onCreated(r.data.project);
      onClose();
    } catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };
  
  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div className="modal-title">Create Project</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Project Name *</label><input name="name" className="form-control" placeholder="My Awesome Project" value={form.name} onChange={handle} required /></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label>Description</label><textarea name="description" className="form-control" rows={2} placeholder="What is this project about?" value={form.description} onChange={handle} style={{ resize:'vertical' }} /></div>
            
            <div className="two-col" style={{ gap: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}><label>Priority</label>
                <select name="priority" className="form-control" value={form.priority} onChange={handle}>
                  {priorityOpts.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}><label>Due Date</label><input name="dueDate" type="date" className="form-control" value={form.dueDate} onChange={handle} /></div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Assign Team Members (Optional)</label>
              <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 8, background: 'rgba(255,255,255,0.02)' }}>
                {users.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '10px 0' }}>No other users available to add.</div>
                ) : (
                  users.map(u => (
                    <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px', cursor: 'pointer', borderRadius: 6, margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={form.memberIds.includes(u._id)} 
                        onChange={() => toggleMember(u._id)} 
                        style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                      />
                      <div className="avatar avatar-sm">{u.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2)}</div>
                      <span style={{ fontSize: 13 }}>{u.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{u.email}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.get('/projects').then(r => { setProjects(r.data.projects); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleCreated = (p) => setProjects(prev => [p, ...prev]);

  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="topbar">
            <div className="topbar-title">Projects</div>
            <div className="topbar-actions">
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ New Project</button>
            </div>
          </div>
          <div className="page-content">
            {loading ? (
              <div className="loading-screen" style={{ minHeight:400 }}><div className="spinner-ring"></div></div>
            ) : projects.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📁</div>
                <h3>No projects yet</h3>
                <p>Create your first project to get started</p>
                <button className="btn btn-primary" style={{ marginTop:20 }} onClick={() => setShowCreate(true)}>Create Project</button>
              </div>
            ) : (
              <div className="projects-grid">
                {projects.map(p => {
                  const done = p.taskStats?.done || 0;
                  const total = p.taskStats?.total || 0;
                  const pct = total ? Math.round((done/total)*100) : 0;
                  const initials = n => n?.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2) || '?';
                  return (
                    <Link href={`/projects/${p._id}`} key={p._id} style={{ textDecoration:'none' }}>
                      <div className="card project-card card-hover">
                        <div className="project-card-header">
                          <div>
                            <div className="project-name">{p.name}</div>
                            {p.description && <div className="project-desc" style={{ marginTop:4 }}>{p.description.slice(0,80)}{p.description.length>80?'...':''}</div>}
                          </div>
                          <span className={`badge ${priorityColors[p.priority]}`}>{p.priority}</span>
                        </div>
                        <div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text3)', marginBottom:8 }}>
                            <span>Progress</span><span>{done}/{total} tasks</span>
                          </div>
                          <div className="project-progress"><div className="project-progress-bar" style={{ width:`${pct}%` }}></div></div>
                        </div>
                        <div className="project-meta">
                          <div className="member-stack">
                            {p.members?.slice(0,4).map(m => (
                              <div key={m.user?._id} className="avatar avatar-sm" title={m.user?.name}>{initials(m.user?.name)}</div>
                            ))}
                            {p.members?.length > 4 && <div className="avatar avatar-sm" style={{ background:'var(--bg3)', color:'var(--text2)' }}>+{p.members.length-4}</div>}
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                            <span className={`badge ${statusColors[p.status]}`}>{p.status}</span>
                            {p.dueDate && <span style={{ fontSize:11 }}>{format(new Date(p.dueDate),'MMM d')}</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {showCreate && <CreateModal currentUser={user} onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </ProtectedRoute>
  );
}
