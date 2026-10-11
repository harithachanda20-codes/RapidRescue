import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

export default function EmergencyRequest() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [hospitals, setHospitals] = useState([]);

  const [f, setF] = useState({
    priority: 'CRITICAL',
    type: 'CARDIAC',
    notes: '',
    pickupAddress: '',
    destinationHospital: '',
    latitude: '',
    longitude: '',
  });

  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [err, setErr] = useState('');

  // Load hospitals from the backend
  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const response = await api.get('/hospitals');
        setHospitals(response.data || []);
      } catch (error) {
        console.error('Could not load hospitals:', error);
      }
    };

    loadHospitals();
  }, []);

  // Update form fields
  const handleChange = (event) => {
    const { name, value } = event.target;

    setF((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Get patient's current GPS location
  const useCurrentLocation = () => {
    setErr('');

    if (!navigator.geolocation) {
      setErr('Your browser does not support location access.');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setF((previous) => ({
          ...previous,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          pickupAddress:
            `Current location (${position.coords.latitude.toFixed(6)}, ` +
            `${position.coords.longitude.toFixed(6)})`,
        }));

        setLocating(false);
      },
      () => {
        setErr(
          'Could not access your location. Allow location permission or enter your pickup address manually.'
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Submit emergency request
  const submit = async (event) => {
    event.preventDefault();
    setErr('');

    if (!f.pickupAddress.trim()) {
      setErr('Please enter your pickup location.');
      return;
    }

    if (!f.destinationHospital) {
      setErr('Please select a destination hospital.');
      return;
    }

    if (f.latitude === '' || f.longitude === '') {
      setErr(
        'Please click "Use My Current Location" so the ambulance can find you.'
      );
      return;
    }

    setBusy(true);

    try {
      const selectedHospital = hospitals.find(
        (hospital) =>
          String(hospital.id) === String(f.destinationHospital)
      );

      if (!selectedHospital) {
        throw new Error('Please select a valid destination hospital.');
      }

      // Preserve the existing emergency API fields.
      // Additional destination fields are included for backend integration.
      const payload = {
        patientId: user.userId,
        latitude: Number(f.latitude),
        longitude: Number(f.longitude),
        priority: f.priority,
        type: f.type,
        notes: f.notes,

        pickupAddress: f.pickupAddress.trim(),
        destinationHospitalId: selectedHospital.id,
        destinationHospital: selectedHospital.name,
        destinationLatitude: selectedHospital.latitude,
        destinationLongitude: selectedHospital.longitude,
      };

      const response = await api.post('/emergency', payload);

      if (response.data?.trackingToken) {
        nav(
          '/tracking?token=' +
            encodeURIComponent(response.data.trackingToken)
        );
      } else {
        nav('/history');
      }
    } catch (error) {
      setErr(
        error.response?.data?.message ||
          error.message ||
          'Could not create emergency. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="layout">
        <Sidebar />

        <main className="content narrow">
          <div className="eyebrow">Emergency dispatch</div>

          <h1>Request an ambulance</h1>

          <p className="muted">
            Provide your pickup location and destination hospital
            to coordinate your emergency response.
          </p>

          <form className="card form" onSubmit={submit}>
            {/* Pickup location */}
            <label>
              📍 Pickup Location

              <input
                type="text"
                name="pickupAddress"
                placeholder="Enter your pickup address"
                value={f.pickupAddress}
                onChange={handleChange}
                required
              />
            </label>

            <button
              type="button"
              className="secondary wide"
              onClick={useCurrentLocation}
              disabled={locating}
            >
              {locating
                ? 'Getting your location...'
                : '📍 Use My Current Location'}
            </button>

            {f.latitude !== '' && f.longitude !== '' && (
              <div className="muted">
                Location captured: {Number(f.latitude).toFixed(5)},{' '}
                {Number(f.longitude).toFixed(5)}
              </div>
            )}

            {/* Destination hospital */}
            <label>
              🏥 Destination Hospital

              <select
                name="destinationHospital"
                value={f.destinationHospital}
                onChange={handleChange}
                required
              >
                <option value="">Select a hospital</option>

                {hospitals.map((hospital) => (
                  <option
                    key={hospital.id}
                    value={hospital.id}
                  >
                    {hospital.name}
                  </option>
                ))}
              </select>
            </label>

            {hospitals.length === 0 && (
              <p className="muted">
                No hospitals are available to select. Check that
                your backend has hospital records.
              </p>
            )}

            {/* Emergency priority */}
            <label>
              Priority

              <select
                name="priority"
                value={f.priority}
                onChange={handleChange}
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="NORMAL">NORMAL</option>
              </select>
            </label>

            {/* Emergency type */}
            <label>
              Emergency Type

              <select
                name="type"
                value={f.type}
                onChange={handleChange}
              >
                <option value="CARDIAC">CARDIAC</option>
                <option value="ACCIDENT">ACCIDENT</option>
                <option value="PREGNANCY">PREGNANCY</option>
                <option value="OTHER">OTHER</option>
              </select>
            </label>

            {/* Additional notes */}
            <label>
              Notes

              <textarea
                name="notes"
                rows="4"
                placeholder="Symptoms, injuries or special instructions"
                value={f.notes}
                onChange={handleChange}
              />
            </label>

            {err && (
              <div className="alert danger">
                {err}
              </div>
            )}

            <button
              type="submit"
              className="primary wide"
              disabled={busy || locating}
            >
              {busy
                ? 'Sending emergency request...'
                : '🚨 Send Emergency Request'}
            </button>
          </form>
        </main>
      </div>
    </>
  );
}