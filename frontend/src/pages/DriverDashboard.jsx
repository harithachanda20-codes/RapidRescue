import { useEffect, useState, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import Map from '../components/Map';
import { useAuth } from '../context/AuthContext';

// Calculate straight-line distance between GPS coordinates in metres.
function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DriverDashboard() {
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [driverProfile, setDriverProfile] = useState(null);
  const [online, setOnline] = useState(true);
  const [pos, setPos] = useState(null);
  const [nearPickup, setNearPickup] = useState(false);
  const [navigationStarted, setNavigationStarted] = useState(false);
  const [selected, setSelected] = useState(null);
  const [err, setErr] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const arrivalTriggeredRef = useRef(null);

  // Load completed trips from backend database
  const loadCompletedTrips = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const response = await api.get(`/drivers/${user.userId}/completed-trips`);
      setCompletedTrips(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.warn('Could not load completed trips from database:', error);
    }
  }, [user?.userId]);

  // Load driver assigned ambulance profile
  const loadDriverProfile = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const response = await api.get('/ambulances');
      const list = Array.isArray(response.data) ? response.data : [];
      const match = list.find((a) => Number(a.driverId) === Number(user.userId));
      setDriverProfile(match || null);
    } catch (error) {
      console.warn('Could not load ambulance information:', error);
    }
  }, [user?.userId]);

  // Load active emergencies
  const load = useCallback(async () => {
    try {
      const response = await api.get('/emergency/active');

      setRows(Array.isArray(response.data) ? response.data : []);
      setErr('');
    } catch (error) {
      console.error('Could not load emergencies:', error);

      setErr(
        error.response?.data?.message ||
          'Could not load emergencies. Check whether the backend is running.'
      );
    }
  }, []);

  // Initialize driver dashboard
  useEffect(() => {
    if (!user?.userId) {
      setErr('Driver account information is missing. Please log in again.');
      return;
    }

    api
      .post(`/drivers/${user.userId}/status?online=true&available=true`)
      .then(() => setOnline(true))
      .catch((error) => {
        console.error('Could not update driver status:', error);
      });

    load();
    loadCompletedTrips();
    loadDriverProfile();

    const timer = setInterval(() => {
      load();
    }, 5000);

    return () => clearInterval(timer);
  }, [user?.userId, load, loadCompletedTrips, loadDriverProfile]);

  // Capture and save driver GPS location
  const captureGPS = () => {
    setErr('');
    setMessage('');

    if (!navigator.geolocation) {
      setErr('Your browser does not support GPS location.');
      return;
    }

    setGpsLoading(true);
    setMessage('Detecting your current location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setPos([latitude, longitude]);

        try {
          if (!user?.userId) {
            throw new Error('Driver account ID is missing.');
          }

          await api.put(`/drivers/${user.userId}/location`, {
            latitude,
            longitude,
          });

          setMessage('Your current location has been saved successfully.');
        } catch (error) {
          console.error('Could not save driver location:', error);

          setErr(
            error.response?.data?.message ||
              'GPS detected, but the backend could not save your location.'
          );
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error('GPS error:', error);

        if (error.code === 1) {
          setErr('Location permission denied. Allow location access in your browser.');
        } else if (error.code === 2) {
          setErr(
            'Your device could not determine your location. Check Windows Location services.'
          );
        } else if (error.code === 3) {
          setErr('Location request timed out. Please try again.');
        } else {
          setErr(`Could not get your location: ${error.message}`);
        }

        setGpsLoading(false);
        setMessage('');
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  };

  // Accept an emergency
  const acceptEmergency = async (id) => {
    if (!user?.userId) {
      setErr('Driver account information is missing. Please log in again.');
      return;
    }

    try {
      setBusy(true);
      setErr('');
      setMessage('');

      const response = await api.post(
        `/emergency/${id}/accept/${user.userId}`
      );

      setNavigationStarted(false);
      setSelected(response.data);
      setMessage(`Emergency #${id} accepted successfully! Press Start Navigation to begin live tracking.`);

      await load();
    } catch (error) {
      console.error('Could not accept emergency:', error);

      setErr(
        error.response?.data?.message ||
          'Could not accept this emergency. It may already have been assigned.'
      );

      await load();
    } finally {
      setBusy(false);
    }
  };

  // Update emergency status
  const updateStatus = async (id, status) => {
    try {
      setBusy(true);
      setErr('');
      setMessage('');

      const response = await api.put(
        `/drivers/emergency/${id}/status?status=${encodeURIComponent(status)}`
      );

      setMessage(`Emergency #${id} updated to ${status}.`);

      if (status === 'COMPLETED') {
        await loadCompletedTrips();
      }

      await load();

      if (status === 'COMPLETED') {
        setNavigationStarted(false);
        setSelected(null);
      } else if (response.data) {
        setSelected(response.data);
      } else {
        setSelected((previous) =>
          previous?.id === id ? { ...previous, status } : previous
        );
      }
    } catch (error) {
      console.error('Could not update emergency status:', error);

      setErr(
        error.response?.data?.message ||
          'Could not update emergency status.'
      );
    } finally {
      setBusy(false);
    }
  };

  // Start/stop live GPS navigation. The current marker and route update as GPS changes.
  // Arrival is auto-recorded only while travelling to the patient (ASSIGNED stage).
  useEffect(() => {
    if (
      !navigationStarted ||
      !selected ||
      !['ASSIGNED', 'ARRIVED', 'PICKED_UP'].includes(selected.status) ||
      !user?.userId
    ) {
      setNearPickup(false);
      return;
    }

    if (!navigator.geolocation) {
      setErr('Live navigation requires browser GPS support.');
      return;
    }

    let cancelled = false;
    const emergencyId = selected.id;
    const shouldCheckArrival = selected.status === 'ASSIGNED';
    const pickupLat = Number(selected.pickupLatitude);
    const pickupLng = Number(selected.pickupLongitude);

    if (
      shouldCheckArrival &&
      (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng))
    ) {
      setErr('Pickup coordinates are unavailable; automatic arrival cannot be detected.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        if (cancelled) return;

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        // Map.jsx receives this updated position and recalculates the route/remaining ETA.
        setPos([latitude, longitude]);

        try {
          await api.put(`/drivers/${user.userId}/location`, { latitude, longitude });
        } catch (error) {
          console.error('Could not update driver GPS location:', error);
        }

        if (shouldCheckArrival) {
          const distance = calculateDistance(latitude, longitude, pickupLat, pickupLng);
          const isNear = distance <= 50;
          setNearPickup(isNear);

          if (isNear && arrivalTriggeredRef.current !== emergencyId) {
            arrivalTriggeredRef.current = emergencyId;
            try {
              setErr('');
              const response = await api.put(
                `/drivers/emergency/${emergencyId}/status?status=ARRIVED`
              );
              if (cancelled) return;
              setSelected(response.data || { ...selected, status: 'ARRIVED' });
              setMessage(`You are within 50 metres of Emergency #${emergencyId}. Arrival recorded.`);
              await load();
            } catch (error) {
              arrivalTriggeredRef.current = null;
              console.error('Could not automatically mark arrival:', error);
              if (!cancelled) {
                setErr(
                  error.response?.data?.message ||
                    'You are near the patient, but arrival could not be saved. Use Arrived manually.'
                );
              }
            }
          }
        } else {
          setNearPickup(false);
        }
      },
      (error) => {
        if (!cancelled) {
          console.error('Live navigation GPS error:', error);
          setErr('Allow location access to track your movement and update the route.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 }
    );

    return () => {
      cancelled = true;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [navigationStarted, selected?.id, selected?.status, selected?.pickupLatitude, selected?.pickupLongitude, user?.userId, load]);

  // Toggle online/offline
  const toggleOnline = async () => {
    if (!user?.userId) {
      setErr('Driver account information is missing. Please log in again.');
      return;
    }

    const next = !online;

    try {
      setErr('');
      setMessage('');

      await api.post(
        `/drivers/${user.userId}/status?online=${next}&available=${next}`
      );

      setOnline(next);

      setMessage(
        next
          ? 'You are now online and can accept emergencies.'
          : 'You are now offline.'
      );
    } catch (error) {
      console.error('Could not update driver availability:', error);

      setErr(
        error.response?.data?.message ||
          'Could not update driver availability.'
      );
    }
  };

  // Choose the destination strictly from the current emergency status.
  // The hospital route is shown ONLY after the driver confirms PICKED_UP.
  const destination = (() => {
    if (!selected) return null;

    if (selected.status === 'PICKED_UP') {
      const hospital = selected.hospital;
      const latitude = Number(hospital?.latitude);
      const longitude = Number(hospital?.longitude);

      if (
        hospital?.latitude != null &&
        hospital?.longitude != null &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Math.abs(latitude) <= 90 &&
        Math.abs(longitude) <= 180
      ) {
        return {
          lat: latitude,
          lng: longitude,
          title: hospital.name || 'Destination Hospital',
          subtitle: 'Navigate to the selected hospital',
        };
      }

      return null;
    }

    // Before pickup, only ASSIGNED and ARRIVED emergencies navigate to the patient.
    if (
      ['ASSIGNED', 'ARRIVED'].includes(selected.status) &&
      selected.pickupLatitude != null &&
      selected.pickupLongitude != null
    ) {
      const latitude = Number(selected.pickupLatitude);
      const longitude = Number(selected.pickupLongitude);

      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Math.abs(latitude) <= 90 &&
        Math.abs(longitude) <= 180
      ) {
        return {
          lat: latitude,
          lng: longitude,
          title: 'Patient Pickup',
          subtitle: 'Navigate to the emergency pickup location',
        };
      }
    }

    // SEARCHING, QUEUED, COMPLETED, CANCELLED and other states have no navigation.
    return null;
  })();

  // Prepare map markers
  const mapPoints = [];

  if (pos) {
    mapPoints.push({
      lat: pos[0],
      lng: pos[1],
      title: 'Your Current Location',
      subtitle: 'Driver GPS position',
    });
  }

  if (destination) {
    mapPoints.push(destination);
  }

  // Show open emergencies and emergencies assigned to this driver
  const visibleRows = rows.filter((r) => {
    const isOpen =
      r.status === 'SEARCHING' || r.status === 'QUEUED';

    const isAssignedToThisDriver =
      r.ambulance?.driverId != null &&
      Number(r.ambulance.driverId) === Number(user?.userId);

    return isOpen || isAssignedToThisDriver;
  });

  return (
    <>
      <Navbar />

      <main className="content driverPage">
        {/* Dashboard header */}
        <div className="row between">
          <div>
            <div className="eyebrow">Driver console</div>

            <h1>Dispatch assignments</h1>

            <p className="muted">
              Accept emergencies, capture your GPS location, and navigate
              to patients and hospitals.
            </p>
          </div>

          <button
            type="button"
            className={online ? 'success' : 'primary'}
            onClick={toggleOnline}
            disabled={busy}
          >
            {online ? '● Online' : '○ Offline'}
          </button>
        </div>

        {/* Error and success messages */}
        {err && (
          <div className="alert danger" role="alert">
            {err}
          </div>
        )}

        {message && (
          <div className="alert" role="status">
            {message}
          </div>
        )}

        {/* Driver Profile & Vehicle Card */}
        <div className="card" style={{ background: '#f8fafc', borderLeft: '5px solid #2563eb', marginBottom: 16 }}>
          <div className="row between" style={{ flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>
                🚑 {driverProfile ? `Ambulance ${driverProfile.ambulanceNumber}` : 'Emergency Ambulance Unit'}
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>
                <strong>Driver:</strong> {user?.name || 'Driver'} · <strong>Type:</strong> {driverProfile?.type || 'ALS'} · <strong>Ambulance Status:</strong> <span className="badge">{driverProfile?.status || (online ? 'AVAILABLE' : 'OFFLINE')}</span>
              </p>
            </div>
            <div>
              <span className={`badge ${online ? 'success' : 'danger'}`}>
                {online ? 'Active on Dispatch Network' : 'Currently Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* GPS section */}
        <div className="card">
          <h2>Driver GPS</h2>

          <p className="muted">
            Allow location access to save your current position.
          </p>

          <button
            type="button"
            onClick={captureGPS}
            disabled={gpsLoading}
          >
            {gpsLoading
              ? 'Detecting Location...'
              : '📍 Capture Current Location'}
          </button>

          {pos && (
            <div style={{ marginTop: 12 }}>
              <p>
                <strong>Latitude:</strong> {pos[0].toFixed(6)}
              </p>

              <p>
                <strong>Longitude:</strong> {pos[1].toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Navigation map */}
        <div className="card">
          <h2>
            {selected ? 'Emergency Navigation' : 'Your Current Location'}
          </h2>

          <p className="muted">
            {selected
              ? 'Follow the route to the patient or destination hospital.'
              : 'Capture your location to display it on the map.'}
          </p>

          {pos ? (
            <>
              {selected && !destination && (
                <div className="alert">
                  Destination coordinates are unavailable for this emergency.
                </div>
              )}

              {destination && selected && (
                <div id="navigation-controls" style={{ margin: '12px 0', display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {!navigationStarted ? (
                    <button
                      type="button"
                      onClick={() => {
                        setErr('');
                        setMessage('Live navigation started. Keep location permission enabled while travelling.');
                        setNavigationStarted(true);
                      }}
                    >
                      ▶ Start Navigation
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setNavigationStarted(false);
                        setMessage('Navigation paused. Press Start Navigation to resume live GPS tracking.');
                      }}
                    >
                      ⏸ Pause Navigation
                    </button>
                  )}
                  <div
                    id="navigation-route-panel"
                    style={{ flex: '1 1 320px', minWidth: 280, maxWidth: 390 }}
                  />
                </div>
              )}

              <Map
                center={pos}
                points={mapPoints}
                showRoadRoute={Boolean(destination)}
              />
              {navigationStarted && destination && (
                <p className="muted" role="status" style={{ marginTop: 8 }}>
                  Live GPS is on. Your location marker, remaining route distance, and ETA update when your device receives new GPS positions.
                </p>
              )}

              {selected?.status === 'ASSIGNED' && nearPickup && (
                <div className="alert" role="status">
                  You are within 50 metres of the patient. Arrival will be recorded automatically.
                </div>
              )}

              {destination && (
                <p style={{ marginTop: 12 }}>
                  <strong>Destination:</strong> {destination.title}
                </p>
              )}

              <button
                type="button"
                onClick={captureGPS}
                disabled={gpsLoading}
                style={{ marginTop: 12 }}
              >
                {gpsLoading ? 'Updating...' : '🔄 Refresh My Location'}
              </button>
            </>
          ) : (
            <p className="muted">
              Capture your current location to display the map.
            </p>
          )}
        </div>

        {/* Emergency list header */}
        <div className="row between">
          <h2>Active Emergencies</h2>

          <button type="button" onClick={load}>
            Refresh
          </button>
        </div>

        {/* Emergency cards */}
        <div className="cards">
          {visibleRows.length === 0 && (
            <div className="card">
              <p className="muted">
                No active emergencies are currently available.
              </p>
            </div>
          )}

          {visibleRows.map((r) => {
            const isOpen =
              r.status === 'SEARCHING' || r.status === 'QUEUED';

            const isAssignedToThisDriver =
              r.ambulance?.driverId != null &&
              Number(r.ambulance.driverId) === Number(user?.userId);

            return (
              <div className="card" key={r.id}>
                <div className="row between">
                  <h2>Emergency #{r.id}</h2>

                  <span className="badge">{r.status}</span>
                </div>

                <p>
                  <strong>Priority:</strong>{' '}
                  {r.priority || 'Not specified'}
                </p>

                <p>
                  <strong>Type:</strong>{' '}
                  {r.type || 'Not specified'}
                </p>

                <p>
                  <strong>Pickup:</strong>{' '}
                  {r.pickupLatitude != null &&
                  r.pickupLongitude != null &&
                  Number.isFinite(Number(r.pickupLatitude)) &&
                  Number.isFinite(Number(r.pickupLongitude)) &&
                  Math.abs(Number(r.pickupLatitude)) <= 90 &&
                  Math.abs(Number(r.pickupLongitude)) <= 180
                    ? `${Number(r.pickupLatitude).toFixed(5)}, ${Number(
                        r.pickupLongitude
                      ).toFixed(5)}`
                    : 'Pickup coordinates unavailable'}
                </p>

                {r.hospital && (
                  <p>
                    <strong>Destination hospital:</strong>{' '}
                    {r.hospital.name}
                  </p>
                )}

                <div className="actions">
                  {/* Accept Emergency */}
                  {isOpen && (
                    <button
                      type="button"
                      disabled={busy || !online}
                      onClick={() => acceptEmergency(r.id)}
                    >
                      {busy
                        ? 'Processing...'
                        : '🚑 Accept Emergency'}
                    </button>
                  )}

                  {/* View route only for open or own emergencies */}
                  {(isOpen || isAssignedToThisDriver) && (
                    <button
                      type="button"
                      onClick={() => { setNavigationStarted(false); setSelected(r); }}
                    >
                      View Route
                    </button>
                  )}

                  {/* Arrive at pickup */}
                  {isAssignedToThisDriver &&
                    r.status === 'ASSIGNED' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateStatus(r.id, 'ARRIVED')}
                      >
                        Arrived
                      </button>
                    )}

                  {/* Confirm patient pickup */}
                  {isAssignedToThisDriver &&
                    r.status === 'ARRIVED' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateStatus(r.id, 'PICKED_UP')}
                      >
                        Picked Up
                      </button>
                    )}

                  {/* Complete trip */}
                  {isAssignedToThisDriver &&
                    r.status === 'PICKED_UP' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateStatus(r.id, 'COMPLETED')}
                      >
                        Complete Trip
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed trip history */}
        <section style={{ marginTop: 28 }} aria-labelledby="completed-trips-heading">
          <div className="row between" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h2 id="completed-trips-heading">Completed Trips</h2>
              <p className="muted">Trips completed and recorded in the database.</p>
            </div>
            <button
              type="button"
              onClick={loadCompletedTrips}
            >
              Refresh History
            </button>
          </div>

          {completedTrips.length === 0 ? (
            <div className="card">
              <p className="muted">No completed trips recorded yet. Completed trips will appear here after you select Complete Trip.</p>
            </div>
          ) : (
            <div className="cards">
              {completedTrips.map((trip, index) => {
                const patientName =
                  trip.patient?.name ||
                  trip.patient?.user?.name ||
                  trip.patientName ||
                  trip.customer?.name ||
                  trip.user?.name ||
                  'Patient name unavailable';
                const patientPhone =
                  trip.patient?.phoneNumber ||
                  trip.patient?.phone ||
                  trip.patient?.user?.phoneNumber ||
                  trip.patientPhone ||
                  trip.phoneNumber ||
                  trip.customer?.phoneNumber ||
                  trip.user?.phoneNumber ||
                  'Phone number unavailable';
                const pickupAddress =
                  trip.pickupAddress?.address ||
                  trip.pickupAddress?.name ||
                  (typeof trip.pickupAddress === 'string' ? trip.pickupAddress : null) ||
                  trip.sourceAddress ||
                  trip.pickupLocation ||
                  null;
                const pickup = pickupAddress || (trip.pickupLatitude != null && trip.pickupLongitude != null
                  ? `${Number(trip.pickupLatitude).toFixed(5)}, ${Number(trip.pickupLongitude).toFixed(5)}`
                  : 'Pickup location unavailable');
                const hospitalName = trip.hospital?.name || trip.destinationHospital?.name || trip.hospitalName || trip.destinationAddress?.name || 'Hospital not specified';
                const distanceKm = trip.distanceKm ?? trip.routeDistanceKm ?? trip.tripDistanceKm ?? trip.distance;
                const durationMinutes = trip.durationMinutes ?? trip.tripDurationMinutes ?? trip.durationMin;
                const dateValue = trip.completedAt || trip.updatedAt || trip.createdAt;
                const formattedDate = dateValue && !Number.isNaN(new Date(dateValue).getTime())
                  ? new Date(dateValue).toLocaleString()
                  : 'Date unavailable';

                return (
                  <article className="card" key={`${trip.id}-${index}`}>
                    <div className="row between" style={{ flexWrap: 'wrap' }}>
                      <h3 style={{ marginTop: 0 }}>Emergency #{trip.id}</h3>
                      <span className="badge">COMPLETED</span>
                    </div>
                    <p><strong>Patient name:</strong> {patientName}</p>
                    <p><strong>Patient phone:</strong> {patientPhone}</p>
                    <p><strong>Priority:</strong> {trip.priority || 'Not specified'}</p>
                    <p><strong>Emergency type:</strong> {trip.type || 'Not specified'}</p>
                    <p><strong>Pickup:</strong> {pickup}</p>
                    <p><strong>Destination hospital:</strong> {hospitalName}</p>
                    <p><strong>Trip distance:</strong> {distanceKm != null && Number.isFinite(Number(distanceKm)) ? `${Number(distanceKm).toFixed(2)} km` : 'Not recorded'}</p>
                    <p><strong>Trip duration:</strong> {durationMinutes != null && Number.isFinite(Number(durationMinutes)) ? `${Math.round(Number(durationMinutes))} minutes` : 'Not recorded'}</p>
                    <p><strong>Completed:</strong> {formattedDate}</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}