import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function EmergencyCard({ request, onStatus }) {
  const { user } = useAuth();
  if (!request) return null;

  const currentStatus = String(request.status || '').toUpperCase();
  const canCancel = !['COMPLETED', 'CANCELLED', 'NO_AMBULANCE'].includes(currentStatus);

  return (
    <div className="card emergencyCard">
      <div className="row between">
        <div>
          <span className="eyebrow">Emergency Case #{request.id}</span>
          <h2 style={{ margin: '4px 0 8px' }}>
            {request.type ? request.type.replaceAll('_', ' ') : 'Medical Emergency'}
          </h2>
        </div>
        <span className={`badge ${String(request.priority || '').toLowerCase()}`}>
          {request.priority || 'NORMAL'}
        </span>
      </div>

      <div style={{ margin: '14px 0' }}>
        <p style={{ margin: '6px 0' }}>
          <strong>Status:</strong>{' '}
          <span className="badge" style={{ fontSize: 13, padding: '4px 10px' }}>
            {currentStatus}
          </span>
        </p>

        {request.ambulance && (
          <p style={{ margin: '6px 0' }}>
            🚑 <strong>Ambulance:</strong> {request.ambulance.ambulanceNumber}{' '}
            {request.ambulance.type ? `(${request.ambulance.type})` : ''} ·{' '}
            <strong>Driver:</strong> {request.ambulance.driverName || 'Assigned Driver'}{' '}
            {request.ambulance.driverPhone ? `(📞 ${request.ambulance.driverPhone})` : ''}
          </p>
        )}

        {request.hospital && (
          <p style={{ margin: '6px 0' }}>
            🏥 <strong>Destination Hospital:</strong> {request.hospital.name}{' '}
            {request.hospital.address ? `· ${request.hospital.address}` : ''}{' '}
            {request.hospital.phone ? `(📞 ${request.hospital.phone})` : ''}
          </p>
        )}

        {request.notes && (
          <p style={{ margin: '6px 0', color: '#64748b' }}>
            📝 <strong>Notes:</strong> {request.notes}
          </p>
        )}
      </div>

      <div className="actions" style={{ marginTop: 16 }}>
        {user?.role === 'PATIENT' && request.trackingToken && (
          <Link
            to={`/tracking?token=${encodeURIComponent(request.trackingToken)}`}
            className="primary linkbtn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            📍 Track Ambulance Live
          </Link>
        )}

        {canCancel && onStatus && (
          <button
            type="button"
            className="danger"
            onClick={() => onStatus('CANCELLED')}
          >
            Cancel Request
          </button>
        )}
      </div>
    </div>
  );
}