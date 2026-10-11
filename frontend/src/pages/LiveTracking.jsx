import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Map from '../components/Map';
import TrackingPanel from '../components/TrackingPanel';

import api from '../services/api';
import { connectRealtime } from '../socket/socket';

function validCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return 'Calculating...';
  }

  if (minutes < 1) {
    return 'Less than 1 minute';
  }

  const rounded = Math.ceil(minutes);
  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;

  return `${hours} hr ${remainingMinutes} min`;
}

function getStatusNotification(status) {
  const messages = {
    SEARCHING: {
      title: 'Emergency Request Submitted',
      message: 'We are searching for an available ambulance.',
      icon: '🔎',
    },
    QUEUED: {
      title: 'Emergency Request Queued',
      message: 'Your emergency request is waiting for an ambulance.',
      icon: '⏳',
    },
    ASSIGNED: {
      title: 'Ambulance Assigned!',
      message: 'A driver has accepted your emergency request.',
      icon: '🚑',
    },
    ARRIVED: {
      title: 'Ambulance Arrived!',
      message: 'The ambulance has arrived at your pickup location.',
      icon: '📍',
    },
    PICKED_UP: {
      title: 'Patient Picked Up',
      message: 'You are on your way to the destination hospital.',
      icon: '🏥',
    },
    COMPLETED: {
      title: 'Trip Completed',
      message: 'Your ambulance trip has been completed.',
      icon: '✅',
    },
    CANCELLED: {
      title: 'Emergency Cancelled',
      message: 'This emergency request has been cancelled.',
      icon: '⚠️',
    },
    NO_AMBULANCE: {
      title: 'No Ambulance Available',
      message: 'No ambulance is currently available for this request.',
      icon: '⚠️',
    },
  };

  return messages[status] || null;
}

