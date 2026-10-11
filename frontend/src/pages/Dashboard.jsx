import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Map from '../components/Map';
import EmergencyCard from '../components/EmergencyCard';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getHomeRouteForRole } from '../components/ProtectedRoute';

export default function Dashboard() {
  const { user } = useAuth();

  if (user && user.role !== 'PATIENT') {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  }

  const [active, setActive] = useState(null);
  const [amb, setAmb] = useState([]);
  const [hosp, setHosp] = useState([]);
  const [pos, setPos] = useState([17.385, 78.4867]);

  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showCancelPopup, setShowCancelPopup] = useState(false);

  // Load patient emergency, ambulances and hospitals.
  const load = useCallback(async () => {
    if (!user?.userId) return;

    try {
      const response = await api.get(
        `/emergency/patient/${user.userId}`
      );

      const emergencies = Array.isArray(response.data)
        ? response.data
        : [];

      const currentEmergency = emergencies.find((item) => {
        const currentStatus = String(
          item.status || ''
        ).toUpperCase();

        return ![
          'COMPLETED',
          'CANCELLED',
          'NO_AMBULANCE',
        ].includes(currentStatus);
      });

      setActive(currentEmergency || null);
    } catch (err) {
      console.error('Could not load emergencies:', err);

      setError(
        err.response?.data?.message ||
          'Could not load your emergency information.'
      );
    }

    try {
      const [ambulanceResponse, hospitalResponse] =
        await Promise.all([
          api.get('/ambulances'),
          api.get('/hospitals'),
        ]);

      setAmb(
        Array.isArray(ambulanceResponse.data)
          ? ambulanceResponse.data
          : []
      );

      setHosp(
        Array.isArray(hospitalResponse.data)
          ? hospitalResponse.data
          : []
      );
    } catch (err) {
      console.error('Could not load map information:', err);
    }
  }, [user?.userId]);

  // Load dashboard information and refresh periodically.
  useEffect(() => {
    load();

    const timer = setInterval(load, 5000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPos([
            position.coords.latitude,
            position.coords.longitude,
          ]);
        },
        (err) => {
          console.warn(
            'Could not access location:',
            err.message
          );
        }
      );
    }

    return () => clearInterval(timer);
  }, [load]);

  // Update emergency status.
  const status = async (newStatus, confirmed = false) => {
    if (!active || updating) return;

    const currentStatus = String(
      active.status || ''
    ).toUpperCase();

    // A patient must confirm cancellation first.
    if (newStatus === 'CANCELLED' && !confirmed) {
      setError('');
      setShowCancelPopup(true);
      return;
    }

    // The driver should complete the trip.
    if (newStatus === 'COMPLETED') {
      setError(
        'The driver must complete the trip from the Driver Dashboard.'
      );
      return;
    }

    // Validate cancellation eligibility.
    const cancellableStatuses = [
      'SEARCHING',
      'QUEUED',
      'ASSIGNED',
      'ARRIVED',
      'PICKED_UP',
    ];

    if (
      newStatus === 'CANCELLED' &&
      !cancellableStatuses.includes(currentStatus)
    ) {
      setError(
        `This emergency cannot be cancelled while its status is ${currentStatus}.`
      );
      return;
    }

    setUpdating(true);
    setError('');

    try {
      if (newStatus === 'CANCELLED') {
        // Use the existing backend cancellation endpoint.
        await api.post(
          `/emergency/${active.id}/cancel`
        );

        setShowCancelPopup(false);
      } else {
        await api.put(
          `/emergency/${active.id}/status`,
          null,
          {
            params: {
              value: newStatus,
            },
          }
        );
      }

      // Refresh the dashboard after the request succeeds.
      await load();
    } catch (err) {
      console.error(
        'Could not update emergency status:',
        err
      );

      setError(
        err.response?.data?.message ||
          'Could not update the emergency. Please try again.'
      );
    } finally {
      setUpdating(false);
    }
  };

  // Called when the patient clicks "Yes, Cancel".
  const confirmCancel = async () => {
    await status('CANCELLED', true);
  };

  // Map markers.
  const points = [
    ...amb
      .filter(
        (ambulance) =>
          ambulance.latitude != null &&
          ambulance.longitude != null
      )
      .map((ambulance) => ({
        lat: Number(ambulance.latitude),
        lng: Number(ambulance.longitude),
        title: ambulance.ambulanceNumber,
        subtitle: ambulance.status,
      })),

    ...hosp
      .filter(
        (hospital) =>
          hospital.latitude != null &&
          hospital.longitude != null
      )
      .map((hospital) => ({
        lat: Number(hospital.latitude),
        lng: Number(hospital.longitude),
        title: hospital.name,
        subtitle: 'Hospital',
      })),

    {
      lat: pos[0],
      lng: pos[1],
      title: 'Your location',
      subtitle: 'Patient',
    },
  ];

  return (
    <>
      <Navbar />

      <div className="layout">
        <Sidebar />

        <main className="content">
          <div className="row between">
            <div>
              <div className="eyebrow">
                Patient command
              </div>

              <h1>
                Good to see you,{' '}
                {user?.name?.split(' ')[0] || 'Patient'}
              </h1>

              <p className="muted">
                One-tap emergency dispatch with live ambulance
                coordination.
              </p>
            </div>

            <Link
              className="primary linkbtn"
              to="/emergency"
            >
              🚨 Request ambulance
            </Link>
          </div>

          {/* Dashboard statistics */}
          <div className="stats">
            <div className="stat">
              <b>
                {
                  amb.filter(
                    (ambulance) =>
                      ambulance.status === 'AVAILABLE'
                  ).length
                }
              </b>
              <span>Available</span>
            </div>

            <div className="stat">
              <b>{amb.length}</b>
              <span>Ambulances</span>
            </div>

            <div className="stat">
              <b>{hosp.length}</b>
              <span>Hospitals</span>
            </div>

            <div className="stat">
              <b>{active ? '1' : '0'}</b>
              <span>Active emergency</span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="alert danger"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              {error}

              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                style={{
                  float: 'right',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Active emergency card */}
          {active && (
            <div
              style={{
                opacity: updating ? 0.7 : 1,
                pointerEvents: updating ? 'none' : 'auto',
              }}
            >
              <EmergencyCard
                request={active}
                onStatus={status}
              />

              {updating && (
                <p className="muted">
                  Updating emergency status...
                </p>
              )}
            </div>
          )}

          {/* Live response map */}
          <div className="card mapCard">
            <div className="row between">
              <h2>Live response map</h2>

              <span className="muted">
                Leaflet + OpenStreetMap
              </span>
            </div>

            <Map center={pos} points={points} />
          </div>
        </main>
      </div>

      {/* Custom cancellation confirmation popup */}
      {showCancelPopup && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCancelPopup(false);
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.60)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-popup-title"
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: 28,
              width: '100%',
              maxWidth: 420,
              boxSizing: 'border-box',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              animation: 'cancelPopupAppear 0.2s ease-out',
            }}
          >
            <style>
              {`
                @keyframes cancelPopupAppear {
                  from {
                    opacity: 0;
                    transform: scale(0.95);
                  }
                  to {
                    opacity: 1;
                    transform: scale(1);
                  }
                }

                .cancel-popup-button {
                  min-height: 44px;
                  padding: 11px 20px;
                  border-radius: 9px;
                  font-weight: 600;
                  font-size: 14px;
                  cursor: pointer;
                  transition: background 0.2s;
                }

                .cancel-popup-no {
                  border: 1px solid #cbd5e1;
                  background: #ffffff;
                  color: #1e293b;
                }

                .cancel-popup-no:hover {
                  background: #f1f5f9;
                }

                .cancel-popup-yes {
                  border: 1px solid #dc2626;
                  background: #dc2626;
                  color: #ffffff;
                }

                .cancel-popup-yes:hover {
                  background: #b91c1c;
                }

                .cancel-popup-button:disabled {
                  opacity: 0.6;
                  cursor: not-allowed;
                }
              `}
            </style>

            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 30,
              }}
            >
              ⚠️
            </div>

            <h2
              id="cancel-popup-title"
              style={{
                margin: '0 0 12px',
                color: '#0f172a',
                fontSize: 23,
              }}
            >
              Cancel Emergency?
            </h2>

            <p
              style={{
                color: '#64748b',
                lineHeight: 1.7,
                fontSize: 15,
                margin: '0 0 24px',
              }}
            >
              Are you sure you want to cancel your ambulance
              request? Please confirm your choice.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                className="cancel-popup-button cancel-popup-no"
                disabled={updating}
                onClick={() => setShowCancelPopup(false)}
              >
                No, Go Back
              </button>

              <button
                type="button"
                className="cancel-popup-button cancel-popup-yes"
                disabled={updating}
                onClick={confirmCancel}
              >
                {updating ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}