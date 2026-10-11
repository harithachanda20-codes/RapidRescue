import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForRole } from './ProtectedRoute';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || '').toUpperCase();

  const signOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="nav">
      <Link className="brand" to={user ? getHomeRouteForRole(role) : '/'}>
        🚑 Rapid<span>Rescue</span>
      </Link>

      <nav aria-label="Main navigation">
        {user && role === 'PATIENT' && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/emergency">Emergency Request</Link>
            <Link to="/tracking">Live Tracking</Link>
            <Link to="/history">My History</Link>
            <Link to="/hospitals">Hospitals</Link>
          </>
        )}
        {user && role === 'DRIVER' && (
          <>
            <Link to="/driver">Driver Dashboard</Link>
            <Link to="/tracking">Live Tracking</Link>
          </>
        )}
        {user && role === 'ADMIN' && (
          <>
            <Link to="/admin">Admin Dashboard</Link>
            <Link to="/admin/hospitals">Hospitals</Link>
            <Link to="/admin/ambulances">Ambulances</Link>
            <Link to="/admin/drivers">Drivers</Link>
            <Link to="/admin/patients">Patients</Link>
          </>
        )}
        {user && role === 'HOSPITAL_MANAGER' && (
          <Link to="/hospital-manager">Manager Dashboard</Link>
        )}
        {user && <Link to="/profile">My Profile</Link>}
      </nav>

      <div>
        {user ? (
          <button type="button" className="ghost" onClick={signOut}>Logout</button>
        ) : (
          <>
            <Link className="ghost linkbtn" to="/login">Login</Link>
            <Link className="primary linkbtn" to="/register">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}