export default function LiveTracking() {
  const [query] = useSearchParams();

  const token =
    query.get('token') || localStorage.getItem('rr_tracking');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackingError, setTrackingError] = useState('');

  const [routeInfo, setRouteInfo] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  const [notification, setNotification] = useState(null);

  const mountedRef = useRef(false);
  const requestInProgressRef = useRef(false);
  const previousStatusRef = useRef(null);
  const notificationTimerRef = useRef(null);

  // Keep notifications from repeating on every refresh.
  const handleStatusChange = useCallback((newData) => {
    if (!newData?.status) return;

    const currentStatus = String(newData.status).toUpperCase();
    const previousStatus = previousStatusRef.current;

    if (previousStatus === currentStatus) return;

    previousStatusRef.current = currentStatus;

    // Do not show a notification for the initial load.
    if (previousStatus === null) return;

    const message = getStatusNotification(currentStatus);

    if (!message) return;

    setNotification({
      ...message,
      id: Date.now(),
    });

    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }

    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 6000);
  }, []);

  // Fetch tracking information without overlapping requests.
  const refreshTracking = useCallback(async () => {
    if (!token || requestInProgressRef.current) return;

    requestInProgressRef.current = true;

    try {
      const response = await api.get(
        `/tracking/${encodeURIComponent(token)}`,
        {
          timeout: 4000,
        }
      );

      if (!mountedRef.current || !response.data) return;

      const result = response.data;

      handleStatusChange(result);

      setData((previous) => ({
        ...previous,
        ...result,
      }));

      setTrackingError('');
    } catch (error) {
      if (!mountedRef.current) return;

      console.error('Tracking refresh failed:', error);

      setTrackingError(
        error.code === 'ECONNABORTED'
          ? 'Tracking is taking longer than expected. Retrying...'
          : 'Unable to refresh tracking information. Retrying...'
      );
    } finally {
      requestInProgressRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [token, handleStatusChange]);

  // Start tracking and refresh periodically.
  useEffect(() => {
    mountedRef.current = true;

    if (!token) {
      setLoading(false);
      setTrackingError('No tracking token was provided.');
      return () => {
        mountedRef.current = false;
      };
    }

    localStorage.setItem('rr_tracking', token);

    // Start loading immediately.
    refreshTracking();

    // Subscribe to real-time updates.
    let stopRealtime;

    try {
      stopRealtime = connectRealtime((message) => {
        if (!mountedRef.current || !message) return;

        // Ignore updates for a different emergency.
        if (message.trackingToken !== token) return;

        handleStatusChange(message);

        setData((previous) => ({
          ...previous,
          ...message,
        }));

        setTrackingError('');
        setLoading(false);
      });
    } catch (error) {
      console.warn('Realtime connection unavailable:', error);
    }

    // Poll frequently for responsive tracking; overlapping requests are prevented.
    const timer = setInterval(() => {
      refreshTracking();
    }, 2500);

    return () => {
      mountedRef.current = false;

      clearInterval(timer);

      if (typeof stopRealtime === 'function') {
        stopRealtime();
      }

      if (notificationTimerRef.current) {
        clearTimeout(notificationTimerRef.current);
      }
    };
  }, [token, refreshTracking, handleStatusChange]);

  const pickupLat =
    data?.pickupLatitude != null
      ? Number(data.pickupLatitude)
      : null;

  const pickupLng =
    data?.pickupLongitude != null
      ? Number(data.pickupLongitude)
      : null;

  const ambulanceLat =
    data?.ambulance?.latitude != null
      ? Number(data.ambulance.latitude)
      : null;

  const ambulanceLng =
    data?.ambulance?.longitude != null
      ? Number(data.ambulance.longitude)
      : null;

  const hospitalLat =
    data?.hospital?.latitude != null
      ? Number(data.hospital.latitude)
      : null;

  const hospitalLng =
    data?.hospital?.longitude != null
      ? Number(data.hospital.longitude)
      : null;

  const hasPickup = validCoordinate(pickupLat, pickupLng);

  const hasAmbulance = validCoordinate(
    ambulanceLat,
    ambulanceLng
  );

  const hasHospital = validCoordinate(
    hospitalLat,
    hospitalLng
  );

  const status = String(data?.status || '').toUpperCase();

  const headingToHospital = [
    'PICKED_UP',
    'COMPLETED',
  ].includes(status);

  const destination = headingToHospital
    ? hasHospital
      ? {
          lat: hospitalLat,
          lng: hospitalLng,
          title: data?.hospital?.name || 'Destination Hospital',
          subtitle: data?.hospital?.address || 'Hospital',
        }
      : null
    : hasPickup
      ? {
          lat: pickupLat,
          lng: pickupLng,
          title: 'Patient Pickup',
          subtitle: 'Emergency pickup location',
        }
      : null;

  // Route calculation runs independently from tracking refresh.
  useEffect(() => {
    if (
      !hasAmbulance ||
      !destination ||
      status === 'COMPLETED' ||
      status === 'CANCELLED'
    ) {
      setRouteInfo(null);
      setRouteError('');
      setRouteLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function calculateRoute() {
      setRouteLoading(true);
      setRouteError('');

      try {
        const url =
          'https://router.project-osrm.org/route/v1/driving/' +
          `${ambulanceLng},${ambulanceLat};` +
          `${destination.lng},${destination.lat}` +
          '?overview=false';

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Routing service unavailable.');
        }

        const result = await response.json();

        if (result.code !== 'Ok' || !result.routes?.length) {
          throw new Error('No route available.');
        }

        const route = result.routes[0];

        if (
          !Number.isFinite(route.distance) ||
          !Number.isFinite(route.duration)
        ) {
          throw new Error('Invalid route data.');
        }

        if (!cancelled) {
          setRouteInfo({
            distanceKm: route.distance / 1000,
            durationMinutes: route.duration / 60,
          });
        }
      } catch (error) {
        if (
          !cancelled &&
          error.name !== 'AbortError'
        ) {
          setRouteInfo(null);
          setRouteError(
            'Road distance is temporarily unavailable.'
          );
        }
      } finally {
        if (!cancelled) {
          setRouteLoading(false);
        }
      }
    }

    calculateRoute();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    ambulanceLat,
    ambulanceLng,
    destination?.lat,
    destination?.lng,
    hasAmbulance,
    status,
  ]);

  const points = [];

  if (hasAmbulance) {
    points.push({
      lat: ambulanceLat,
      lng: ambulanceLng,
      title:
        data?.ambulance?.ambulanceNumber || 'Ambulance',
      subtitle: `Status: ${status || 'Tracking'}`,
    });
  }

  if (destination) {
    points.push(destination);
  }

  if (hasPickup && destination?.title !== 'Patient Pickup') {
    points.push({
      lat: pickupLat,
      lng: pickupLng,
      title: 'Patient Pickup',
      subtitle: 'Emergency pickup location',
    });
  }

  if (hasHospital && !headingToHospital) {
    points.push({
      lat: hospitalLat,
      lng: hospitalLng,
      title: data?.hospital?.name || 'Destination Hospital',
      subtitle: data?.hospital?.address || 'Hospital',
    });
  }

  const mapCenter = hasAmbulance
    ? [ambulanceLat, ambulanceLng]
    : hasPickup
      ? [pickupLat, pickupLng]
      : [17.385, 78.4867];

  return (
    <>
      <Navbar />

      <div className="layout">
        <Sidebar />

        <main className="content">
          <div className="eyebrow">Live tracking</div>

          <h1>Ambulance Journey</h1>

          {notification && (
            <section
              className="card"
              role="alert"
              aria-live="assertive"
              style={{
                margin: '16px 0',
                padding: 18,
                borderLeft: '6px solid #16a34a',
                background: '#f0fdf4',
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <h3 style={{ color: '#166534' }}>
                    {notification.icon} {notification.title}
                  </h3>

                  <p style={{ color: '#166534' }}>
                    {notification.message}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
            </section>
          )}

          {loading && !data && (
            <div className="card">
              Loading your tracking information...
            </div>
          )}

          {trackingError && (
            <div className="card" role="status">
              {trackingError}
            </div>
          )}

          {!token && (
            <div className="card">
              No tracking token found. Open tracking from your
              emergency request.
            </div>
          )}

          {data && (
            <>
              <TrackingPanel data={data} />

              <section
                className="card"
                style={{
                  margin: '16px 0',
                  padding: 20,
                }}
              >
                <div className="eyebrow">
                  {headingToHospital
                    ? 'HOSPITAL JOURNEY'
                    : 'AMBULANCE ARRIVAL'}
                </div>

                <h2 style={{ margin: '8px 0' }}>
                  {headingToHospital
                    ? 'Ambulance → Hospital'
                    : 'Ambulance → Patient'}
                </h2>

                <p className="muted">
                  {headingToHospital
                    ? data?.hospital?.name ||
                      'Destination hospital'
                    : 'Your emergency pickup location'}
                </p>

                {status === 'COMPLETED' ? (
                  <p>Your trip is completed.</p>
                ) : status === 'CANCELLED' ? (
                  <p>This emergency has been cancelled.</p>
                ) : !hasAmbulance ? (
                  <p>
                    Waiting for the ambulance's current location.
                  </p>
                ) : routeLoading && !routeInfo ? (
                  <p>Calculating road distance and travel time...</p>
                ) : routeInfo ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: 12,
                      marginTop: 16,
                    }}
                  >
                    <div className="stat">
                      <span>📍 Remaining distance</span>
                      <b>{routeInfo.distanceKm.toFixed(2)} km</b>
                    </div>

                    <div className="stat">
                      <span>⏱️ Estimated travel time</span>
                      <b>
                        {formatDuration(
                          routeInfo.durationMinutes
                        )}
                      </b>
                    </div>
                  </div>
                ) : (
                  <p className="muted">
                    {routeError ||
                      'Route information is not available yet.'}
                  </p>
                )}

                <p className="muted" style={{ fontSize: 12 }}>
                  Travel estimates depend on the road-routing service
                  and may differ from actual travel times.
                </p>
              </section>

              <div className="card mapCard">
                <h2>Live Ambulance Map</h2>

                <Map
                  center={mapCenter}
                  points={points}
                  showRoadRoute={
                    hasAmbulance &&
                    Boolean(destination) &&
                    status !== 'COMPLETED' &&
                    status !== 'CANCELLED'
                  }
                />
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}