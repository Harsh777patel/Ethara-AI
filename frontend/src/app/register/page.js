'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Snowfall from 'react-snowfall';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <Snowfall color="#82C3D9"/>
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">E AI</div>
          <h1>Ethara<span>AI</span></h1>
        </div>
        <h2 className="auth-title">Create account</h2>
        <p className="auth-sub">Start managing your team&apos;s tasks today</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Full Name</label>
            <input name="name" className="form-control" placeholder="John Doe" value={form.name} onChange={handle} required />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input name="email" type="email" className="form-control" placeholder="you@example.com" value={form.email} onChange={handle} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input name="password" type="password" className="form-control" placeholder="Min. 6 characters" value={form.password} onChange={handle} required />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select name="role" className="form-control" value={form.role} onChange={handle}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="auth-footer">
          Already have an account? <Link href="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
