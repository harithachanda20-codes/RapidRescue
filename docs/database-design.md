# RapidRescue Database Design

PostgreSQL is the system of record.

## Relationships

```text
User 1---1 Patient
User 1---1 Driver
Driver 1---1 Ambulance
Patient 1---N EmergencyRequest
EmergencyRequest N---1 Ambulance
EmergencyRequest N---1 Driver
EmergencyRequest N---1 Hospital
EmergencyRequest 1---1 Booking
Booking N---1 Patient
Booking N---1 Driver
Booking N---1 Ambulance
Booking N---1 Hospital
Ambulance 1---N Location
Location N---1 Booking (optional)
```

Indexes are defined for emergency status, patient history and ambulance location history.

`trackingToken` is unique and is used by the live tracking route.
