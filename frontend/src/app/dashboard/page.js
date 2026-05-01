'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import Link from 'next/link';
import { format, isPast } from 'date-fns';

/* ─── shared helpers ───────────────────────────────────────── */
const statusColors   = { todo:'badge-todo','in-progress':'badge-in-progress',review:'badge-review',done:'badge-done' };
const priorityColors = { low:'badge-low',medium:'badge-medium',high:'badge-high',critical:'badge-critical' };
const initials = n => n?.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)||'?';

function StatCard({ icon, label, value, cls, sub }) {
  return (
    <div className={`card stat-card ${cls}`}>
      <div className={`stat-icon ${cls}`}>{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ label, val, total, color }) {
  const pct = total ? Math.round((val/total)*100) : 0;
  return (
    <div style={{ flex:1, minWidth:130 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:8 }}>
        <span style={{ color:'var(--text2)' }}>{label}</span>
        <span style={{ fontWeight:600 }}>{val}</span>
      </div>
      <div style={{ background:'var(--bg3)', borderRadius:100, height:6, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:100, transition:'width 1s' }}></div>
      </div>
      <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{pct}%</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD
═══════════════════════════════════════════════════════════ */
function AdminDashboard({ user }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const r = await api.get('/auth/admin/stats');
      setData(r.data);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      if (showLoading) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats(true);
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchStats(false), 30000);
    
    // Listen for task updates from other components
    const handleTaskUpdate = () => {
      fetchStats(false);
    };
    window.addEventListener('task-updated', handleTaskUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('task-updated', handleTaskUpdate);
    };
  }, []);

  if (loading) return <div className="loading-screen" style={{ minHeight:400 }}><div className="spinner-ring"></div></div>;

  const s = data?.stats;

  return (
    <>
      {/* ── Top banner ── */}
      <div style={{ marginBottom:28, padding:'20px 24px', borderRadius:16,
        background:'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(6,182,212,0.15) 100%)',
        border:'1px solid rgba(99,102,241,0.3)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:20 }}>👑 Admin Dashboard</div>
          <div style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>
            System-wide overview — {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchStats(false)} disabled={refreshing}>
            {refreshing ? '⟳ Refreshing...' : '🔄 Refresh'}
          </button>
          <Link href="/admin/users" className="btn btn-secondary btn-sm">Manage Users</Link>
          <Link href="/projects" className="btn btn-primary btn-sm">All Projects</Link>
        </div>
      </div>

      {/* ── User stats ── */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>👥 Platform Users</div>
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
          <StatCard icon="👥" label="Total Users"   value={s?.users?.total   ?? 0} cls="indigo" />
          <StatCard icon="👑" label="Admins"        value={s?.users?.admins  ?? 0} cls="yellow" />
          <StatCard icon="👤" label="Members"       value={s?.users?.members ?? 0} cls="cyan"   />
        </div>
      </div>

      {/* ── Project stats ── */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>📁 Projects</div>
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
          <StatCard icon="📁" label="Total Projects"    value={s?.projects?.total     ?? 0} cls="indigo" />
          <StatCard icon="⚡" label="Active"            value={s?.projects?.active    ?? 0} cls="green"  />
          <StatCard icon="✅" label="Completed"         value={s?.projects?.completed ?? 0} cls="cyan"   />
        </div>
      </div>

      {/* ── Task stats ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>📋 Tasks (System-wide)</div>
        <div className="stats-grid" style={{ gridTemplateColumns:'repeat(5,1fr)' }}>
          <StatCard icon="📋" label="Total Tasks" value={s?.tasks?.total      ?? 0} cls="indigo" />
          <StatCard icon="🕐" label="To Do"       value={s?.tasks?.todo       ?? 0} cls="cyan"   />
          <StatCard icon="⚡" label="In Progress" value={s?.tasks?.['in-progress'] ?? 0} cls="indigo" />
          <StatCard icon="✅" label="Done"        value={s?.tasks?.done       ?? 0} cls="green"  />
          <StatCard icon="🚨" label="Overdue"     value={s?.tasks?.overdue    ?? 0} cls="red"    />
        </div>
      </div>

      {/* ── Two-col: Recent Projects + Recent Users ── */}
      <div className="two-col" style={{ marginBottom:24 }}>
        {/* Recent Projects */}
        <div className="card">
          <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontWeight:700, fontSize:15 }}>Recent Projects</div>
            <Link href="/projects" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          {!data?.recentProjects?.length ? (
            <div className="empty-state" style={{ padding:'32px 24px' }}><div className="empty-state-icon">📁</div><p>No projects yet</p></div>
          ) : data.recentProjects.map(p => {
            const done  = p.taskStats?.done  || 0;
            const total = p.taskStats?.total || 0;
            const pct   = total ? Math.round((done/total)*100) : 0;
            return (
              <Link key={p._id} href={`/projects/${p._id}`} style={{ display:'block', textDecoration:'none' }}>
                <div style={{ padding:'14px 24px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>by {p.owner?.name} · {total} tasks</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                      <div style={{ textAlign:'right', fontSize:11, color: pct===100?'var(--green)':'var(--text3)' }}>{pct}%</div>
                      <div style={{ width:60, background:'var(--bg3)', borderRadius:100, height:4, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:'var(--primary)', borderRadius:100 }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Recent Users */}
        <div className="card">
          <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontWeight:700, fontSize:15 }}>Recent Users</div>
            <Link href="/admin/users" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          {!data?.recentUsers?.length ? (
            <div className="empty-state" style={{ padding:'32px 24px' }}><div className="empty-state-icon">👥</div><p>No users yet</p></div>
          ) : data.recentUsers.map(u => (
            <div key={u._id} style={{ padding:'14px 24px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', gap:12 }}>
              <div className="avatar avatar-sm" style={{ background: u.role==='admin' ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'linear-gradient(135deg,var(--primary),var(--cyan))' }}>
                {initials(u.name)}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{u.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                <span className={`badge badge-${u.role}`}>{u.role}</span>
                <span style={{ fontSize:10, color:'var(--text3)' }}>{format(new Date(u.createdAt),'MMM d')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Priority Distribution ── */}
      <div className="card" style={{ padding:24 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:20 }}>Task Priority Distribution (System-wide)</div>
        <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
          <ProgressBar label="Low"      val={s?.priority?.low      ?? 0} total={s?.tasks?.total || 1} color="var(--green)"   />
          <ProgressBar label="Medium"   val={s?.priority?.medium   ?? 0} total={s?.tasks?.total || 1} color="var(--yellow)"  />
          <ProgressBar label="High"     val={s?.priority?.high     ?? 0} total={s?.tasks?.total || 1} color="var(--orange)"  />
          <ProgressBar label="Critical" val={s?.priority?.critical ?? 0} total={s?.tasks?.total || 1} color="var(--red)"     />
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MEMBER DASHBOARD
═══════════════════════════════════════════════════════════ */
function MemberDashboard({ user }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    try {
      const r = await api.get('/tasks/dashboard');
      setData(r.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      if (showLoading) setLoading(false);
      else setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats(true);
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => fetchStats(false), 30000);
    
    // Listen for task updates from other components
    const handleTaskUpdate = () => {
      fetchStats(false);
    };
    window.addEventListener('task-updated', handleTaskUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('task-updated', handleTaskUpdate);
    };
  }, []);

  if (loading) return <div className="loading-screen" style={{ minHeight:400 }}><div className="spinner-ring"></div></div>;

  const s = data?.stats;

  return (
    <>
      {/* ── Welcome banner ── */}
      <div style={{ marginBottom:28, padding:'20px 24px', borderRadius:16,
        background:'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(6,182,212,0.1) 100%)',
        border:'1px solid rgba(99,102,241,0.25)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:20 }}>👋 Welcome back, {user?.name}!</div>
          <div style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>
            Here&apos;s your personal workspace — {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchStats(false)} disabled={refreshing}>
            {refreshing ? '⟳ Refreshing...' : '🔄 Refresh'}
          </button>
          <Link href="/projects" className="btn btn-primary btn-sm">Browse Projects →</Link>
        </div>
      </div>

      {/* ── Personal Stats ── */}
      <div style={{ marginBottom:28 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>📊 Your Overview</div>
        <div className="stats-grid">
          <StatCard icon="📁" label="My Projects"  value={s?.projects ?? 0}                      cls="indigo" />
          <StatCard icon="📋" label="Total Tasks"  value={s?.tasks?.total   ?? 0}                cls="cyan"   />
          <StatCard icon="⚡" label="In Progress"  value={s?.tasks?.inProgress ?? 0}             cls="indigo" />
          <StatCard icon="👁️" label="In Review"    value={s?.tasks?.review  ?? 0}                cls="yellow" />
          <StatCard icon="✅" label="Completed"    value={s?.tasks?.done    ?? 0}                cls="green"  />
          <StatCard icon="🚨" label="Overdue"      value={s?.tasks?.overdue ?? 0}                cls="red"    sub={s?.tasks?.overdue > 0 ? 'Needs attention!' : 'All on time ✓'} />
        </div>
      </div>

      {/* ── Two-col: My Tasks + Recent Tasks ── */}
      <div className="two-col" style={{ marginBottom:24 }}>
        {/* My assigned tasks */}
        <div className="card">
          <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontWeight:700, fontSize:15 }}>🎯 Assigned to Me</div>
            <span style={{ fontSize:12, color:'var(--text3)' }}>{data?.myTasks?.length ?? 0} pending</span>
          </div>
          {!data?.myTasks?.length ? (
            <div className="empty-state" style={{ padding:'32px 24px' }}>
              <div className="empty-state-icon">🎉</div>
              <h3 style={{ fontSize:15 }}>All clear!</h3>
              <p>No tasks currently assigned to you</p>
            </div>
          ) : data.myTasks.map(t => (
            <Link key={t._id} href={`/projects/${t.project?._id}`} style={{ display:'block', textDecoration:'none' }}>
              <div style={{ padding:'13px 24px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>📁 {t.project?.name}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <span className={`badge ${statusColors[t.status]}`}>{t.status}</span>
                    {t.dueDate && (
                      <span style={{ fontSize:11, padding:'2px 7px', borderRadius:100,
                        background: isPast(new Date(t.dueDate)) ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                        color:      isPast(new Date(t.dueDate)) ? 'var(--red)'           : 'var(--text3)' }}>
                        📅 {format(new Date(t.dueDate),'MMM d')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent task activity */}
        <div className="card">
          <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontWeight:700, fontSize:15 }}>🕐 Recent Activity</div>
          </div>
          {!data?.recentTasks?.length ? (
            <div className="empty-state" style={{ padding:'32px 24px' }}>
              <div className="empty-state-icon">📭</div>
              <p>No recent tasks in your projects</p>
            </div>
          ) : data.recentTasks.map(t => (
            <Link key={t._id} href={`/projects/${t.project?._id}`} style={{ display:'block', textDecoration:'none' }}>
              <div style={{ padding:'12px 24px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <div style={{ display:'flex', alignItems:'center', gap:12, justifyContent:'space-between' }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                      {t.assignedTo && (
                        <div className="avatar avatar-sm" style={{ width:18, height:18, fontSize:9 }}>{initials(t.assignedTo?.name)}</div>
                      )}
                      <span style={{ fontSize:11, color:'var(--text3)' }}>{t.project?.name}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                    <span className={`badge ${priorityColors[t.priority]}`}>{t.priority}</span>
                    <span className={`badge ${statusColors[t.status]}`}>{t.status}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Task Distribution ── */}
      <div className="card" style={{ padding:24 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:20 }}>Task Status Distribution (Your Projects)</div>
        <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
          <ProgressBar label="To Do"       val={s?.tasks?.todo         ?? 0} total={s?.tasks?.total || 1} color="var(--text3)"   />
          <ProgressBar label="In Progress" val={s?.tasks?.inProgress   ?? 0} total={s?.tasks?.total || 1} color="var(--primary)" />
          <ProgressBar label="In Review"   val={s?.tasks?.review       ?? 0} total={s?.tasks?.total || 1} color="var(--yellow)"  />
          <ProgressBar label="Done"        val={s?.tasks?.done         ?? 0} total={s?.tasks?.total || 1} color="var(--green)"   />
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT — role switcher
═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="topbar">
            <div>
              <div className="topbar-title">Dashboard</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                {user?.role === 'admin' ? '⚙️ Admin Control Panel' : '👤 My Workspace'}
              </div>
            </div>
            <div className="topbar-actions">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className="avatar avatar-sm">{initials(user?.name)}</div>
                <span style={{ fontSize:13, fontWeight:500 }}>{user?.name}</span>
              </div>
              <span className={`badge badge-${user?.role}`}>{user?.role}</span>
            </div>
          </div>

          <div className="page-content">
            {user?.role === 'admin'
              ? <AdminDashboard user={user} />
              : <MemberDashboard user={user} />
            }
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
