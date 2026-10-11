import { useEffect, useState } from 'react';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';
import Map from '../../components/Map';
import api from '../../services/api';

const emptyHospital = {
  name: '',
  address: '',
  phone: '',
  latitude: '',
  longitude: '',
  emergencyAvailable: true,
  capacity: 10,
};

export default function ManageHospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [managers, setManagers] = useState([]);
  const [managerSelection, setManagerSelection] = useState({});
  const [assigningHospitalId, setAssigningHospitalId] = useState(null);
  const [form, setForm] = useState(emptyHospital);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadHospitals() {
    try {
      setLoading(true);
      const response = await api.get('/hospitals');
      setHospitals(Array.isArray(response.data) ? response.data : []);
      setError('');
      try {
        const usersResponse = await api.get('/admin/managers');
        const availableManagers = Array.isArray(usersResponse.data) ? usersResponse.data : [];
        setManagers(availableManagers);
        setManagerSelection((current) => {
          const next = { ...current };
          for (const hospital of (Array.isArray(response.data) ? response.data : [])) {
            if (hospital.managerId != null && !next[hospital.id]) next[hospital.id] = String(hospital.managerId);
          }
          return next;
        });
      } catch (managerError) {
        setManagers([]);
        setError(managerError.response?.status === 401 || managerError.response?.status === 403
          ? 'Your current backend session is not authorized to manage manager assignments. Sign out completely, then sign in with an account whose role in the database is ADMIN. The hospital directory is read-only until authorization is corrected.'
          : (managerError.response?.data?.message || 'Hospitals loaded, but manager accounts could not be loaded.'));
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Unable to load hospitals.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHospitals();
  }, []);


  async function assignManager(hospital) {
    const managerId = managerSelection[hospital.id];
    if (!managerId) {
      setError('Choose a Hospital Manager before assigning.');
      return;
    }
    setError('');
    setSuccess('');
    setAssigningHospitalId(hospital.id);
    try {
      await api.post(`/admin/hospitals/${hospital.id}/assign-manager`, null, {
        params: { managerId: Number(managerId) },
      });
      const manager = managers.find((item) => String(item.id) === String(managerId));
      setSuccess(`${manager?.fullName || 'Hospital Manager'} assigned to ${hospital.name}.`);
      await loadHospitals();
    } catch (err) {
      setError(err.response?.status === 401 || err.response?.status === 403
        ? 'The backend rejected this assignment. Sign out and sign in with a database account whose role is ADMIN. This is a server-side permission check; refreshing the page alone will not grant access.'
        : (err.response?.data?.message || err.response?.data?.error || 'Unable to assign manager.'));
    } finally {
      setAssigningHospitalId(null);
    }
  }

  async function deleteHospital(hospital) {
    const confirmed = window.confirm(`Deactivate ${hospital.name}? It will be hidden from the active hospital directory, but historical records will be preserved.`);
    if (!confirmed) return;
    setError(''); setSuccess('');
    try {
      await api.delete(`/admin/hospitals/${hospital.id}`);
      setSuccess(`${hospital.name} was deactivated.`);
      if (editingId === hospital.id) resetForm();
      await loadHospitals();
    } catch (err) {
      setError(err.response?.status === 403
        ? 'Access denied. Sign out and sign back in using an account whose backend role is ADMIN.'
        : (err.response?.data?.message || 'Unable to deactivate hospital.'));
    }
  }

  function handleChange(event) {
    const { name, value, checked, type } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function resetForm() {
    setForm(emptyHospital);
    setEditingId(null);
    setError('');
    setSuccess('');
  }

  function editHospital(hospital) {
    setEditingId(hospital.id);

    setForm({
      name: hospital.name || '',
      address: hospital.address || '',
      phone: hospital.phone || '',
      latitude: hospital.latitude ?? '',
      longitude: hospital.longitude ?? '',
      emergencyAvailable: Boolean(hospital.emergencyAvailable),
      capacity: hospital.capacity ?? 10,
    });

    setError('');
    setSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const latitude =
      form.latitude === '' ? null : Number(form.latitude);
    const longitude =
      form.longitude === '' ? null : Number(form.longitude);
    const capacity = Number(form.capacity);

    if (!form.name.trim() || !form.address.trim()) {
      setError('Hospital name and address are required.');
      return;
    }

    if (
      (latitude === null) !== (longitude === null) ||
      (latitude !== null &&
        (!Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90)) ||
      (longitude !== null &&
        (!Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180))
    ) {
      setError('Please enter valid latitude and longitude coordinates.');
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 0) {
      setError('Capacity must be a non-negative whole number.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      latitude,
      longitude,
      emergencyAvailable: form.emergencyAvailable,
      capacity,
    };

    try {
      setSaving(true);

      if (editingId !== null) {
        await api.put(`/hospitals/${editingId}`, payload);
        setSuccess('Hospital updated successfully.');
      } else {
        await api.post('/hospitals', payload);
        setSuccess('Hospital added successfully.');
      }

      resetForm();
      setSuccess(
        editingId !== null
          ? 'Hospital updated successfully.'
          : 'Hospital added successfully.'
      );

      await loadHospitals();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Unable to save hospital. Check the backend API and permissions.'
      );
    } finally {
      setSaving(false);
    }
  }

  const mapPoints = hospitals
    .filter(
      (hospital) =>
        hospital.latitude != null &&
        hospital.longitude != null
    )
    .map((hospital) => ({
      lat: Number(hospital.latitude),
      lng: Number(hospital.longitude),
      title: hospital.name,
      subtitle: hospital.address,
    }));

  return (
    <>
      <Navbar />

      <div className="layout">
        <Sidebar />

        <main className="content">
          <div className="eyebrow">Admin operations</div>
          <h1>Hospital Management</h1>

          <p style={{ color: '#64748b' }}>
            Add hospitals and manage their locations, contact details,
            emergency availability, and capacity.
          </p>

          {error && (
            <div className="card" role="alert" style={{ color: '#b91c1c' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="card" role="status" style={{ color: '#166534' }}>
              {success}
            </div>
          )}

          <section className="card" style={{ marginBottom: 24 }}>
            <h2>
              {editingId !== null ? '✏️ Edit Hospital' : '➕ Add Hospital'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                }}
              >
                <label>
                  Hospital Name *
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Hospital name"
                    style={inputStyle}
                  />
                </label>

                <label>
                  Phone Number
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Contact number"
                    style={inputStyle}
                  />
                </label>

                <label style={{ gridColumn: '1 / -1' }}>
                  Address *
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    required
                    rows={3}
                    placeholder="Hospital address"
                    style={inputStyle}
                  />
                </label>

                <label>
                  Latitude
                  <input
                    type="number"
                    step="any"
                    name="latitude"
                    value={form.latitude}
                    onChange={handleChange}
                    placeholder="17.385"
                    style={inputStyle}
                  />
                </label>

                <label>
                  Longitude
                  <input
                    type="number"
                    step="any"
                    name="longitude"
                    value={form.longitude}
                    onChange={handleChange}
                    placeholder="78.4867"
                    style={inputStyle}
                  />
                </label>

                <label>
                  Hospital Capacity
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="capacity"
                    value={form.capacity}
                    onChange={handleChange}
                    required
                    style={inputStyle}
                  />
                </label>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  margin: '18px 0',
                }}
              >
                <input
                  type="checkbox"
                  name="emergencyAvailable"
                  checked={form.emergencyAvailable}
                  onChange={handleChange}
                />
                Accepting emergency patients
              </label>

              <button type="submit" disabled={saving} style={primaryButton}>
                {saving
                  ? 'Saving...'
                  : editingId !== null
                    ? 'Update Hospital'
                    : 'Add Hospital'}
              </button>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{ ...primaryButton, marginLeft: 10, background: '#64748b' }}
                >
                  Cancel
                </button>
              )}
            </form>
          </section>

          <section>
            <h2>Registered Hospitals</h2>

            {loading ? (
              <div className="card">Loading hospitals...</div>
            ) : hospitals.length === 0 ? (
              <div className="card">No hospitals registered yet.</div>
            ) : (
              <div className="cards">
                {hospitals.map((hospital) => (
                  <article className="card" key={hospital.id}>
                    <h3>🏥 {hospital.name}</h3>
                    <p>{hospital.address}</p>
                    <p>Phone: {hospital.phone || 'Not provided'}</p>
                    <p>Capacity: {hospital.capacity ?? 'Not specified'}</p>
                    <p><strong>Assigned manager:</strong> {hospital.managerName ? `${hospital.managerName} (${hospital.managerEmail || 'no email'})` : 'Not assigned'}</p>
                    <div style={{ marginTop: 12 }}>
                      <label style={{ display: 'block', fontWeight: 600 }}>Assign Hospital Manager</label>
                      <select
                        value={managerSelection[hospital.id] || ''}
                        onChange={(event) => setManagerSelection((current) => ({ ...current, [hospital.id]: event.target.value }))}
                        style={{ ...inputStyle, background: '#fff' }}
                      >
                        <option value=''>Select a manager account</option>
                        {managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>{manager.fullName} — {manager.email}</option>
                        ))}
                      </select>
                      {managers.length === 0 && <p style={{ color: '#b45309' }}>No Hospital Manager accounts found. Register a Hospital Manager account first, then reload this page.</p>}
                      <button type="button" disabled={assigningHospitalId === hospital.id || !managerSelection[hospital.id]} onClick={() => assignManager(hospital)} style={{ ...primaryButton, marginTop: 8 }}>
                        {assigningHospitalId === hospital.id ? 'Assigning…' : 'Assign Manager'}
                      </button>
                    </div>

                    <span className="badge">
                      {hospital.emergencyAvailable
                        ? '🟢 Accepting Emergencies'
                        : '🔴 Unavailable'}
                    </span>

                    <div className="hospital-card-actions">
                      <button
                        className="hospital-action-button hospital-action-edit"
                        type="button"
                        onClick={() => editHospital(hospital)}
                      >
                        <span aria-hidden="true">✎</span> Edit details
                      </button>
                      <button
                        className="hospital-action-button hospital-action-deactivate"
                        type="button"
                        onClick={() => deleteHospital(hospital)}
                        aria-label={`Deactivate ${hospital.name}`}
                      >
                        <span aria-hidden="true">⏻</span> Deactivate
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="card" style={{ marginTop: 24 }}>
            <h2>📍 Hospital Locations</h2>
            {mapPoints.length > 0 ? (
              <Map points={mapPoints} />
            ) : (
              <p>No hospital coordinates available yet.</p>
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
  padding: 12,
  marginTop: 6,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
};

const primaryButton = {
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '11px 16px',
  cursor: 'pointer',
  fontWeight: 600,
};