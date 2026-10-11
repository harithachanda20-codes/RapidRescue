# RapidRescue Architecture

## Layers

`Controller -> Service -> Repository -> PostgreSQL`

Cross-cutting concerns:
- JWT security
- BCrypt password hashing
- validation
- centralized exception handling
- WebSocket/STOMP realtime messaging

## Domain

- User: authentication identity and role
- Patient: patient profile
- Driver: licensed emergency driver and GPS state
- Ambulance: emergency vehicle assigned to a driver
- Hospital: destination/care facility
- EmergencyRequest: dispatch case and tracking token
- Booking: operational trip record
- Location: ambulance GPS history

## Emergency flow

1. Patient sends coordinates and emergency type.
2. EmergencyService creates an EmergencyRequest.
3. HospitalService selects the nearest seeded hospital.
4. EmergencyService finds the nearest available ambulance.
5. If none is available, the request is queued.
6. Assignment creates a Booking.
7. Driver updates status and location.
8. LocationService persists GPS points.
9. SocketHandler publishes realtime updates.
10. Completion frees the ambulance and closes the booking.

## Realtime

The original implementation used Socket.IO. The Spring Boot migration uses STOMP over WebSocket to keep realtime communication inside the requested Java backend.

Channels:
- `/topic/requests`
- `/topic/tracking/{bookingId}`
- `/topic/ambulance/{ambulanceId}`
