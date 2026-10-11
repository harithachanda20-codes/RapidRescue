import { useCallback, useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

export default function ManageDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDrivers = useCallback(async () => {
    try {
      const response = await api.get('/admin/drivers');
      setDrivers(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.status === 403 ? 'Backend rejected this admin request (403). Sign out, then sign in with a database account whose role is ADMIN. The menu can remain visible if old browser login data is stale; do not bypass backend security.' : (err.response?.data?.message || 'Unable to load drivers.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  async function deactivateAccount(driver) {
    const userId = driver.user?.id;
    if (!userId) { setError('This driver record has no linked user account, so it cannot be deactivated from this page.'); return; }
    if (!window.confirm(`Deactivate the account for ${driver.user?.fullName || `Driver #${driver.id}`}?`)) return;
    setBusyId(driver.id); setError(''); setMessage('');
    try {
      await api.post(`/admin/users/${userId}/toggle-active`);
      setMessage('Driver account status updated.');
      await loadDrivers();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update driver account status.');
    } finally { setBusyId(null); }
  }

  async function updateStatus(driver, field, value) {
    setBusyId(driver.id);
    setError('');
    setMessage('');
    const online = field === 'online' ? value : Boolean(driver.online);
    const available = field === 'available' ? value : Boolean(driver.available);
    try {
      await api.post('/admin/driver/status', null, {
        params: { id: driver.id, online, available },
      });
      setMessage(`Driver ${driver.user?.fullName || `#${driver.id}`} updated.`);
      await loadDrivers();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update driver status.');
    } finally {
      setBusyId(null);
    }
  }

  return <>
    <Navbar />
    <div className="layout">
      <Sidebar />
      <main className="content">
        <div className="eyebrow">Administration</div>
        <h1>Manage Drivers</h1>
        <p className="muted">Review driver accounts and update dispatch availability.</p>
        {error && <div className="alert danger" role="alert">{error}</div>}
        {message && <div className="alert" role="status">{message}</div>}
        <section className="card">
          {loading ? <p>Loading drivers…</p> : drivers.length === 0 ? <p>No driver records were returned by the server.</p> :
            <div className="tableWrap"><table><thead><tr><th>Driver</th><th>Contact</th><th>License</th><th>Online</th><th>Available</th><th>Actions</th></tr></thead>
              <tbody>{drivers.map((driver) => <tr key={driver.id}>
                <td>{driver.user?.fullName || `Driver #${driver.id}`}</td>
                <td>{driver.user?.phone || driver.user?.email || '—'}</td>
                <td>{driver.licenseNumber || '—'}</td>
                <td>{driver.online ? 'Online' : 'Offline'}</td>
                <td>{driver.available ? 'Available' : 'Busy / unavailable'}</td>
                <td>
                  <button type="button" disabled={busyId === driver.id} onClick={() => updateStatus(driver, 'online', !driver.online)}>{driver.online ? 'Set offline' : 'Set online'}</button>{' '}
                  <button type="button" disabled={busyId === driver.id || !driver.online} onClick={() => updateStatus(driver, 'available', !driver.available)}>{driver.available ? 'Mark busy' : 'Mark available'}</button>{' '}<button type="button" disabled={busyId === driver.id} onClick={() => deactivateAccount(driver)}>Deactivate account</button>
                </td>
              </tr>)}</tbody></table></div>}
        </section>
      </main>
    </div>
  </>;
}
