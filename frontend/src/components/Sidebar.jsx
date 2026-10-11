import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForRole } from './ProtectedRoute';

export default function Sidebar() {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sideTitle">{role === 'ADMIN' ? 'Administration' : role === 'HOSPITAL_MANAGER' ? 'Hospital Control' : role === 'DRIVER' ? 'Driver Control' : 'Patient Control'}</div>

      <NavLink to={getHomeRouteForRole(role)}>Overview</NavLink>

      {role === 'PATIENT' && <>
        <NavLink to="/emergency">Request Ambulance</NavLink>
        <NavLink to="/history">Booking History</NavLink>
        <NavLink to="/tracking">Live Tracking</NavLink>
        <NavLink to="/hospitals">Hospitals</NavLink>
      </>}

      {role === 'DRIVER' && <>
        <NavLink to="/tracking">Live Tracking</NavLink>
        <NavLink to="/ambulances">Ambulances</NavLink>
      </>}

      {role === 'HOSPITAL_MANAGER' && <NavLink to="/hospitals">Hospital Directory</NavLink>}

      {role === 'ADMIN' && <>
        <NavLink to="/admin/hospitals">Manage Hospitals</NavLink>
        <NavLink to="/admin/ambulances">Manage Ambulances</NavLink>
        <NavLink to="/admin/drivers">Manage Drivers</NavLink>
        <NavLink to="/admin/patients">Manage Patients</NavLink>
        <NavLink to="/hospitals">Hospital Directory</NavLink>
      </>}

      <NavLink to="/profile">Profile</NavLink>
    </aside>
  );
}
