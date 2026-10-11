import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../services/api';

export default function HospitalManagerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'overview';

  const [hospital, setHospital] = useState(null);
  const [incomingEmergencies, setIncomingEmergencies] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [ackingId, setAckingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signedInAccount, setSignedInAccount] = useState(null);

  // Editable capacity and availability state
  const [capacity, setCapacity] = useState('');
  const [emergencyAvailable, setEmergencyAvailable] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setError('');
      // Confirm the identity/role from the backend before loading manager-only resources.
      const identityResponse = await api.get('/auth/me');
      const identity = identityResponse.data;
      setSignedInAccount(identity);
      if (String(identity?.role || '').toUpperCase() !== 'HOSPITAL_MANAGER') {
        setHospital(null);
        setIncomingEmergencies([]);
        setBookings([]);
        setError(`You are signed in as ${identity?.email || 'an unknown account'} with role ${identity?.role || 'unknown'}. Sign out and sign in with the exact HOSPITAL_MANAGER account assigned by Admin.`);
        return;
      }
      // Load assigned hospital for this manager
      const hospitalResponse = await api.get('/hospitals/my-hospital');
      const hosp = hospitalResponse.data;
      setHospital(hosp);
      setCapacity(hosp.capacity == null ? '' : String(hosp.capacity));
      setEmergencyAvailable(Boolean(hosp.emergencyAvailable));

      if (hosp?.id) {
        // Load incoming emergencies for this hospital
        try {
          const emergencyResponse = await api.get(`/emergency/hospital/${hosp.id}`);
          setIncomingEmergencies(Array.isArray(emergencyResponse.data) ? emergencyResponse.data : []);
        } catch (e) {
          console.warn('Could not load hospital emergencies:', e);
        }

        // Load bookings for this hospital
        try {
          const bookingResponse = await api.get(`/bookings/hospital/${hosp.id}`);
          setBookings(Array.isArray(bookingResponse.data) ? bookingResponse.data : []);
        } catch (e) {
          console.warn('Could not load hospital bookings:', e);
        }
      }
    } catch (err) {
      console.error('Error loading hospital manager dashboard:', err);
      if (err.response?.status === 404) {
        setHospital(null);
        setIncomingEmergencies([]);
        setBookings([]);
        setError('No hospital is assigned to this Hospital Manager account yet. Ask an Admin to assign a hospital in Admin → Manage Hospitals, then refresh this page.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setHospital(null);
        setIncomingEmergencies([]);
        setBookings([]);
        const backendMessage = err.response?.data?.message || err.response?.data?.error;
        setError(backendMessage || `Access was denied for ${signedInAccount?.email || 'this session'}. Verify the account role and assigned hospital, then sign out and sign in again.`);
      } else {
        setHospital(null);
        setIncomingEmergencies([]);
        setBookings([]);
        setError(err.response?.data?.message || 'The hospital profile could not be loaded. Confirm that Admin assigned this exact manager account, then use Refresh.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    // Avoid repeatedly firing a failing request every few seconds; refresh is manual.
    return undefined;
  }, [loadDashboard]);

  // Update capacity and emergency availability
  const handleUpdateAvailability = async (e) => {
    e.preventDefault();
    if (!hospital?.id) return;

    try {
      setSavingAvailability(true);
      setError('');
      setSuccess('');

      const response = await api.put(`/hospitals/${hospital.id}/availability`, null, {
        params: {
          emergencyAvailable,
          ...(capacity !== '' ? { capacity: Number(capacity) } : {}),
        },
      });

      setHospital(response.data);
      setSuccess('Hospital emergency status and capacity updated successfully.');
    } catch (err) {
      console.error('Could not update hospital availability:', err);
      setError(err.response?.data?.message || 'Could not update hospital availability.');
    } finally {
      setSavingAvailability(false);
    }
  };

  // Acknowledge incoming emergency
  const handleAcknowledgeArrival = async (emergencyId) => {
    try {
      setAckingId(emergencyId);
      setError('');
      setSuccess('');

      await api.post(`/emergency/${emergencyId}/hospital-ack`, null, {
        params: {
          notes: 'ER and trauma team prepared for arrival',
        },
      });

      setSuccess(`Emergency #${emergencyId} acknowledged. Team notified.`);
      await loadDashboard();
    } catch (err) {
      console.error('Could not acknowledge emergency:', err);
      setError(err.response?.data?.message || 'Could not acknowledge emergency.');
    } finally {
      setAckingId(null);
    }
  };

  const activeEmergencies = incomingEmergencies.filter(
    (em) => !['COMPLETED', 'CANCELLED', 'NO_AMBULANCE'].includes(String(em.status || '').toUpperCase())
  );

  const completedBookings = bookings.filter(
    (b) => String(b.status || '').toUpperCase() === 'COMPLETED'
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="layout">
          <Sidebar />
          <main className="content">
            <p className="muted" style={{ padding: 24 }}>Loading Hospital Operations Dashboard...</p>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="layout">
        <Sidebar />

        <main className="content">
          <div className="row between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="eyebrow">Hospital Care Operations</div>
              <h1>Hospital Manager Command</h1>
              <p className="muted">
                Manage emergency capacity, coordinate incoming ambulance arrivals, and view care history.
              </p>
              {signedInAccount && (
                <p className="muted" style={{ fontSize: 13 }}>Signed in as {signedInAccount.email} · Role: {signedInAccount.role}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className={currentTab === 'overview' ? 'primary' : 'ghost'}
                onClick={() => setSearchParams({ tab: 'overview' })}
              >
                Overview
              </button>
              <button
                type="button"
                className={currentTab === 'emergencies' ? 'primary' : 'ghost'}
                onClick={() => setSearchParams({ tab: 'emergencies' })}
              >
                Incoming ({activeEmergencies.length})
              </button>
              <button
                type="button"
                className={currentTab === 'history' ? 'primary' : 'ghost'}
                onClick={() => setSearchParams({ tab: 'history' })}
              >
                Care History
              </button>
            </div>
          </div>

          {error && (
            <div className="alert danger" role="alert" style={{ margin: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span>{error}</span>
              <button type="button" className="ghost" onClick={() => { setLoading(true); loadDashboard(); }}>Refresh</button>
            </div>
          )}

          {success && (
            <div className="alert" role="status" style={{ background: '#dcfce7', color: '#166534', margin: '14px 0' }}>
              {success}
            </div>
          )}

          {/* Key Metric Cards */}
          <div className="stats">
            <div className="stat">
              <b>{hospital?.name ? hospital.name.split(' ')[0] : '—'}</b>
              <span>{hospital?.name || 'Assigned Hospital'}</span>
            </div>
            <div className="stat">
              <b>{activeEmergencies.length}</b>
              <span>Active Incoming</span>
            </div>
            <div className="stat">
              <b>{hospital?.capacity ?? '—'}</b>
              <span>Bed / ER Capacity</span>
            </div>
            <div className="stat">
              <b style={{ color: hospital?.emergencyAvailable ? '#166534' : '#b91c1c' }}>
                {hospital?.emergencyAvailable ? 'OPEN' : 'BUSY'}
              </b>
              <span>Emergency Receiving</span>
            </div>
          </div>

          {/* OVERVIEW TAB */}
          {currentTab === 'overview' && (
            <>
              {/* Hospital Profile & Availability Form */}
              <div className="grid2">
                <section className="card">
                  <h2>🏥 Hospital Profile</h2>
                  {hospital ? (
                    <div style={{ lineHeight: 1.8 }}>
                      <p><strong>Facility Name:</strong> {hospital.name}</p>
                      <p><strong>Address:</strong> {hospital.address || 'Address on file'}</p>
                      <p><strong>Direct Emergency Phone:</strong> {hospital.phone || 'Phone on file'}</p>
                      <p>
                        <strong>Coordinates:</strong>{' '}
                        {hospital.latitude && hospital.longitude
                          ? `${Number(hospital.latitude).toFixed(4)}, ${Number(hospital.longitude).toFixed(4)}`
                          : 'Location coordinates recorded'}
                      </p>
                      <p>
                        <strong>Status:</strong>{' '}
                        <span className={`badge ${hospital.emergencyAvailable ? 'success' : 'danger'}`}>
                          {hospital.emergencyAvailable ? '🟢 Accepting Emergencies' : '🔴 Diverting Emergencies'}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="muted">No hospital is assigned to your account.</p>
                  )}
                </section>

                <section className="card">
                  <h2>⚙️ Manage Capacity & Receiving</h2>
                  <form onSubmit={handleUpdateAvailability}>
                    <label style={{ display: 'block', marginBottom: 16 }}>
                      <strong>Bed / ER Capacity:</strong>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        placeholder="Not set"
                        style={{ display: 'block', width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid #cbd5e1' }}
                      />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={emergencyAvailable}
                        onChange={(e) => setEmergencyAvailable(e.target.checked)}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: 600 }}>Accepting incoming emergency ambulances</span>
                    </label>

                    <button
                      type="submit"
                      className="primary wide"
                      disabled={savingAvailability || !hospital}
                    >
                      {savingAvailability ? 'Saving Updates...' : '💾 Update Hospital Status'}
                    </button>
                  </form>
                </section>
              </div>

              {/* Active Incoming Emergencies Preview */}
              <section className="card" style={{ marginTop: 24 }}>
                <div className="row between">
                  <h2>🚨 Active Incoming Emergencies</h2>
                  <button
                    type="button"
                    onClick={() => setSearchParams({ tab: 'emergencies' })}
                  >
                    View All ({activeEmergencies.length})
                  </button>
                </div>

                {activeEmergencies.length === 0 ? (
                  <p className="muted">No active ambulance emergencies are currently en route to your hospital.</p>
                ) : (
                  <div className="tableWrap" style={{ marginTop: 12 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Emergency ID</th>
                          <th>Type & Priority</th>
                          <th>Ambulance Unit</th>
                          <th>Driver & Contact</th>
                          <th>Status</th>
                          <th>Hospital Ack</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeEmergencies.map((em) => (
                          <tr key={em.id}>
                            <td><b>#{em.id}</b></td>
                            <td>
                              <span>{em.type?.replaceAll('_', ' ')}</span>{' '}
                              <span className={`badge ${String(em.priority).toLowerCase()}`}>{em.priority}</span>
                            </td>
                            <td>{em.ambulance ? `${em.ambulance.ambulanceNumber} (${em.ambulance.type})` : 'Assigned Unit'}</td>
                            <td>
                              {em.ambulance?.driverName || 'Driver'}{' '}
                              {em.ambulance?.driverPhone ? `· 📞 ${em.ambulance.driverPhone}` : ''}
                            </td>
                            <td><span className="badge">{em.status}</span></td>
                            <td>
                              {em.hospitalAck ? (
                                <span className="badge" style={{ background: '#dcfce7', color: '#166534' }}>
                                  ✓ Acknowledged
                                </span>
                              ) : (
                                <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                                  ⏳ Pending Ack
                                </span>
                              )}
                            </td>
                            <td>
                              {!em.hospitalAck && (
                                <button
                                  type="button"
                                  className="primary"
                                  style={{ padding: '6px 12px', fontSize: 13 }}
                                  disabled={ackingId === em.id}
                                  onClick={() => handleAcknowledgeArrival(em.id)}
                                >
                                  {ackingId === em.id ? 'Confirming...' : 'Acknowledge Arrival'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {/* INCOMING EMERGENCIES TAB */}
          {currentTab === 'emergencies' && (
            <section className="card">
              <h2>🚨 Incoming Ambulances & En-Route Emergencies</h2>
              <p className="muted">
                Track incoming patients dispatched to {hospital?.name || 'your hospital'}. Acknowledge incoming emergencies to prepare the trauma team.
              </p>

              {activeEmergencies.length === 0 ? (
                <p className="muted" style={{ padding: '20px 0' }}>No active ambulance emergencies currently dispatched to your hospital.</p>
              ) : (
                <div className="cards" style={{ marginTop: 16 }}>
                  {activeEmergencies.map((em) => (
                    <article className="card emergencyCard" key={em.id}>
                      <div className="row between">
                        <div>
                          <span className="eyebrow">Case #{em.id}</span>
                          <h3>{em.type?.replaceAll('_', ' ')}</h3>
                        </div>
                        <span className={`badge ${String(em.priority).toLowerCase()}`}>{em.priority}</span>
                      </div>

                      <p><strong>Status:</strong> <span className="badge">{em.status}</span></p>
                      {em.ambulance && (
                        <p>
                          🚑 <strong>Ambulance:</strong> {em.ambulance.ambulanceNumber} ({em.ambulance.type})<br />
                          👤 <strong>Driver:</strong> {em.ambulance.driverName || 'Assigned Driver'} {em.ambulance.driverPhone ? `(📞 ${em.ambulance.driverPhone})` : ''}
                        </p>
                      )}
                      {em.pickupLatitude && (
                        <p className="muted">
                          📍 Pickup: {Number(em.pickupLatitude).toFixed(4)}, {Number(em.pickupLongitude).toFixed(4)}
                        </p>
                      )}
                      {em.notes && <p className="muted">📝 Notes: {em.notes}</p>}

                      <div className="actions" style={{ marginTop: 16 }}>
                        {em.hospitalAck ? (
                          <span className="badge" style={{ background: '#dcfce7', color: '#166534', padding: '8px 14px' }}>
                            ✓ Arrival Acknowledged · ER Prepared
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="primary"
                            disabled={ackingId === em.id}
                            onClick={() => handleAcknowledgeArrival(em.id)}
                          >
                            {ackingId === em.id ? 'Confirming...' : '🏥 Acknowledge Patient Arrival'}
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* HISTORY TAB */}
          {currentTab === 'history' && (
            <section className="card">
              <h2>📜 Hospital Care & Arrival History</h2>
              <p className="muted">Past completed emergency arrivals and trip records for {hospital?.name || 'your hospital'}.</p>

              {bookings.length === 0 ? (
                <p className="muted" style={{ padding: '20px 0' }}>No historical booking records for this facility yet.</p>
              ) : (
                <div className="tableWrap" style={{ marginTop: 16 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Emergency Case</th>
                        <th>Ambulance</th>
                        <th>Driver</th>
                        <th>Booking Time</th>
                        <th>Drop Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td><b>#{b.id}</b></td>
                          <td>#{b.emergencyRequestId}</td>
                          <td>{b.ambulance || '—'}</td>
                          <td>{b.driver || '—'}</td>
                          <td>{b.bookingTime ? new Date(b.bookingTime).toLocaleString() : '—'}</td>
                          <td>{b.dropTime ? new Date(b.dropTime).toLocaleString() : '—'}</td>
                          <td><span className="badge">{b.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </>
  );
}