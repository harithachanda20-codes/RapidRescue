package com.rapidrescue.controller;

import com.rapidrescue.dto.CompletedTripResponse;
import com.rapidrescue.dto.LocationRequest;
import com.rapidrescue.entity.Driver;
import com.rapidrescue.entity.User;
import com.rapidrescue.repository.DriverRepository;
import com.rapidrescue.repository.UserRepository;
import com.rapidrescue.service.CompletedTripService;
import com.rapidrescue.service.DriverService;
import com.rapidrescue.service.EmergencyService;

import jakarta.validation.Valid;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/drivers")
public class DriverController {

 private final DriverService s;
 private final EmergencyService e;
 private final CompletedTripService completedTripService;
 private final DriverRepository driverRepository;
 private final UserRepository userRepository;

 public DriverController(
         DriverService s,
         EmergencyService e,
         CompletedTripService completedTripService,
         DriverRepository driverRepository,
         UserRepository userRepository) {

  this.s = s;
  this.e = e;
  this.completedTripService = completedTripService;
  this.driverRepository = driverRepository;
  this.userRepository = userRepository;
 }

 // Identify the currently authenticated driver.
 private Driver getAuthenticatedDriver(Authentication authentication) {

  User user = userRepository.findByEmail(authentication.getName());

  if (user == null) {
   throw new AccessDeniedException("Authenticated user not found");
  }

  return driverRepository.findByUserId(user.getId())
          .orElseThrow(() ->
                  new AccessDeniedException("Driver profile not found"));
 }

 // Get all drivers (Admin only).
 @GetMapping
 @PreAuthorize("hasRole('ADMIN')")
 public List<Driver> all() {
  return s.all();
 }

 // Update only the logged-in driver's status.
 @PostMapping("/{id}/status")
 @PreAuthorize("hasRole('DRIVER')")
 public Driver status(
         @PathVariable Long id,
         @RequestParam boolean online,
         @RequestParam boolean available,
         Authentication authentication) {

  Driver driver = getAuthenticatedDriver(authentication);

  if (!driver.getId().equals(id)) {
   throw new AccessDeniedException(
           "You cannot change another driver's status");
  }

  return s.status(id, online, available);
 }

 // Update only the logged-in driver's GPS location.
 @PutMapping("/{id}/location")
 @PreAuthorize("hasRole('DRIVER')")
 public Driver location(
         @PathVariable Long id,
         @Valid @RequestBody LocationRequest request,
         Authentication authentication) {

  Driver driver = getAuthenticatedDriver(authentication);

  if (!driver.getId().equals(id)) {
   throw new AccessDeniedException(
           "You cannot update another driver's location");
  }

  return s.updateLocation(id, request);
 }

 // Update the emergency assigned to the authenticated driver.
 @PutMapping("/emergency/{requestId}/status")
 @PreAuthorize("hasRole('DRIVER')")
 public Object tripStatus(
         @PathVariable Long requestId,
         @RequestParam String status,
         @RequestParam(required = false) Double tripDistanceKm,
         Authentication authentication) {

  Driver driver = getAuthenticatedDriver(authentication);

  return e.updateStatusForDriver(
          requestId, status, tripDistanceKm, driver.getId());
 }

 // View only the authenticated driver's completed trips.
 @GetMapping("/{driverId}/completed-trips")
 @PreAuthorize("hasRole('DRIVER')")
 public List<CompletedTripResponse> completedTrips(
         @PathVariable Long driverId,
         Authentication authentication) {

  Driver driver = getAuthenticatedDriver(authentication);

  if (!driver.getId().equals(driverId)) {
   throw new AccessDeniedException(
           "You cannot view another driver's completed trips");
  }

  return completedTripService.getCompletedTrips(driverId);
 }
}