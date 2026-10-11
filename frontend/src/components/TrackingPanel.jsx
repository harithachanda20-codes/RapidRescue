const STEPS = [
  {
    status: 'SEARCHING',
    title: 'Finding an Ambulance',
    description: 'Searching for an available ambulance.',
  },
  {
    status: 'ASSIGNED',
    title: 'Ambulance Assigned',
    description: 'A driver has accepted your emergency.',
  },
  {
    status: 'ARRIVED',
    title: 'Ambulance Arrived',
    description: 'The ambulance has reached your pickup location.',
  },
  {
    status: 'PICKED_UP',
    title: 'Patient Picked Up',
    description: 'The journey to the hospital has started.',
  },
  {
    status: 'COMPLETED',
    title: 'Trip Completed',
    description: 'The ambulance trip has been completed.',
  },
];

const STATUS_MESSAGES = {
  SEARCHING: 'We are finding an available ambulance.',
  QUEUED: 'Your emergency is waiting for an ambulance.',
  NO_AMBULANCE: 'No ambulance is currently available.',
  ASSIGNED: 'Your ambulance has been assigned.',
  ARRIVED: 'Your ambulance has arrived at the pickup location.',
  PICKED_UP: 'You are on your way to the hospital.',
  COMPLETED: 'Your ambulance trip is complete.',
  CANCELLED: 'This emergency request has been cancelled.',
};

export default function TrackingPanel({ data }) {
  if (!data) {
    return (
      <div className="card">
        <div className="eyebrow">Live status</div>
        <h2>No Active Trip</h2>
        <p>Create an emergency request to start tracking.</p>
      </div>
    );
  }

  const status = String(data.status || 'SEARCHING').toUpperCase();

  const currentStep = STEPS.findIndex(
    (step) => step.status === status
  );

  const isClosed = ['COMPLETED', 'CANCELLED', 'NO_AMBULANCE'].includes(
    status
  );

  const driverName = data.ambulance?.driverName;
  const ambulanceNumber = data.ambulance?.ambulanceNumber;
  const hospitalName = data.hospital?.name;
  const hospitalAddress = data.hospital?.address;

  return (
    <section className="card" aria-live="polite">
      <div className="eyebrow">LIVE EMERGENCY STATUS</div>

      <h2 style={{ marginBottom: 8 }}>
        {STEPS.find((step) => step.status === status)?.title ||
          status.replaceAll('_', ' ')}
      </h2>

      <p style={{ color: '#64748b' }}>
        {STATUS_MESSAGES[status] ||
          'Your emergency status is being updated.'}
      </p>

      {!isClosed && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: 8,
            margin: '24px 0',
          }}
        >
          {STEPS.map((step, index) => {
            const completed =
              currentStep >= 0 && index < currentStep;

            const active = index === currentStep;

            return (
              <div
                key={step.status}
                style={{
                  textAlign: 'center',
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    margin: '0 auto 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                      completed || active ? '#16a34a' : '#e2e8f0',
                    color:
                      completed || active ? '#fff' : '#64748b',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {completed ? '✓' : index + 1}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    fontWeight: active ? 700 : 500,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {step.title}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {status === 'CANCELLED' && (
        <p style={{ color: '#b91c1c', fontWeight: 600 }}>
          Emergency cancelled
        </p>
      )}

      {status === 'NO_AMBULANCE' && (
        <p style={{ color: '#b45309', fontWeight: 600 }}>
          No ambulance available
        </p>
      )}

      <hr
        style={{
          border: 0,
          borderTop: '1px solid #e2e8f0',
          margin: '20px 0',
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 20,
        }}
      >
        <div>
          <div className="eyebrow">AMBULANCE</div>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>
            {ambulanceNumber
              ? `🚑 ${ambulanceNumber}`
              : 'Waiting for assignment'}
          </p>

          {driverName && (
            <p style={{ margin: '4px 0' }}>
              Driver: {driverName}
            </p>
          )}
        </div>

        <div>
          <div className="eyebrow">DESTINATION HOSPITAL</div>

          <p style={{ fontWeight: 600, marginBottom: 6 }}>
            {hospitalName || 'Hospital pending'}
          </p>

          {hospitalAddress && (
            <p style={{ margin: '4px 0', color: '#64748b' }}>
              {hospitalAddress}
            </p>
          )}
        </div>
      </div>

      <p
        style={{
          fontSize: 12,
          color: '#64748b',
          marginBottom: 0,
          marginTop: 20,
        }}
      >
        Status updates appear automatically when new tracking
        information is received.
      </p>
    </section>
  );
}