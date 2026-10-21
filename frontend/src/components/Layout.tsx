import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import NetworkStatusBadge from './NetworkStatusBadge';
import Logo from './Logo';

export default function Layout() {
  const { user, isDemo, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  // Mirrors the backend's GET /ncdc-reports RBAC — pharmacy/lab/billing
  // roles have no clinical or compliance reason to see this worklist.
  const canSeeNcdcReports =
    user &&
    ['DOCTOR', 'NURSE', 'RECORDS_OFFICER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="app-shell">
      {isDemo && (
        <div className="demo-banner">
          Preview mode — sample data only, not connected to a real backend
        </div>
      )}

      <div className="app-body">
        {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} />}

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <Link to="/dashboard" className="sidebar-logo" onClick={closeSidebar}>
            <Logo withWordmark size={26} />
          </Link>
          <nav className="sidebar-nav">
            <NavLink to="/dashboard" onClick={closeSidebar}>
              Dashboard
            </NavLink>
            <NavLink to="/patients" onClick={closeSidebar}>
              Patients
            </NavLink>
            <NavLink to="/labs" onClick={closeSidebar}>
              Labs
            </NavLink>
            {canSeeNcdcReports && (
              <NavLink to="/ncdc-reports" onClick={closeSidebar}>
                NCDC Reports
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/staff" onClick={closeSidebar}>
                Staff
              </NavLink>
            )}
          </nav>
        </aside>

        <div className="app-main">
          <header className="app-header">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Toggle navigation"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M3 5H17M3 10H17M3 15H17"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="header-right">
              <NetworkStatusBadge />
              <span className="user-chip">
                {user?.fullName} · {user?.role}
              </span>
              <button type="button" onClick={logout}>
                Sign out
              </button>
            </div>
          </header>
          <main className="app-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
