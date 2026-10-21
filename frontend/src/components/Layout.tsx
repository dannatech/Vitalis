import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import NetworkStatusBadge from './NetworkStatusBadge';
import Logo from './Logo';

export default function Layout() {
  const { user, isDemo, logout } = useAuth();

  return (
    <div className="app-shell">
      {isDemo && (
        <div className="demo-banner">
          Preview mode — sample data only, not connected to a real backend
        </div>
      )}
      <header className="app-header">
        <Link to="/dashboard">
          <Logo withWordmark size={26} />
        </Link>
        <nav>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/patients">Patients</NavLink>
        </nav>
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
  );
}
