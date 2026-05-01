'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (adminOnly && user.role !== 'admin') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, adminOnly, router]);

  if (loading || !user) {
    return (
      <div className="loading-screen">
        <div className="spinner-ring"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (adminOnly && user.role !== 'admin') return null;

  return children;
}
