# RapidRescue API Documentation

All protected APIs require:

`Authorization: Bearer <JWT>`

## Register

`POST /api/auth/register`

```json
{
  "fullName":"Demo Patient",
  "email":"patient@example.com",
  "phone":"9000000022",
  "password":"Patient@123",
  "role":"PATIENT"
}
```

## Login

`POST /api/auth/login`

```json
{
  "email":"patient@example.com",
  "password":"Patient@123"
}
```

## Emergency request

`POST /api/emergency`

```json
{
  "patientId":1,
  "latitude":17.385,
  "longitude":78.4867,
  "priority":"CRITICAL",
  "type":"CARDIAC",
  "notes":"Chest pain"
}
```

## Tracking

`GET /api/tracking/{token}`

Returns current status, pickup coordinates, ambulance, hospital and tracking metadata.

## Location

`POST /api/location/{ambulanceId}`

```json
{
  "latitude":17.390,
  "longitude":78.490
}
```

## Status

`PUT /api/emergency/{id}/status?value=ARRIVED`

Allowed trip states include:
- ASSIGNED
- ARRIVED
- PICKED_UP
- COMPLETED
- CANCELLED
