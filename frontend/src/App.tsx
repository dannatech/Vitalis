import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientListPage from './pages/PatientListPage';
import PatientRegisterPage from './pages/PatientRegisterPage';
import PatientDetailPage from './pages/PatientDetailPage';
import EncounterFormPage from './pages/EncounterFormPage';
import EncounterDetailPage from './pages/EncounterDetailPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientListPage />} />
            <Route path="/patients/register" element={<PatientRegisterPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
            <Route path="/patients/:patientId/encounters/new" element={<EncounterFormPage />} />
            <Route path="/encounters/:id" element={<EncounterDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
