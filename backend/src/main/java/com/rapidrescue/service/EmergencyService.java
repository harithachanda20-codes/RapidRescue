package com.rapidrescue.service;

import com.rapidrescue.dto.*;
import com.rapidrescue.entity.*;
import com.rapidrescue.repository.*;
import com.rapidrescue.socket.SocketHandler;
import com.rapidrescue.util.DistanceCalculator;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class EmergencyService {

 private final EmergencyRepository emergencies;
 private final PatientRepository patients;
 private final AmbulanceRepository ambulances;
 private final DriverRepository drivers;
 private final HospitalService hospitals;
 private final HospitalRepository hospitalRepository;
 private final BookingRepository bookings;
 private final SocketHandler socket;
 private final UserRepository users;

 public EmergencyService(
         EmergencyRepository e,
         PatientRepository p,
         AmbulanceRepository a,
         DriverRepository d,
         HospitalService h,
         HospitalRepository hospitalRepository,
         BookingRepository b,
         SocketHandler s,
         UserRepository users) {

  this.emergencies = e;
  this.patients = p;
  this.ambulances = a;
  this.drivers = d;
  this.hospitals = h;
  this.hospitalRepository = hospitalRepository;
  this.bookings = b;
  this.socket = s;
  this.users = users;
 }

 // Get the authenticated account using the email in the JWT principal.
 private User currentUser() {

  Authentication authentication =
          SecurityContextHolder.getContext().getAuthentication();

  if (authentication == null
          || !authentication.isAuthenticated()
          || authentication.getName() == null
          || "anonymousUser".equals(authentication.getName())) {

   throw new AccessDeniedException(
           "You must be logged in to perform this action."
   );
  }

  User user = users.findByEmail(authentication.getName());

  if (user == null || !user.isActive()) {
   throw new AccessDeniedException(
           "Your account is unavailable."
   );
  }

  return user;
 }

 // Retrieve the patient profile belonging to the logged-in patient.
 private Patient currentPatient() {

  User user = currentUser();

  if (user.getRole() != Role.PATIENT) {
   throw new AccessDeniedException(
           "Only patients can perform this action."
   );
  }

  return patients.findByUserId(user.getId())
          .orElseThrow(() ->
                  new NoSuchElementException(
                          "Patient profile not found."
                  )
          );
 }

 // Create an emergency only for the authenticated patient.
 @Transactional
 public TrackingResponse create(EmergencyRequestDto d) {

  Patient patient = currentPatient();

  if (!patient.getId().equals(d.patientId())) {
   throw new AccessDeniedException(
           "You cannot create an emergency for another patient."
   );
  }

  var active = emergencies
          .findByPatientIdOrderByCreatedAtDesc(patient.getId())
          .stream()
          .filter(x -> !List.of(
                  "COMPLETED",
                  "CANCELLED",
                  "NO_AMBULANCE"
          ).contains(x.getStatus()))
          .findFirst();

  if (active.isPresent()) {
   return dto(active.get());
  }

  Hospital selectedHospital;

  if (d.destinationHospitalId() != null) {

   selectedHospital = hospitalRepository
           .findById(d.destinationHospitalId())
           .orElseThrow(() ->
                   new NoSuchElementException(
                           "Selected hospital not found."
                   )
           );

  } else {

   selectedHospital = hospitals.nearest(
           d.latitude(),
           d.longitude()
   );
  }

  EmergencyRequest request = new EmergencyRequest();

  request.setPatient(patient);
  request.setPickupLatitude(d.latitude());
  request.setPickupLongitude(d.longitude());

  request.setPriority(
          "CRITICAL".equalsIgnoreCase(d.priority())
                  ? "CRITICAL"
                  : "NORMAL"
  );

  request.setType(
          d.type() == null
                  ? "OTHER"
                  : d.type().toUpperCase()
  );

  request.setNotes(d.notes());

  request.setTrackingToken(
          UUID.randomUUID()
                  .toString()
                  .replace("-", "")
  );

  request.setHospital(selectedHospital);
  request.setStatus("SEARCHING");

  emergencies.save(request);
  publish(request);

  return dto(request);
 }

 // A driver can accept an emergency only using their own driver profile.
 @Transactional
 public TrackingResponse acceptEmergency(
         Long emergencyId,
         Long driverId) {

  User user = currentUser();

  if (user.getRole() != Role.DRIVER) {
   throw new AccessDeniedException(
           "Only drivers can accept emergencies."
   );
  }

  Driver authenticatedDriver = drivers.findByUserId(user.getId())
          .orElseThrow(() ->
                  new NoSuchElementException(
                          "Driver profile not found."
                  )
          );

  if (!authenticatedDriver.getId().equals(driverId)) {
   throw new AccessDeniedException(
           "You cannot accept an emergency as another driver."
   );
  }

  EmergencyRequest request = emergencies
          .findByIdForUpdate(emergencyId)
          .orElseThrow(() ->
                  new NoSuchElementException(
                          "Emergency request not found."
                  )
          );

  if (!"SEARCHING".equals(request.getStatus())
          && !"QUEUED".equals(request.getStatus())) {

   throw new IllegalStateException(
           "This emergency has already been accepted or is unavailable."
   );
  }

  if (request.getDriver() != null
          || request.getAmbulance() != null) {

   throw new IllegalStateException(
           "This emergency already has an assigned driver."
   );
  }

  if (!authenticatedDriver.isOnline()) {
   throw new IllegalStateException(
           "You must be online to accept an emergency."
   );
  }

  if (!authenticatedDriver.isAvailable()) {
   throw new IllegalStateException(
           "You are currently unavailable for emergencies."
   );
  }

  Ambulance ambulance = authenticatedDriver.getAmbulance();

  if (ambulance == null
          || !ambulance.isActive()
          || !ambulance.isEmergencyAvailable()
          || !"AVAILABLE".equals(ambulance.getStatus())) {

   throw new IllegalStateException(
           "You do not have an available ambulance assigned to you."
   );
  }

  request.setDriver(authenticatedDriver);
  request.setAmbulance(ambulance);
  request.setStatus("ASSIGNED");
  request.setAssignedAt(LocalDateTime.now());
  request.touch();

  ambulance.setStatus("BUSY");
  authenticatedDriver.setAvailable(false);

  ambulances.save(ambulance);
  emergencies.save(request);

  if (bookings.findByEmergencyRequestId(request.getId()).isEmpty()) {

   Booking booking = new Booking();

   booking.setEmergencyRequest(request);
   booking.setPatient(request.getPatient());
   booking.setDriver(authenticatedDriver);
   booking.setAmbulance(ambulance);
   booking.setHospital(request.getHospital());
   booking.setStatus("ASSIGNED");
   booking.setBookingTime(LocalDateTime.now());

   bookings.save(booking);
  }

  publish(request);

  return dto(request);
 }

 // Retained for compatibility with existing dispatch calls.
 @Transactional
 public void dispatch(EmergencyRequest request) {

  if (request.getId() == null) {
   emergencies.save(request);
  }

  request.setStatus("SEARCHING");
  request.touch();

  emergencies.save(request);
  publish(request);
 }

 // Update status without a supplied trip distance.
 @Transactional
 public TrackingResponse updateStatus(Long id, String status) {
  return updateStatus(id, status, null);
 }

 // Update status only for the authenticated, assigned driver.
 @Transactional
 public TrackingResponse updateStatusForDriver(
         Long emergencyId,
         String status,
         Double tripDistanceKm,
         Long driverId) {

  User user = currentUser();

  if (user.getRole() != Role.DRIVER) {
   throw new AccessDeniedException(
           "Only drivers can perform this action."
   );
  }

  Driver driver = drivers.findByUserId(user.getId())
          .orElseThrow(() ->
                  new NoSuchElementException(
                          "Driver profile not found."
                  )
          );

  if (!driver.getId().equals(driverId)) {
   throw new AccessDeniedException(
           "You cannot act as another driver."
   );
  }

  EmergencyRequest request = get(emergencyId);

  if (request.getDriver() == null
          || !request.getDriver().getId().equals(driver.getId())) {

   throw new AccessDeniedException(
           "You cannot update another driver's emergency."
   );
  }

  return updateStatusInternal(
          emergencyId, status, tripDistanceKm, driver
  );
 }

 // Update status for an authorized driver or administrator.
 @Transactional
 public TrackingResponse updateStatus(
         Long id,
         String status,
         Double tripDistanceKm) {

  User user = currentUser();

  if (user.getRole() == Role.ADMIN) {
   return updateStatusInternal(id, status, tripDistanceKm, null);
  }

  if (user.getRole() != Role.DRIVER) {
   throw new AccessDeniedException(
           "You are not authorized to update emergency status."
   );
  }

  Driver driver = drivers.findByUserId(user.getId())
          .orElseThrow(() ->
                  new NoSuchElementException(
                          "Driver profile not found."
                  )
          );

  EmergencyRequest request = get(id);

  if (request.getDriver() == null
          || !request.getDriver().getId().equals(driver.getId())) {

   throw new AccessDeniedException(
           "You cannot update another driver's emergency."
   );
  }

  return updateStatusInternal(id, status, tripDistanceKm, driver);
 }

 private TrackingResponse updateStatusInternal(
         Long id,
         String status,
         Double tripDistanceKm,
         Driver expectedDriver) {

  EmergencyRequest request = get(id);

  if (expectedDriver != null
          && (request.getDriver() == null
          || !request.getDriver().getId().equals(expectedDriver.getId()))) {

   throw new AccessDeniedException(
           "You cannot update an emergency assigned to another driver."
   );
  }

  if (status == null) {
   throw new IllegalArgumentException("Status is required.");
  }

  String newStatus = status.toUpperCase();

  if (!List.of(
          "ASSIGNED",
          "ARRIVED",
          "PICKED_UP",
          "COMPLETED",
          "CANCELLED"
  ).contains(newStatus)) {

   throw new IllegalArgumentException("Unsupported status.");
  }

  if (request.getDriver() == null
          && !"CANCELLED".equals(newStatus)) {

   throw new IllegalStateException(
           "A driver must accept the emergency first."
   );
  }

  if ("ARRIVED".equals(newStatus)
          && !"ASSIGNED".equals(request.getStatus())) {

   throw new IllegalStateException(
           "The emergency must be assigned before arrival."
   );
  }

  if ("PICKED_UP".equals(newStatus)
          && !"ARRIVED".equals(request.getStatus())) {

   throw new IllegalStateException(
           "The driver must arrive before picking up the patient."
   );
  }

  if ("COMPLETED".equals(newStatus)
          && !"PICKED_UP".equals(request.getStatus())) {

   throw new IllegalStateException(
           "The patient must be picked up before completing the trip."
   );
  }

  if ("CANCELLED".equals(newStatus)
          && List.of("COMPLETED", "CANCELLED")
          .contains(request.getStatus())) {

   throw new IllegalStateException(
           "This emergency is already closed."
   );
  }

  if (tripDistanceKm != null
          && (!Double.isFinite(tripDistanceKm)
          || tripDistanceKm <= 0)) {

   throw new IllegalArgumentException(
           "Trip distance must be a positive, finite number."
   );
  }

  request.setStatus(newStatus);
  request.touch();

  Booking booking = bookings
          .findByEmergencyRequestId(request.getId())
          .orElse(null);

  if (booking != null) {

   booking.setStatus(newStatus);

   if ("PICKED_UP".equals(newStatus)) {
    booking.setPickupTime(LocalDateTime.now());
   }

   if ("COMPLETED".equals(newStatus)) {

    booking.setDropTime(LocalDateTime.now());

    if (tripDistanceKm != null) {
     booking.setTripDistanceKm(tripDistanceKm);
    }
   }

   bookings.save(booking);
  }

  if ("COMPLETED".equals(newStatus)
          || "CANCELLED".equals(newStatus)) {

   Ambulance ambulance = request.getAmbulance();

   if (ambulance != null) {

    ambulance.setStatus("AVAILABLE");
    ambulances.save(ambulance);

    Driver driver = ambulance.getDriver();

    if (driver != null) {
     driver.setAvailable(true);
    }
   }
  }

  emergencies.save(request);
  publish(request);

  return dto(request);
 }

 // Internal record lookup. Do not expose this method directly
 // without applying authorization at the calling endpoint.
 public EmergencyRequest get(Long id) {

  return emergencies.findById(id)
          .orElseThrow(() ->
                  new NoSuchElementException(
                          "Emergency request not found."
                  )
          );
 }

 // Secure access to an individual emergency.
 @Transactional(readOnly = true)
 public TrackingResponse getAuthorized(Long id) {

  User user = currentUser();
  EmergencyRequest request = get(id);

  switch (user.getRole()) {

   case ADMIN:
    return dto(request);

   case PATIENT:
    Patient patient = patients.findByUserId(user.getId())
            .orElseThrow(() ->
                    new NoSuchElementException(
                            "Patient profile not found."
                    )
            );

    if (!patient.getId().equals(request.getPatient().getId())) {
     throw new AccessDeniedException(
             "You cannot access another patient's emergency."
     );
    }

    return dto(request);

   case DRIVER:
    Driver driver = drivers.findByUserId(user.getId())
            .orElseThrow(() ->
                    new NoSuchElementException(
                            "Driver profile not found."
                    )
            );

    boolean assignedToDriver =
            request.getDriver() != null
                    && request.getDriver().getId().equals(driver.getId());

    boolean availableForAcceptance =
            request.getDriver() == null
                    && request.getAmbulance() == null
                    && ("SEARCHING".equals(request.getStatus())
                    || "QUEUED".equals(request.getStatus()));

    if (!assignedToDriver && !availableForAcceptance) {
     throw new AccessDeniedException(
             "You cannot access this emergency."
     );
    }

    return dto(request);

   default:
    throw new AccessDeniedException(
            "You are not authorized to access this emergency."
    );
  }
 }

 // Secure cancellation for the owning patient or an administrator.
 @Transactional
 public TrackingResponse cancelAuthorized(Long id) {
  User user = currentUser();
  EmergencyRequest request = get(id);

  if (user.getRole() != Role.ADMIN) {
   if (user.getRole() != Role.PATIENT) {
    throw new AccessDeniedException(
            "Only the patient who created this emergency can cancel it."
    );
   }

   Patient patient = patients.findByUserId(user.getId())
           .orElseThrow(() -> new NoSuchElementException("Patient profile not found."));

   if (!patient.getId().equals(request.getPatient().getId())) {
    throw new AccessDeniedException("You cannot cancel another patient's emergency.");
   }
  }

  String currentStatus = request.getStatus();
  if (currentStatus == null ||
          List.of("COMPLETED", "CANCELLED", "NO_AMBULANCE")
                  .contains(currentStatus.toUpperCase())) {
   throw new IllegalStateException("This emergency can no longer be cancelled.");
  }

  request.setStatus("CANCELLED");
  request.touch();

  Booking booking = bookings.findByEmergencyRequestId(request.getId()).orElse(null);
  if (booking != null) {
   booking.setStatus("CANCELLED");
   bookings.save(booking);
  }

  Ambulance ambulance = request.getAmbulance();
  if (ambulance != null) {
   ambulance.setStatus("AVAILABLE");
   ambulances.save(ambulance);

   Driver driver = request.getDriver();
   if (driver == null) {
    driver = ambulance.getDriver();
   }
   if (driver != null) {
    driver.setAvailable(driver.isOnline());
   }
  }

  emergencies.save(request);
  publish(request);
  return dto(request);
 }

 // Tracking by token. Additional endpoint-level authorization
 // is still required before exposing tracking data.
 public TrackingResponse track(String token) {

  return dto(
          emergencies.findByTrackingToken(token)
                  .orElseThrow(() ->
                          new NoSuchElementException(
                                  "Tracking link not found."
                          )
                  )
  );
 }

 // Patient history restricted to the authenticated patient.
 public List<TrackingResponse> history(Long patientId) {

  Patient patient = currentPatient();

  if (!patient.getId().equals(patientId)) {
   throw new AccessDeniedException(
           "You cannot access another patient's emergency history."
   );
  }

  return emergencies
          .findByPatientIdOrderByCreatedAtDesc(patient.getId())
          .stream()
          .map(this::dto)
          .toList();
 }

 // Active emergencies for authorized staff.
 public List<TrackingResponse> active() {

  User user = currentUser();

  if (user.getRole() == Role.ADMIN) {

   return emergencies
           .findByStatusNotInOrderByCreatedAtDesc(
                   List.of("COMPLETED", "CANCELLED", "NO_AMBULANCE")
           )
           .stream()
           .map(this::dto)
           .toList();
  }

  if (user.getRole() != Role.DRIVER) {
   throw new AccessDeniedException(
           "You are not authorized to view active emergencies."
   );
  }

  Driver driver = drivers.findByUserId(user.getId())
          .orElseThrow(() ->
                  new NoSuchElementException(
                          "Driver profile not found."
                  )
          );

  return emergencies
          .findByStatusNotInOrderByCreatedAtDesc(
                  List.of("COMPLETED", "CANCELLED", "NO_AMBULANCE")
          )
          .stream()
          .filter(e ->
                  "SEARCHING".equals(e.getStatus())
                          || "QUEUED".equals(e.getStatus())
                          || (e.getDriver() != null
                          && e.getDriver().getId().equals(driver.getId()))
          )
          .map(this::dto)
          .toList();
 }

 // Hospital acknowledgement remains restricted to administrators
 // until hospital-manager-to-hospital assignment is implemented.
 public void hospitalAck(Long id, String notes) {

  User user = currentUser();

  if (user.getRole() != Role.ADMIN && user.getRole() != Role.HOSPITAL_MANAGER) {
   throw new AccessDeniedException(
           "Only an administrator or authorized hospital manager can acknowledge emergencies."
   );
  }

  EmergencyRequest request = get(id);

  if (user.getRole() == Role.HOSPITAL_MANAGER) {
   Hospital hospital = request.getHospital();
   if (hospital == null) {
    throw new IllegalStateException("No hospital is assigned to this emergency.");
   }
   if (hospital.getManager() == null || !hospital.getManager().getId().equals(user.getId())) {
    throw new AccessDeniedException("Your account is not assigned to the hospital for this emergency.");
   }
  }

  request.setHospitalAck(true);
  if (notes != null && !notes.isBlank()) {
   request.setNotes(notes);
  }
  request.touch();

  emergencies.save(request);
  publish(request);
 }

 public List<TrackingResponse> hospitalEmergencies(Long hospitalId) {
  User user = currentUser();
  if (user.getRole() != Role.ADMIN && user.getRole() != Role.HOSPITAL_MANAGER) {
   throw new AccessDeniedException("Unauthorized to view hospital emergencies.");
  }
  if (user.getRole() == Role.HOSPITAL_MANAGER) {
   Hospital hospital = hospitalRepository.findById(hospitalId)
           .orElseThrow(() -> new NoSuchElementException("Hospital not found."));
   if (hospital.getManager() == null || !hospital.getManager().getId().equals(user.getId())) {
    throw new AccessDeniedException("You cannot view emergencies for a hospital not assigned to your account.");
   }
  }
  return emergencies.findByHospitalIdOrderByCreatedAtDesc(hospitalId)
          .stream()
          .map(this::dto)
          .toList();
 }

 public List<TrackingResponse> allEmergencies() {
  User user = currentUser();
  if (user.getRole() != Role.ADMIN) {
   throw new AccessDeniedException("Only administrators can view all emergency records.");
  }
  return emergencies.findAllByOrderByCreatedAtDesc()
          .stream()
          .map(this::dto)
          .toList();
 }

 public long count(String status) {
  return emergencies.countByStatus(status);
 }

 public long countPriority(String priority) {
  return emergencies.countByPriority(priority);
 }

 private void publish(EmergencyRequest request) {

  socket.requestUpdate(dto(request));

  if (request.getAmbulance() != null) {
   socket.driverLocation(
           request.getAmbulance().getId(),
           dto(request)
   );
  }
 }

 // Convert an emergency into a tracking response.
 public TrackingResponse dto(EmergencyRequest request) {

  AmbulanceResponse ambulanceResponse = null;

  if (request.getAmbulance() != null) {

   Ambulance ambulance = request.getAmbulance();
   Driver driver = ambulance.getDriver();

   ambulanceResponse = new AmbulanceResponse(
           ambulance.getId(),
           ambulance.getAmbulanceNumber(),
           ambulance.getType(),
           ambulance.getStatus(),
           ambulance.isEmergencyAvailable(),
           ambulance.getLatitude(),
           ambulance.getLongitude(),
           driver == null ? null : driver.getId(),
           driver == null ? null : driver.getUser().getFullName(),
           driver == null ? null : driver.getUser().getPhone()
   );
  }

  HospitalResponse hospitalResponse = null;

  if (request.getHospital() != null) {

   Hospital hospital = request.getHospital();

   hospitalResponse = new HospitalResponse(
           hospital.getId(),
           hospital.getName(),
           hospital.getAddress(),
           hospital.getLatitude(),
           hospital.getLongitude(),
           hospital.getPhone(),
           hospital.isEmergencyAvailable(),
           hospital.getCapacity(),
           DistanceCalculator.km(
                   request.getPickupLatitude(),
                   request.getPickupLongitude(),
                   hospital.getLatitude(),
                   hospital.getLongitude()
           ),
           hospital.getManager() == null ? null : hospital.getManager().getId(),
           hospital.getManager() == null ? null : hospital.getManager().getFullName(),
           hospital.getManager() == null ? null : hospital.getManager().getEmail()
   );
  }

  return new TrackingResponse(
          request.getId(),
          request.getStatus(),
          request.getPriority(),
          request.getType(),
          request.getPickupLatitude(),
          request.getPickupLongitude(),
          ambulanceResponse,
          hospitalResponse,
          request.isHospitalAck(),
          request.getCreatedAt(),
          request.getUpdatedAt(),
          request.getTrackingToken()
  );
 }
}