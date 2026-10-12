import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const initialRegistration = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'PATIENT',
  licenseNumber: '',
  licenseType: 'ALS',
  adminRegistrationCode: '',
};

const initialCredentials = {
  email: '',
  password: '',
};

export default function Login() {
  const [mode, setMode] = useState('patient');
  const [staffPage, setStaffPage] = useState('login');

  const [credentials, setCredentials] = useState(initialCredentials);
  const [registration, setRegistration] = useState(initialRegistration);

  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  function navigateByRole(user) {
    const role = String(user?.role || '').toUpperCase();

    if (role === 'ADMIN') {
      navigate('/admin', { replace: true });
    } else if (role === 'DRIVER') {
      navigate('/driver', { replace: true });
    } else if (role === 'HOSPITAL_MANAGER') {
      navigate('/hospital-manager', { replace: true });
    } else if (role === 'PATIENT') {
      navigate('/dashboard', { replace: true });
    } else {
      setErr('Your account role is not recognized.');
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setStaffPage('login');
    setErr('');
    setSuccess('');
  }

  function changeStaffPage(nextPage) {
    setStaffPage(nextPage);
    setErr('');
    setSuccess('');
  }

  function updateCredentials(event) {
    const { name, value } = event.target;

    setCredentials((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErr('');
    setSuccess('');
  }

  function updateRegistration(event) {
    const { name, value } = event.target;

    setRegistration((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErr('');
    setSuccess('');
  }

  async function handlePasswordLogin(event) {
    event.preventDefault();

    setErr('');
    setSuccess('');
    setLoading(true);

    try {
      const user = await login({
        email: credentials.email.trim(),
        password: credentials.password,
      });

      navigateByRole(user);
    } catch (error) {
      setErr(
        error.response?.data?.message ||
          'Login failed. Please check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegistration(event) {
    event.preventDefault();

    setErr('');
    setSuccess('');

    if (!registration.fullName.trim()) {
      setErr('Enter your full name.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registration.email.trim())) {
      setErr('Enter a valid email address.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(registration.phone)) {
      setErr('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (registration.password.length < 8) {
      setErr('Password must contain at least 8 characters.');
      return;
    }

    if (registration.password !== registration.confirmPassword) {
      setErr('Passwords do not match.');
      return;
    }

    if (
      registration.role === 'DRIVER' &&
      !registration.licenseNumber.trim()
    ) {
      setErr('Enter your driver licence number.');
      return;
    }

    if (
      registration.role === 'DRIVER' &&
      !registration.licenseType.trim()
    ) {
      setErr('Select your licence type.');
      return;
    }

    if (
      registration.role === 'ADMIN' &&
      !registration.adminRegistrationCode.trim()
    ) {
      setErr('Enter the Admin authorization code.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullName: registration.fullName.trim(),
        email: registration.email.trim(),
        phone: registration.phone,
        password: registration.password,
        role: registration.role,
      };

      if (registration.role === 'PATIENT') {
        // Patient profile fields are optional in the current backend.
      }

      if (registration.role === 'DRIVER') {
        payload.licenseNumber = registration.licenseNumber.trim();
        payload.licenseType = registration.licenseType;
      }

      if (registration.role === 'ADMIN') {
        payload.adminRegistrationCode =
          registration.adminRegistrationCode.trim();
      }

      await api.post('/auth/register', payload);

      setCredentials({
        email: registration.email.trim(),
        password: '',
      });

      setRegistration(initialRegistration);
      setStaffPage('login');

      setSuccess(
        registration.role === 'HOSPITAL_MANAGER'
          ? 'Registration successful. Hospital assignment or approval may be required.'
          : registration.role === 'ADMIN'
            ? 'Admin registration successful. You can now log in.'
            : 'Registration successful. Please log in using your email and password.'
      );
    } catch (error) {
      setErr(
        error.response?.data?.message ||
          'Registration failed. Check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  function renderRegistrationForm() {
    return (
      <form onSubmit={handleRegistration}>
        <label htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          placeholder="Enter your full name"
          value={registration.fullName}
          onChange={updateRegistration}
          autoComplete="name"
          required
          disabled={loading}
        />

        <label htmlFor="registerEmail">Email address</label>
        <input
          id="registerEmail"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={registration.email}
          onChange={updateRegistration}
          autoComplete="email"
          required
          disabled={loading}
        />

        <label htmlFor="registerPhone">Mobile number</label>
        <input
          id="registerPhone"
          name="phone"
          type="tel"
          placeholder="Enter 10-digit mobile number"
          value={registration.phone}
          onChange={(event) => {
            const phone = event.target.value.replace(/\D/g, '').slice(0, 10);

            setRegistration((previous) => ({
              ...previous,
              phone,
            }));

            setErr('');
          }}
          autoComplete="tel-national"
          inputMode="numeric"
          maxLength={10}
          required
          disabled={loading}
        />

        {mode === 'staff' && (
          <>
            <label htmlFor="registerRole">Register as</label>
            <select
              id="registerRole"
              name="role"
              value={registration.role}
              onChange={(event) => {
                setRegistration((previous) => ({
                  ...previous,
                  role: event.target.value,
                }));

                setErr('');
              }}
              required
              disabled={loading}
            >
              <option value="DRIVER">Driver</option>
              <option value="HOSPITAL_MANAGER">Hospital Manager</option>
              <option value="ADMIN">Admin — authorization required</option>
            </select>
          </>
        )}

        {registration.role === 'DRIVER' && mode === 'staff' && (
          <>
            <label htmlFor="licenseNumber">Licence number</label>
            <input
              id="licenseNumber"
              name="licenseNumber"
              type="text"
              placeholder="Enter your driver licence number"
              value={registration.licenseNumber}
              onChange={updateRegistration}
              required
              disabled={loading}
            />

            <label htmlFor="licenseType">Licence type</label>
            <select
              id="licenseType"
              name="licenseType"
              value={registration.licenseType}
              onChange={updateRegistration}
              required
              disabled={loading}
            >
              <option value="ALS">ALS</option>
              <option value="BLS">BLS</option>
            </select>
          </>
        )}

        {registration.role === 'ADMIN' && mode === 'staff' && (
          <>
            <label htmlFor="adminRegistrationCode">
              Admin authorization code
            </label>
            <input
              id="adminRegistrationCode"
              name="adminRegistrationCode"
              type="password"
              placeholder="Enter authorization code"
              value={registration.adminRegistrationCode}
              onChange={updateRegistration}
              autoComplete="off"
              required
              disabled={loading}
            />
          </>
        )}

        <label htmlFor="registerPassword">Password</label>
        <input
          id="registerPassword"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={registration.password}
          onChange={updateRegistration}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={loading}
        />

        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          value={registration.confirmPassword}
          onChange={updateRegistration}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={loading}
        />

        {err && <div className="alert danger">{err}</div>}

        {success && (
          <div className="alert" role="status">
            {success}
          </div>
        )}

        <button
          type="submit"
          className="primary wide"
          disabled={loading}
        >
          {loading ? 'Please wait...' : 'Create Account'}
        </button>

        <button
          type="button"
          className="wide"
          style={{ marginTop: 10 }}
          onClick={() => {
            if (mode === 'patient') {
              setStaffPage('login');
            } else {
              changeStaffPage('login');
            }
          }}
          disabled={loading}
        >
          Back to Login
        </button>

        {mode === 'staff' &&
          registration.role === 'HOSPITAL_MANAGER' && (
            <p className="hint">
              Hospital Manager registration may require approval and hospital
              assignment.
            </p>
          )}

        {mode === 'staff' && registration.role === 'ADMIN' && (
          <p className="hint">
            Admin registration requires the secret code configured by the
            system administrator. Registration is allowed only while no Admin
            account exists.
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="auth">
      <div className="authBox">
        <div className="brand">
          🚑 Rapid<span>Rescue</span>
        </div>

        <h1>
          {mode === 'patient'
            ? staffPage === 'register'
              ? 'Create your Patient account'
              : 'Emergency care, made simple'
            : staffPage === 'register'
              ? 'Create an account'
              : 'Welcome back'}
        </h1>

        <p className="muted">
          {mode === 'patient'
            ? staffPage === 'register'
              ? 'Register to access emergency ambulance assistance.'
              : 'Sign in to request emergency ambulance assistance.'
            : staffPage === 'register'
              ? 'Join the RapidRescue response network.'
              : 'Sign in to the RapidRescue response network.'}
        </p>

        <div
          style={{
            display: 'flex',
            gap: 10,
            margin: '22px 0',
          }}
        >
          <button
            type="button"
            className={mode === 'patient' ? 'primary wide' : 'wide'}
            onClick={() => changeMode('patient')}
          >
            Patient
          </button>

          <button
            type="button"
            className={mode === 'staff' ? 'primary wide' : 'wide'}
            onClick={() => changeMode('staff')}
          >
            Staff Login
          </button>
        </div>

        {mode === 'patient' && staffPage === 'login' && (
          <form onSubmit={handlePasswordLogin}>
            <label htmlFor="patientEmail">Email address</label>
            <input
              id="patientEmail"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={credentials.email}
              onChange={updateCredentials}
              autoComplete="username"
              required
              disabled={loading}
            />

            <label htmlFor="patientPassword">Password</label>
            <input
              id="patientPassword"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={credentials.password}
              onChange={updateCredentials}
              autoComplete="current-password"
              required
              disabled={loading}
            />

            {err && <div className="alert danger">{err}</div>}

            {success && (
              <div className="alert" role="status">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="primary wide"
              disabled={loading}
            >
              {loading ? 'Please wait...' : 'Login'}
            </button>

            <button
              type="button"
              className="wide"
              style={{ marginTop: 10 }}
              onClick={() => {
                setRegistration({
                  ...initialRegistration,
                  role: 'PATIENT',
                });
                setErr('');
                setSuccess('');
                setStaffPage('register');
              }}
              disabled={loading}
            >
              Create Patient Account
            </button>
          </form>
        )}

        {mode === 'patient' && staffPage === 'register' &&
          renderRegistrationForm()}

        {mode === 'staff' && staffPage === 'login' && (
          <form onSubmit={handlePasswordLogin}>
            <label htmlFor="staffEmail">Email address</label>
            <input
              id="staffEmail"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={credentials.email}
              onChange={updateCredentials}
              autoComplete="username"
              required
              disabled={loading}
            />

            <label htmlFor="staffPassword">Password</label>
            <input
              id="staffPassword"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={credentials.password}
              onChange={updateCredentials}
              autoComplete="current-password"
              required
              disabled={loading}
            />

            {err && <div className="alert danger">{err}</div>}

            {success && (
              <div className="alert" role="status">
                {success}
              </div>
            )}

            <button
              type="submit"
              className="primary wide"
              disabled={loading}
            >
              {loading ? 'Please wait...' : 'Login'}
            </button>

            <button
              type="button"
              className="wide"
              style={{ marginTop: 10 }}
              onClick={() => {
                setRegistration(initialRegistration);
                changeStaffPage('register');
              }}
              disabled={loading}
            >
              Create Staff Account
            </button>
          </form>
        )}

        {mode === 'staff' && staffPage === 'register' &&
          renderRegistrationForm()}
      </div>
    </div>
  );
}