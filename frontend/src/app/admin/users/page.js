'use client';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/users').then(r => { setUsers(r.data.users); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const toggleActive = async (u) => {
    toast('Cannot deactivate users from this UI — use the API directly', { icon: 'ℹ️' });
  };

  const initials = n => n?.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2)||'?';

  return (
    <ProtectedRoute adminOnly>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="topbar">
            <div className="topbar-title">User Management</div>
            <div style={{ fontSize:13, color:'var(--text2)' }}>{users.length} total users</div>
          </div>
          <div className="page-content">
            <div className="card">
              {loading ? (
                <div className="loading-screen" style={{ minHeight:300 }}><div className="spinner-ring"></div></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Global Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div className="avatar avatar-sm">{initials(u.name)}</div>
                              <span style={{ fontWeight:500 }}>{u.name}</span>
                            </div>
                          </td>
                          <td style={{ color:'var(--text2)', fontSize:13 }}>{u.email}</td>
                          <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                          <td>
                            <span style={{ fontSize:12, padding:'3px 10px', borderRadius:100, background: u.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: u.isActive ? 'var(--green)' : 'var(--red)' }}>
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ color:'var(--text3)', fontSize:12 }}>{format(new Date(u.createdAt),'MMM d, yyyy')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
