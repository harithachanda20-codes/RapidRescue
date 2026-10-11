import { useEffect, useState } from 'react';

import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Map from '../components/Map';
import api from '../services/api';

export default function Hospitals() {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadHospitals() {
      try {
        const response = await api.get('/hospitals');

        if (mounted) {
          setHospitals(
            Array.isArray(response.data) ? response.data : []
          );
        }
      } catch (err) {
        if (mounted) {
          setError(
            err.response?.data?.message ||
              'Unable to load hospitals. Please try again.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadHospitals();

    return () => {
      mounted = false;
    };
  }, []);

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
      subtitle: hospital.address || hospital.phone || 'Hospital',
    }));

  return (
    <>
      <Navbar />

      <div className="layout">
        <Sidebar />

        <main className="content">
          <div className="eyebrow">Care network</div>

          <h1>Emergency Hospitals</h1>

          <p style={{ color: '#64748b' }}>
            View registered hospitals, contact details, emergency
            availability, and locations.
          </p>

          {error && (
            <div className="card" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="card">Loading hospitals...</div>
          ) : hospitals.length === 0 ? (
            <div className="card">
              No hospitals are currently registered.
            </div>
          ) : (
            <div className="cards">
              {hospitals.map((hospital) => (
                <div className="card" key={hospital.id}>
                  <h3>🏥 {hospital.name}</h3>

                  <p>
                    <strong>Address:</strong>{' '}
                    {hospital.address || 'Not provided'}
                  </p>

                  <p>
                    <strong>Phone:</strong>{' '}
                    {hospital.phone || 'Not provided'}
                  </p>

                  <p>
                    <strong>Capacity:</strong>{' '}
                    {hospital.capacity ?? 'Not specified'}
                  </p>

                  <span
                    className="badge"
                    style={{
                      background: hospital.emergencyAvailable
                        ? '#dcfce7'
                        : '#fee2e2',
                      color: hospital.emergencyAvailable
                        ? '#166534'
                        : '#991b1b',
                    }}
                  >
                    {hospital.emergencyAvailable
                      ? '🟢 Accepting Emergencies'
                      : '🔴 Emergency Services Unavailable'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <section className="card" style={{ marginTop: 24 }}>
            <h2>📍 Hospital Locations</h2>

            {mapPoints.length > 0 ? (
              <Map points={mapPoints} />
            ) : (
              <p style={{ color: '#64748b' }}>
                Hospital locations are not available on the map yet.
              </p>
            )}
          </section>
        </main>
      </div>
    </>
  );
}