package com.rapidrescue.service;

import com.rapidrescue.dto.BookingResponse;
import com.rapidrescue.entity.*;
import com.rapidrescue.repository.*;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class BookingService {

 private final BookingRepository repo;
 private final UserRepository users;
 private final PatientRepository patients;
 private final DriverRepository drivers;
 private final HospitalRepository hospitals;

 public BookingService(
         BookingRepository repo,
         UserRepository users,
         PatientRepository patients,
         DriverRepository drivers,
         HospitalRepository hospitals) {

  this.repo = repo;
  this.users = users;
  this.patients = patients;
  this.drivers = drivers;
  this.hospitals = hospitals;
 }

 private User currentUser() {

  Authentication authentication =
          SecurityContextHolder.getContext().getAuthentication();

  if (authentication == null
          || !authentication.isAuthenticated()
          || authentication.getName() == null
          || "anonymousUser".equals(authentication.getName())) {

   throw new AccessDeniedException("Please log in first.");
  }

  User user = users.findByEmail(authentication.getName());

  if (user == null || !user.isActive()) {
   throw new AccessDeniedException("Account unavailable.");
  }

  return user;
 }

 // Retrieve booking history belonging to the authenticated patient.
 @Transactional(readOnly = true)
 public List<BookingResponse> patient(Long patientId) {

  User user = currentUser();

  if (user.getRole() != Role.PATIENT) {
   throw new AccessDeniedException(
           "Only patients can access patient booking history."
   );
  }

  Patient patient = patients.findByUserId(user.getId())
          .orElseThrow(() ->
                  new NoSuchElementException(
                          "Patient profile not found."
                  )
          );

  if (!patient.getId().equals(patientId)) {
   throw new AccessDeniedException(
           "You cannot access another patient's bookings."
   );
  }

  return repo.findByPatientIdOrderByBookingTimeDesc(patient.getId())
          .stream()
          .map(this::dto)
          .toList();
 }

 @Transactional(readOnly = true)
 public List<BookingResponse> hospital(Long hospitalId) {
  User user = currentUser();
  if (user.getRole() != Role.ADMIN && user.getRole() != Role.HOSPITAL_MANAGER) {
   throw new AccessDeniedException("Unauthorized to access hospital bookings.");
  }
  if (user.getRole() == Role.HOSPITAL_MANAGER) {
   Hospital hospital = hospitals.findById(hospitalId)
           .orElseThrow(() -> new NoSuchElementException("Hospital not found."));
   if (hospital.getManager() == null || !hospital.getManager().getId().equals(user.getId())) {
    throw new AccessDeniedException("You cannot access bookings for a hospital not assigned to your account.");
   }
  }
  return repo.findByHospitalIdOrderByBookingTimeDesc(hospitalId)
          .stream()
          .map(this::dto)
          .toList();
 }

 @Transactional(readOnly = true)
 public List<BookingResponse> all() {
  User user = currentUser();
  if (user.getRole() != Role.ADMIN) {
   throw new AccessDeniedException("Only admins can access all bookings.");
  }
  return repo.findAllByOrderByBookingTimeDesc()
          .stream()
          .map(this::dto)
          .toList();
 }

 // Retrieve a single booking after checking ownership or assignment.
 @Transactional(readOnly = true)
 public BookingResponse get(Long id) {

  User user = currentUser();

  Booking booking = repo.findById(id)
          .orElseThrow(() ->
                  new NoSuchElementException("Booking not found.")
          );

  switch (user.getRole()) {

   case ADMIN:
    return dto(booking);

   case PATIENT:
    Patient patient = patients.findByUserId(user.getId())
            .orElseThrow(() ->
                    new NoSuchElementException(
                            "Patient profile not found."
                    )
            );

    if (!patient.getId().equals(booking.getPatient().getId())) {
     throw new AccessDeniedException(
             "You cannot access another patient's booking."
     );
    }

    return dto(booking);

   case DRIVER:
    Driver driver = drivers.findByUserId(user.getId())
            .orElseThrow(() ->
                    new NoSuchElementException(
                            "Driver profile not found."
                    )
            );

    if (booking.getDriver() == null
            || !booking.getDriver().getId().equals(driver.getId())) {

     throw new AccessDeniedException(
             "You cannot access another driver's booking."
     );
    }

    return dto(booking);

   default:
    throw new AccessDeniedException(
            "You are not authorized to access this booking."
    );
  }
 }

 private BookingResponse dto(Booking booking) {

  return new BookingResponse(
          booking.getId(),
          booking.getEmergencyRequest().getId(),
          booking.getStatus(),
          booking.getAmbulance() == null
                  ? null
                  : booking.getAmbulance().getAmbulanceNumber(),
          booking.getDriver() == null
                  ? null
                  : booking.getDriver().getUser().getFullName(),
          booking.getHospital() == null
                  ? null
                  : booking.getHospital().getName(),
          booking.getBookingTime(),
          booking.getPickupTime(),
          booking.getDropTime(),
          booking.getEmergencyRequest().getTrackingToken()
  );
 }
}