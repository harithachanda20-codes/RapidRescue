# RapidRescue — Complete Full-Stack Emergency Response System

RapidRescue is an emergency ambulance booking, dispatch, live location tracking and hospital coordination platform. This version is a **refactor of the provided RapidRescue ZIP**, preserving its core workflow while moving the backend to Spring Boot and the UI to React/Vite.

## What was preserved from the supplied project

The original project already contained a Node/Express + Socket.IO backend, SQLite persistence, patient/driver/hospital/admin views, live tracking, hospital data, an ambulance simulator, request queueing and nearest-ambulance dispatch. The new implementation keeps the same product flow and domain concepts rather than replacing RapidRescue with a generic CRUD application.

The important workflow remains:

`Patient -> Emergency Request -> Dispatch -> Ambulance/Driver -> Live GPS -> Hospital -> Completion`

## Stack

- Java 21
- Spring Boot 3.4
- Spring Web / Validation
- Spring Data JPA + PostgreSQL
- Spring Security + BCrypt + JWT
- Spring WebSocket/STOMP for Java-native real-time messaging
- React 19 + Vite
- React Router
- Axios
- Leaflet + OpenStreetMap
- Docker Compose
- PostgreSQL 16

### Note about Socket.IO

The source project used Socket.IO. Because the requested final backend architecture is Spring Boot, the realtime layer is adapted to Spring WebSocket/STOMP rather than running a second Node backend. The same realtime responsibilities are retained: driver location updates, request updates and live tracking channels.

## Main features

- Patient registration/login
- Driver registration/login
- Admin login
- JWT authentication
- BCrypt password hashing
- Role-based authorization
- Emergency request creation from browser GPS
- Critical/normal priority
- Cardiac, accident, pregnancy and other emergency types
- Nearest available ambulance dispatch
- Queue when no ambulance is available
- Ambulance/driver status
- Hospital directory and nearby hospital ordering
- Live ambulance location storage
- Live tracking by tracking token
- Booking history
- Hospital acknowledgement
- Admin operations dashboard
- PostgreSQL schema and seed setup
- Docker Compose
- Backend unit tests

## Demo accounts

The backend seeds:

**Admin**
- Email: `admin@rapidrescue.com`
- Password: `Admin@123`

**Driver**
- Email: `driver@rapidrescue.com`
- Password: `Driver@123`

Patients should be registered from the UI.

## Run locally

### 1. Start PostgreSQL

Create a database named `rapidrescue`.

```bash
createdb rapidrescue
```

Or run the SQL in `database/schema.sql`.

### 2. Backend

```bash
cd backend
mvn spring-boot:run
```

The backend runs on `http://localhost:8080`.

Environment variables are documented in `.env.example`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

### 4. Test flow

1. Register a patient.
2. Open **Request Ambulance**.
3. Allow browser location.
4. Create a critical emergency.
5. The seeded demo ambulance is available near central Hyderabad.
6. The request is assigned to the nearest available ambulance.
7. Open the Driver dashboard using the demo driver account.
8. Move the trip through **Arrived -> Picked Up -> Complete**.
9. Open the patient Live Tracking page.
10. Check Booking History.
11. Sign in as Admin to see active operations.

## Docker

From the repository root:

```bash
docker compose up --build
```

Frontend: `http://localhost`

Backend: `http://localhost:8080`

PostgreSQL: `localhost:5432`

## API groups

### Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Patients

- `GET /api/patients/{id}`
- `GET /api/patients/{id}/bookings`

### Ambulances

- `GET /api/ambulances`
- `GET /api/ambulances/available`
- `POST /api/ambulances`
- `PUT /api/ambulances/{id}`

### Drivers

- `GET /api/drivers`
- `POST /api/drivers/{id}/status`
- `PUT /api/drivers/{id}/location`
- `PUT /api/drivers/emergency/{requestId}/status?status=...`

### Hospitals

- `GET /api/hospitals`
- `GET /api/hospitals/nearby?lat=...&lng=...`

### Emergency

- `POST /api/emergency`
- `GET /api/emergency/{id}`
- `PUT /api/emergency/{id}/status?value=...`
- `POST /api/emergency/{id}/cancel`
- `GET /api/emergency/patient/{patientId}`
- `POST /api/emergency/{id}/hospital-ack`
- `GET /api/emergency/active`

### Booking

- `GET /api/bookings/{id}`
- `GET /api/bookings/patient/{patientId}`

### Location / tracking

- `POST /api/location/{ambulanceId}`
- `GET /api/location/{ambulanceId}`
- `GET /api/tracking/{token}`

### Realtime

WebSocket endpoint:

`/ws`

STOMP destinations include:

- `/topic/requests`
- `/topic/tracking/{bookingId}`
- `/topic/ambulance/{ambulanceId}`

## Architecture

```text
React/Vite
   |
   | Axios REST + WebSocket/STOMP
   v
Spring Boot
   |
   +--> Controllers
   +--> Services
   +--> Repositories
   +--> JWT Security
   +--> Realtime Socket Layer
   |
   v
PostgreSQL
```

## Source-to-target refactor

The supplied project used:
- Node.js/Express
- SQLite
- Socket.IO
- server-rendered/static HTML pages
- Leaflet
- a JavaScript ambulance simulator

The target version moves:
- Express routes -> Spring controllers
- request logic -> Spring services
- SQLite -> PostgreSQL/JPA
- static pages -> React components/pages
- Socket.IO responsibilities -> Spring WebSocket/STOMP
- in-memory/SQLite domain records -> relational entities and repositories
- browser pages -> role-based React routes

The original emergency concepts, hospital seed information, live map behavior and dispatch workflow remain RapidRescue functionality.

## Verification status

### Verified in this environment
- Source ZIP was inspected.
- Target project files were generated.
- Project structure and source-to-target mapping were created.
- Static file/content consistency checks were performed.

### NOT VERIFIED
- Full Maven compilation/tests could not be executed because Maven is not installed in the execution environment.
- Full `npm install`/Vite build could not be completed within the available execution timeout.
- Docker Compose was not started in this environment.

Therefore this deliverable does **not** claim that every runtime path is fully verified.

## Important production hardening

Before production deployment:
- replace demo passwords
- generate a strong JWT secret
- add HTTPS
- add rate limiting
- add audit logs
- use database migrations such as Flyway
- validate ownership of patient/driver resources
- add production SMS provider integration
- add proper hospital/ambulance administration workflows
