import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute, { getHomeRouteForRole } from './components/ProtectedRoute';

// Common pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

// Patient pages
import EmergencyRequest from './pages/EmergencyRequest';
import LiveTracking from './pages/LiveTracking';
import BookingHistory from './pages/BookingHistory';
import Hospitals from './pages/Hospitals';
import Ambulances from './pages/Ambulances';

// Driver page
import DriverDashboard from './pages/DriverDashboard';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageHospitals from './pages/admin/ManageHospitals';
import ManageAmbulances from './pages/admin/ManageAmbulances';
import ManageDrivers from './pages/admin/ManageDrivers';
import ManagePatients from './pages/admin/ManagePatients';

// Hospital Manager page
import HospitalManagerDashboard from './pages/HospitalManagerDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Common login and registration */}
          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          {/* Default route */}
          <Route
            path="/"
            element={<RoleHomeRedirect />}
          />

          {/* General dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['PATIENT']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Patient emergency request */}
          <Route
            path="/emergency"
            element={
              <ProtectedRoute roles={['PATIENT']}>
                <EmergencyRequest />
              </ProtectedRoute>
            }
          />

          {/* Live tracking - preserve original access */}
          <Route
            path="/tracking"
            element={
              <ProtectedRoute>
                <LiveTracking />
              </ProtectedRoute>
            }
          />

          {/* Patient booking history */}
          <Route
            path="/history"
            element={
              <ProtectedRoute roles={['PATIENT']}>
                <BookingHistory />
              </ProtectedRoute>
            }
          />

          {/* Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* View-only hospital directory */}
          <Route
            path="/hospitals"
            element={
              <ProtectedRoute>
                <Hospitals />
              </ProtectedRoute>
            }
          />

          {/* Ambulance directory */}
          <Route
            path="/ambulances"
            element={
              <ProtectedRoute>
                <Ambulances />
              </ProtectedRoute>
            }
          />

          {/* Driver dashboard */}
          <Route
            path="/driver"
            element={
              <ProtectedRoute roles={['DRIVER']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin-only hospital management */}
          <Route
            path="/admin/hospitals"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <ManageHospitals />
              </ProtectedRoute>
            }
          />

          <Route path="/admin/ambulances" element={<ProtectedRoute roles={['ADMIN']}><ManageAmbulances /></ProtectedRoute>} />
          <Route path="/admin/drivers" element={<ProtectedRoute roles={['ADMIN']}><ManageDrivers /></ProtectedRoute>} />
          <Route path="/admin/patients" element={<ProtectedRoute roles={['ADMIN']}><ManagePatients /></ProtectedRoute>} />

          {/* Hospital Manager dashboard */}
          <Route
            path="/hospital-manager"
            element={
              <ProtectedRoute roles={['HOSPITAL_MANAGER']}>
                <HospitalManagerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Unknown routes */}
          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
function RoleHomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={getHomeRouteForRole(user?.role)} replace />;
}
