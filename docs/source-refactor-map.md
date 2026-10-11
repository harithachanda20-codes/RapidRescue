# Source-to-Target Refactor Map

This document records how the provided RapidRescue implementation was used as the reference.

| Supplied implementation | New location | Preserved behavior |
|---|---|---|
| `server.js` Express routes | Spring controllers/services | Emergency request, dispatch, tracking, hospital, admin operations |
| SQLite `requests` table | `EmergencyRequest` + `Booking` + `Location` JPA entities | Persistent emergency/trip state |
| `ambulances` in-memory records | `Ambulance` + `Driver` entities | Availability, assignment, GPS |
| `hospitals.json` | PostgreSQL/JPA seed via `DatabaseConfig` | Hyderabad emergency hospitals |
| `public/index.html` | React `Dashboard` + `EmergencyRequest` | Patient request flow |
| `public/driver.html` | `DriverDashboard` | Driver dispatch/trip status |
| `public/hospital.html` | Hospital APIs/pages | Hospital coordination |
| `public/admin.html` | `AdminDashboard` | Operations dashboard |
| `public/track.html` | `LiveTracking` + WebSocket | Live ambulance tracking |
| Leaflet/OpenStreetMap | React `Map` | Patient/ambulance/hospital map |
| Socket.IO events | Spring WebSocket/STOMP | Realtime request/location notifications |
| `simulator.js` behavior | seeded demo driver + Driver UI | Demonstrable driver coordination |

The source project was not copied blindly. Its product behavior was translated into the requested layered Spring Boot + React architecture.
