import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import DashboardPage from './pages/DashboardPage';
import PatientListPage from './pages/PatientListPage';
import PatientRegisterPage from './pages/PatientRegisterPage';
import PatientDetailPage from './pages/PatientDetailPage';
import EncounterFormPage from './pages/EncounterFormPage';
import EncounterDetailPage from './pages/EncounterDetailPage';
import LabsPage from './pages/LabsPage';
import StaffPage from './pages/StaffPage';
import NcdcReportsPage from './pages/NcdcReportsPage';
import PharmacyPage from './pages/PharmacyPage';
import BillingPage from './pages/BillingPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientListPage />} />
            <Route path="/patients/register" element={<PatientRegisterPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/patients/:patientId/encounters/new" element={<EncounterFormPage />} />
            <Route path="/encounters/:id" element={<EncounterDetailPage />} />
            <Route path="/labs" element={<LabsPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/ncdc-reports" element={<NcdcReportsPage />} />
            <Route path="/pharmacy" element={<PharmacyPage />} />
            <Route path="/billing" element={<BillingPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
