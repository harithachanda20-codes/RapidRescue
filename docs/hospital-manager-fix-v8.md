# Hospital Manager authorization fix (V8)

This patch focuses on the manager workflow in the uploaded V7 project.

## Changes
- Made the Spring Data manager relationship query explicit (`findByManager_Id`) to avoid ambiguous property parsing.
- Added explicit authenticated-user, active-account, database-role, and assigned-hospital checks to the manager hospital endpoint and availability update.
- Kept manager emergency acknowledgement and hospital booking access guarded by service-layer checks against the authenticated database user and assigned hospital, rather than relying only on duplicated controller method-security annotations.
- Preserved Admin-only authorization for manager listing and assignment.

## Local verification required
The source archive was inspected and patched, but Maven is not installed in the build environment and no live PostgreSQL database is available here. Run the backend from IntelliJ and test with a registered `HOSPITAL_MANAGER` account assigned to an active hospital. The `/api/auth/me` response should show the expected email and role; `/api/hospitals/my-hospital` should then return that hospital.
