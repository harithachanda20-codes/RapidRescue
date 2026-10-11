import { useCallback, useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

export default function ManagePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPatients = useCallback(async () => {
    try {
      const response = await api.get('/admin/users');
      const users = Array.isArray(response.data) ? response.data : [];
      setPatients(users.filter((user) => String(user.role).toUpperCase() === 'PATIENT'));
      setError('');
    } catch (err) {
      setError(err.response?.status === 403 ? 'Backend rejected this admin request (403). Sign out, then sign in with a database account whose role is ADMIN. The menu can remain visible if old browser login data is stale; do not bypass backend security.' : (err.response?.data?.message || 'Unable to load patient accounts.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  async function toggleActive(patient) {
    setBusyId(patient.id);
    setError('');
    setMessage('');
    try {
      const response = await api.post(`/admin/users/${patient.id}/toggle-active`);
      setMessage(`${patient.fullName}'s account is now ${response.data.active ? 'active' : 'inactive'}.`);
      await loadPatients();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update patient account.');
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
        <h1>Manage Patients</h1>
        <p className="muted">Patient accounts are read from the backend. Account status changes are saved to the database.</p>
        {error && <div className="alert danger" role="alert">{error}</div>}
        {message && <div className="alert" role="status">{message}</div>}
        <section className="card">
          {loading ? <p>Loading patient accounts…</p> : patients.length === 0 ? <p>No patient accounts were returned by the server.</p> :
            <div className="tableWrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Created</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{patients.map((patient) => <tr key={patient.id}>
                <td>{patient.fullName || '—'}</td><td>{patient.email || '—'}</td><td>{patient.phone || '—'}</td>
                <td>{patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : '—'}</td>
                <td>{patient.active ? 'Active' : 'Inactive'}</td>
                <td><button type="button" disabled={busyId === patient.id} onClick={() => toggleActive(patient)}>{patient.active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>)}</tbody></table></div>}
        </section>
      </main>
    </div>
  </>;
}
