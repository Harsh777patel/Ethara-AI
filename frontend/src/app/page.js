'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Snowfall from 'react-snowfall';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => { if (user) router.replace('/dashboard'); }, [user]);

  return (
    
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'40px 20px',
      background:'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.2) 0%, transparent 60%), radial-gradient(ellipse at 0% 100%, rgba(6,182,212,0.1) 0%, transparent 50%), #0a0f1e' }}>
        <Snowfall color="#82C3D9"/>
      <div style={{ fontSize:48, marginBottom:16 }}>🚀</div>
      <h1 style={{ fontSize:'clamp(36px, 6vw, 64px)', fontWeight:800, lineHeight:1.15, marginBottom:16, background:'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
        ETHARA AI WORK MANAGER
      </h1>
      <p style={{ fontSize:18, color:'#94a3b8', maxWidth:480, marginBottom:40, lineHeight:1.6 }}>
        Create projects, assign tasks, and track progress — with role-based access for Admins &amp; Members.
      </p>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center' }}>
        <Link href="/register" className="btn btn-primary" style={{ fontSize:16, padding:'14px 32px' }}>Get Started Free</Link>
        <Link href="/login" className="btn btn-secondary" style={{ fontSize:16, padding:'14px 32px' }}>Sign In</Link>
      </div>
      <div style={{ display:'flex', gap:32, marginTop:64, flexWrap:'wrap', justifyContent:'center' }}>
        {[['🔒','Role-Based Access','Admin & Member roles'],['📋','Task Boards','Kanban-style tracking'],['📊','Dashboard','Live stats & overdue alerts']].map(([icon,title,sub])=>(
          <div key={title} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'24px 28px', width:200 }}>
            <div style={{ fontSize:28, marginBottom:12 }}>{icon}</div>
            <div style={{ fontWeight:600, marginBottom:4 }}>{title}</div>
            <div style={{ fontSize:13, color:'#64748b' }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
