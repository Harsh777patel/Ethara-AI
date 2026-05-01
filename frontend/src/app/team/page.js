'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { format } from 'date-fns';

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/auth/users')
      .then(res => {
        setUsers(res.data.users || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch team members', err);
        setLoading(false);
      });
  }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="topbar">
            <div>
              <div className="topbar-title">Team</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                Meet the people behind the projects.
              </div>
            </div>
            <div className="topbar-actions">
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>👋 Hello, <strong>{currentUser?.name}</strong></span>
              <span className={`badge badge-${currentUser?.role}`}>{currentUser?.role}</span>
            </div>
          </div>

          <div className="page-content">
            {/* Search */}
            <div className="filters-bar" style={{ background: 'var(--card)', padding: '16px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div className="search-wrap" style={{ width: '100%', maxWidth: '400px' }}>
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search team members by name, email, or role..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {loading ? (
              <div className="loading-screen" style={{ minHeight: 300 }}><div className="spinner-ring"></div></div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <h3>No team members found</h3>
                <p>Try adjusting your search query.</p>
              </div>
            ) : (
              <div className="projects-grid">
                {filteredUsers.map(u => {
                  const isMe = u._id === currentUser?._id;
                  const initials = u.name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0,2);
                  
                  return (
                    <div key={u._id} className="card card-hover project-card" style={{ position: 'relative' }}>
                      {isMe && <div style={{ position: 'absolute', top: 16, right: 16 }}><span className="badge badge-primary" style={{ background: 'var(--primary)', color: 'white' }}>You</span></div>}
                      
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 16 }}>
                        <div className="avatar avatar-lg" style={{ width: 80, height: 80, fontSize: 28, marginBottom: 16, border: '4px solid var(--bg)', boxShadow: 'var(--shadow)' }}>
                          {initials}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{u.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>{u.email}</div>
                        
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <span className={`badge badge-${u.role}`}>{u.role}</span>
                          {u.isActive ? (
                            <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--green)' }}>Active</span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--red)' }}>Inactive</span>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text3)' }}>
                        <span>Joined: {format(new Date(u.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
