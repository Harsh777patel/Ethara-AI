'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/projects', icon: '📁', label: 'Projects' },
  { href: '/tasks', icon: '📋', label: 'Tasks' },
  { href: '/team', icon: '👥', label: 'Team' },
];

const adminItems = [
  { href: '/admin/users', icon: '👥', label: 'Users' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">E AI</div>
        <div className="sidebar-logo-text">Ethara<span>AI</span></div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Navigation</div>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} className={`nav-link${pathname === item.href || pathname.startsWith(item.href + '/') ? ' active' : ''}`}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {user?.role === 'admin' && (
          <>
            <div className="nav-section-title">Admin</div>
            {adminItems.map(item => (
              <Link key={item.href} href={item.href} className={`nav-link${pathname === item.href ? ' active' : ''}`}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <Link href="/profile" className="nav-link" style={{ marginTop: 4 }}>
          <span style={{ fontSize: 16 }}>⚙️</span> Profile
        </Link>
        <button onClick={logout} className="nav-link" style={{ color: 'var(--red)' }}>
          <span style={{ fontSize: 16 }}>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
