'use client';
import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', avatar: user?.avatar || '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(false);
  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const saveProfile = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const r = await api.put('/auth/me', form);
      updateUser(r.data.user);
      toast.success('Profile updated!');
    } catch(err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'U';

  return (
    <ProtectedRoute>
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="topbar"><div className="topbar-title">Profile Settings</div></div>
          <div className="page-content" style={{ maxWidth:560 }}>
            <div className="card card-pad">
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:32 }}>
                <div className="avatar avatar-lg">{initials}</div>
                <div>
                  <div style={{ fontWeight:600, fontSize:18 }}>{user?.name}</div>
                  <div style={{ color:'var(--text2)', fontSize:13 }}>{user?.email}</div>
                  <span className={`badge badge-${user?.role}`} style={{ marginTop:6, display:'inline-flex' }}>{user?.role}</span>
                </div>
              </div>
              <form onSubmit={saveProfile}>
                <div className="form-group"><label>Full Name</label><input name="name" className="form-control" value={form.name} onChange={handle} required /></div>
                <div className="form-group"><label>Avatar URL</label><input name="avatar" className="form-control" placeholder="https://..." value={form.avatar} onChange={handle} /></div>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
