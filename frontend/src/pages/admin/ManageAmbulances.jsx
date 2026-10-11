import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import api from '../../services/api';

const emptyForm = {
  ambulanceNumber: '',
  type: 'ALS',
  emergencyAvailable: true,
  status: 'AVAILABLE',
  latitude: '',
  longitude: '',
};

export default function ManageAmbulances() {
  const [ambulances, setAmbulances] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadAmbulances() {
    try {
      setLoading(true);
      const res = await api.get('/ambulances');
      setAmbulances(Array.isArray(res.data) ? res.data : []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load ambulances.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAmbulances();
  }, []);

  function handleChange(e) {
    const { name, value, checked, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError('');
    setSuccess('');
  }

  function editAmbulance(amb) {
    setEditingId(amb.id);
    setForm({
      ambulanceNumber: amb.ambulanceNumber || '',
      type: amb.type || 'ALS',
      emergencyAvailable: Boolean(amb.emergencyAvailable),
      status: amb.status || 'AVAILABLE',
      latitude: amb.latitude == null ? '' : String(amb.latitude),
      longitude: amb.longitude == null ? '' : String(amb.longitude),
    });
    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.ambulanceNumber.trim()) {
      setError('Ambulance number is required (e.g. RR-102).');
      return;
    }

    const payload = {
      ambulanceNumber: form.ambulanceNumber.trim(),
      type: form.type,
      emergencyAvailable: form.emergencyAvailable,
      status: form.status,
      latitude: form.latitude === '' ? null : Number(form.latitude),
      longitude: form.longitude === '' ? null : Number(form.longitude),
    };
    if ((payload.latitude == null) !== (payload.longitude == null)) {
      setError('Enter both latitude and longitude, or leave both blank.');
      return;
    }
    if (payload.latitude != null && (payload.latitude < -90 || payload.latitude > 90 || payload.longitude < -180 || payload.longitude > 180)) {
      setError('Enter valid GPS coordinates (latitude −90 to 90, longitude −180 to 180).');
      return;
    }

    try {
      setSaving(true);
      if (editingId !== null) {
        await api.put(`/ambulances/${editingId}`, payload);
        setSuccess('Ambulance updated successfully.');
      } else {
        await api.post('/ambulances', payload);
        setSuccess('Ambulance added to fleet successfully.');
      }
      resetForm();
      await loadAmbulances();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save ambulance.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Navbar />

      <div className="layout">
        <Sidebar />

        <main className="content">
          <div className="eyebrow">Fleet Management</div>
          <h1>Manage Ambulances</h1>
          <p className="muted">
            Add new ambulances to the emergency fleet, update vehicle status, and configure availability.
          </p>

          {error && <div className="alert danger" role="alert">{error}</div>}
          {success && <div className="alert" role="status" style={{ background: '#dcfce7', color: '#166534' }}>{success}</div>}

          {/* Form */}
          <section className="card" style={{ marginBottom: 24 }}>
            <h2>{editingId !== null ? '✏️ Edit Ambulance' : '➕ Add New Ambulance'}</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <label>
                  Vehicle / Ambulance Number *
                  <input
                    name="ambulanceNumber"
                    value={form.ambulanceNumber}
                    onChange={handleChange}
                    placeholder="e.g. RR-102"
                    required
                    style={inputStyle}
                  />
                </label>

                <label>
                  Ambulance Type
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="ALS">ALS (Advanced Life Support)</option>
                    <option value="BLS">BLS (Basic Life Support)</option>
                  </select>
                </label>

                <label>
                  Initial Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    style={inputStyle}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="BUSY">BUSY</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </label>

                <label>
                  Base Latitude
                  <input
                    name="latitude"
                    type="number"
                    step="any"
                    value={form.latitude}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </label>

                <label>
                  Base Longitude
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    value={form.longitude}
                    onChange={handleChange}
                    style={inputStyle}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
                <input
                  type="checkbox"
                  name="emergencyAvailable"
                  checked={form.emergencyAvailable}
                  onChange={handleChange}
                />
                Accepting emergency dispatch requests
              </label>

              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Saving...' : editingId !== null ? 'Update Ambulance' : 'Add Ambulance'}
              </button>

              {editingId !== null && (
                <button type="button" onClick={resetForm} style={{ marginLeft: 10 }}>
                  Cancel
                </button>
              )}
            </form>
          </section>

          {/* List */}
          <section>
            <h2>Fleet Directory ({ambulances.length})</h2>
            {loading ? (
              <div className="card">Loading fleet...</div>
            ) : ambulances.length === 0 ? (
              <div className="card">No ambulances registered yet.</div>
            ) : (
              <div className="tableWrap" style={{ marginTop: 14 }}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Vehicle Number</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Emergency Ready</th>
                      <th>Assigned Driver</th>
                      <th>Location</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ambulances.map((amb) => (
                      <tr key={amb.id}>
                        <td><b>#{amb.id}</b></td>
                        <td><strong>{amb.ambulanceNumber}</strong></td>
                        <td><span className="badge">{amb.type}</span></td>
                        <td>
                          <span className={`badge ${amb.status === 'AVAILABLE' ? 'success' : amb.status === 'BUSY' ? 'critical' : ''}`}>
                            {amb.status}
                          </span>
                        </td>
                        <td>
                          {amb.emergencyAvailable ? (
                            <span style={{ color: '#166534', fontWeight: 600 }}>🟢 Ready</span>
                          ) : (
                            <span style={{ color: '#b91c1c', fontWeight: 600 }}>🔴 Offline</span>
                          )}
                        </td>
                        <td>
                          {amb.driverName ? `${amb.driverName} (📞 ${amb.driverPhone || '—'})` : '— Unassigned —'}
                        </td>
                        <td>
                          {amb.latitude && amb.longitude
                            ? `${Number(amb.latitude).toFixed(4)}, ${Number(amb.longitude).toFixed(4)}`
                            : '—'}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => editAmbulance(amb)}
                            style={{ padding: '6px 12px', fontSize: 13 }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: 10,
  marginTop: 6,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
};