import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const initialRegistration = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: 'DRIVER',
  licenseNumber: '',
  licenseType: 'ALS',
};

export default function Login() {
  const [mode, setMode] = useState('patient');
  const [staffPage, setStaffPage] = useState('login');

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const [registration, setRegistration] = useState(
    initialRegistration
  );

  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  function navigateByRole(user) {
    const role = String(user?.role || '').toUpperCase();

    if (role === 'ADMIN') {
      navigate('/admin', { replace: true });
    } else if (role === 'DRIVER') {
      navigate('/driver', { replace: true });
    } else if (role === 'HOSPITAL_MANAGER') {
      navigate('/hospital-manager', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setStaffPage('login');
    setErr('');
    setSuccess('');
    setOtp('');
    setOtpRequested(false);
  }

  function changeStaffPage(nextPage) {
    setStaffPage(nextPage);
    setErr('');
    setSuccess('');
  }

  async function handlePasswordLogin(event) {
    event.preventDefault();

    setErr('');
    setSuccess('');
    setLoading(true);

    try {
      const user = await login(credentials);
      navigateByRole(user);
    } catch (error) {
      setErr(
        error.response?.data?.message ||
          'Login failed. Check your email and password.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOtp(event) {
    event.preventDefault();

    setErr('');
    setSuccess('');

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setErr('Enter a valid 10-digit Indian mobile number.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/otp/request', {
        phone: mobile,
      });

      setOtpRequested(true);
      setOtp('');

      setSuccess(
        'OTP requested. SMS delivery is not configured; check the backend console for local testing.'
      );
    } catch (error) {
      setErr(
        error.response?.data?.message ||
          'Unable to request OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();

    setErr('');
    setSuccess('');

    if (!/^\d{4}$/.test(otp)) {
      setErr('Enter the 4-digit OTP.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/otp/verify', {
        phone: mobile,
        otp,
      });

      const user = loginWithOtp(response.data);
      navigateByRole(user);
    } catch (error) {
      setErr(
        error.response?.data?.message ||
          'Invalid or expired OTP. Please try again.'
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

    if (!registration.email.trim()) {
      setErr('Enter your email address.');
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
      !['DRIVER', 'HOSPITAL_MANAGER'].includes(registration.role)
    ) {
      setErr(
        'Admin accounts must be created through an authorized process.'
      );
      return;
    }

    if (
      registration.role === 'DRIVER' &&
      !registration.licenseNumber.trim()
    ) {
      setErr('Enter your driver license number.');
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

      if (registration.role === 'DRIVER') {
        payload.licenseNumber = registration.licenseNumber.trim();
        payload.licenseType = registration.licenseType;
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
          ? 'Registration successful. Hospital Manager access may require approval and hospital assignment.'
          : 'Registration successful. You can now log in.'
      );
    } catch (error) {
      setErr(
        error.response?.data?.message ||
          'Registration failed. Please check the backend logs.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <div className="authBox">
        <div className="brand">
          🚑 Rapid<span>Rescue</span>
        </div>

        <h1>
          {mode === 'patient'
            ? 'Emergency care, made simple'
            : staffPage === 'register'
              ? 'Create an account'
              : 'Welcome back'}
        </h1>

        <p className="muted">
          {mode === 'patient'
            ? 'Sign in to request emergency ambulance assistance.'
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
            Admin / Driver / Hospital Manager
          </button>
        </div>

        {mode === 'patient' && (
          <form
            onSubmit={
              otpRequested ? handleVerifyOtp : handleRequestOtp
            }
          >
            <label htmlFor="mobile">Mobile number</label>

            <div
              style={{
                display: 'flex',
                gap: 8,
                margin: '8px 0 16px',
              }}
            >
              <span
                style={{
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  background: '#f7f7f7',
                }}
              >
                🇮🇳 +91
              </span>

              <input
                id="mobile"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={mobile}
                onChange={(event) => {
                  setMobile(
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 10)
                  );
                  setOtp('');
                  setOtpRequested(false);
                  setErr('');
                  setSuccess('');
                }}
                autoComplete="tel-national"
                inputMode="numeric"
                maxLength={10}
                required
                disabled={otpRequested || loading}
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>

            {otpRequested && (
              <>
                <label htmlFor="otp">Enter 4-digit OTP</label>

                <input
                  id="otp"
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 4)
                    )
                  }
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="one-time-code"
                  required
                  disabled={loading}
                />
              </>
            )}

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
              {loading
                ? 'Please wait...'
                : otpRequested
                  ? 'Verify OTP'
                  : 'Get OTP'}
            </button>

            {otpRequested && (
              <button
                type="button"
                className="wide"
                style={{ marginTop: 10 }}
                disabled={loading}
                onClick={() => {
                  setOtpRequested(false);
                  setOtp('');
                  setErr('');
                  setSuccess('');
                }}
              >
                Change mobile number
              </button>
            )}

            <p className="hint">
              SMS delivery is not configured. For local testing, check
              the IntelliJ console for the OTP.
            </p>
          </form>
        )}

        {mode === 'staff' && staffPage === 'login' && (
          <form onSubmit={handlePasswordLogin}>
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="username"
              value={credentials.email}
              onChange={(event) =>
                setCredentials({
                  ...credentials,
                  email: event.target.value,
                })
              }
              required
              disabled={loading}
            />

            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials({
                  ...credentials,
                  password: event.target.value,
                })
              }
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
              onClick={() => changeStaffPage('register')}
              disabled={loading}
            >
              Create Account
            </button>

            <p className="hint">
              Admin accounts must be created through an authorized process.
            </p>
          </form>
        )}

        {mode === 'staff' && staffPage === 'register' && (
          <form onSubmit={handleRegistration}>
            <label htmlFor="fullName">Full name</label>

            <input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={registration.fullName}
              onChange={(event) =>
                setRegistration({
                  ...registration,
                  fullName: event.target.value,
                })
              }
              required
              disabled={loading}
            />

            <label htmlFor="registerEmail">Email</label>

            <input
              id="registerEmail"
              type="email"
              placeholder="Enter your email"
              value={registration.email}
              onChange={(event) =>
                setRegistration({
                  ...registration,
                  email: event.target.value,
                })
              }
              required
              disabled={loading}
            />

            <label htmlFor="registerPhone">Mobile number</label>

            <input
              id="registerPhone"
              type="tel"
              placeholder="Enter 10-digit mobile number"
              value={registration.phone}
              onChange={(event) =>
                setRegistration({
                  ...registration,
                  phone: event.target.value
                    .replace(/\D/g, '')
                    .slice(0, 10),
                })
              }
              inputMode="numeric"
              maxLength={10}
              required
              disabled={loading}
            />

            <label htmlFor="registerRole">Register as</label>

            <select
              id="registerRole"
              value={registration.role}
              onChange={(event) => {
                setRegistration({
                  ...registration,
                  role: event.target.value,
                });
                setErr('');
                setSuccess('');
              }}
              required
              disabled={loading}
            >
              <option value="DRIVER">Driver</option>
              <option value="HOSPITAL_MANAGER">
                Hospital Manager
              </option>
              <option value="ADMIN" disabled>
                Admin (authorization required)
              </option>
            </select>

            {registration.role === 'DRIVER' && (
              <>
                <label htmlFor="licenseNumber">License number</label>

                <input
                  id="licenseNumber"
                  type="text"
                  placeholder="Enter your driver license number"
                  value={registration.licenseNumber}
                  onChange={(event) =>
                    setRegistration({
                      ...registration,
                      licenseNumber: event.target.value,
                    })
                  }
                  required
                  disabled={loading}
                />

                <label htmlFor="licenseType">License type</label>

                <select
                  id="licenseType"
                  value={registration.licenseType}
                  onChange={(event) =>
                    setRegistration({
                      ...registration,
                      licenseType: event.target.value,
                    })
                  }
                  required
                  disabled={loading}
                >
                  <option value="ALS">ALS</option>
                  <option value="BLS">BLS</option>
                </select>
              </>
            )}

            <label htmlFor="registerPassword">Password</label>

            <input
              id="registerPassword"
              type="password"
              placeholder="At least 8 characters"
              value={registration.password}
              onChange={(event) =>
                setRegistration({
                  ...registration,
                  password: event.target.value,
                })
              }
              minLength={8}
              required
              disabled={loading}
            />

            <label htmlFor="confirmPassword">Confirm password</label>

            <input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={registration.confirmPassword}
              onChange={(event) =>
                setRegistration({
                  ...registration,
                  confirmPassword: event.target.value,
                })
              }
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

            <p className="hint">
              Hospital Manager registration may require administrator
              approval and hospital assignment.
            </p>

            <button
              type="button"
              className="wide"
              style={{ marginTop: 10 }}
              onClick={() => changeStaffPage('login')}
              disabled={loading}
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}