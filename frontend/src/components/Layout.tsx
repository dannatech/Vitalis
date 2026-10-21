import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import NetworkStatusBadge from './NetworkStatusBadge';

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
        <div className="brand">Vitalis</div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
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
