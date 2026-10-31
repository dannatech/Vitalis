import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import NetworkStatusBadge from './NetworkStatusBadge';
import Logo from './Logo';
import {
  BillingIcon,
  ChevronCollapseIcon,
  CloseIcon,
  DashboardIcon,
  LabsIcon,
  NcdcIcon,
  PatientsIcon,
  PharmacyIcon,
  ReferenceIcon,
  StaffIcon,
} from './NavIcons';

const SIDEBAR_COLLAPSED_KEY = 'vitalis.sidebarCollapsed';

function getStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export default function Layout() {
  const { user, isDemo, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(getStoredCollapsed);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  // Mirrors the backend's GET /ncdc-reports RBAC — pharmacy/lab/billing
  // roles have no clinical or compliance reason to see this worklist.
  const canSeeNcdcReports =
    user &&
    ['DOCTOR', 'NURSE', 'RECORDS_OFFICER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
  // Mirrors the backend's GET /pharmacy/prescriptions RBAC.
  const canSeePharmacy =
    user && ['PHARMACIST', 'DOCTOR', 'NURSE', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);
  // Mirrors the backend's @Roles() on the billing controllers.
  const canSeeBilling =
    user && ['BILLING_OFFICER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role);

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // per-viewer convenience only — fine if storage is unavailable
      }
      return next;
    });
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

        <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-top">
            <Link to="/dashboard" className="sidebar-logo" onClick={closeSidebar}>
              <Logo withWordmark size={26} />
            </Link>
            <button
              type="button"
              className="sidebar-close"
              onClick={closeSidebar}
              aria-label="Close navigation"
            >
              <CloseIcon />
            </button>
          </div>
          <nav className="sidebar-nav">
            <NavLink to="/dashboard" onClick={closeSidebar} title="Dashboard">
              <DashboardIcon className="sidebar-link-icon" />
              <span className="sidebar-link-label">Dashboard</span>
            </NavLink>
            <NavLink to="/patients" onClick={closeSidebar} title="Patients">
              <PatientsIcon className="sidebar-link-icon" />
              <span className="sidebar-link-label">Patients</span>
            </NavLink>
            <NavLink to="/labs" onClick={closeSidebar} title="Labs">
              <LabsIcon className="sidebar-link-icon" />
              <span className="sidebar-link-label">Labs</span>
            </NavLink>
            <NavLink to="/icd10-reference" onClick={closeSidebar} title="ICD-10 Reference">
              <ReferenceIcon className="sidebar-link-icon" />
              <span className="sidebar-link-label">ICD-10 Reference</span>
            </NavLink>
            {canSeeNcdcReports && (
              <NavLink to="/ncdc-reports" onClick={closeSidebar} title="NCDC Reports">
                <NcdcIcon className="sidebar-link-icon" />
                <span className="sidebar-link-label">NCDC Reports</span>
              </NavLink>
            )}
            {canSeePharmacy && (
              <NavLink to="/pharmacy" onClick={closeSidebar} title="Pharmacy">
                <PharmacyIcon className="sidebar-link-icon" />
                <span className="sidebar-link-label">Pharmacy</span>
              </NavLink>
            )}
            {canSeeBilling && (
              <NavLink to="/billing" onClick={closeSidebar} title="Billing">
                <BillingIcon className="sidebar-link-icon" />
                <span className="sidebar-link-label">Billing</span>
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/staff" onClick={closeSidebar} title="Staff">
                <StaffIcon className="sidebar-link-icon" />
                <span className="sidebar-link-label">Staff</span>
              </NavLink>
            )}
          </nav>

          <button
            type="button"
            className="sidebar-collapse-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <ChevronCollapseIcon className="sidebar-collapse-icon" />
            <span className="sidebar-link-label">Collapse</span>
          </button>
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
