package com.rapidrescue.controller;

import com.rapidrescue.dto.AmbulanceResponse;
import com.rapidrescue.entity.Ambulance;
import com.rapidrescue.service.AmbulanceService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ambulances")
public class AmbulanceController {

 private final AmbulanceService s;

 public AmbulanceController(AmbulanceService s) {
  this.s = s;
 }

 // Get all active ambulances
 @GetMapping
 public List<AmbulanceResponse> all() {
  return s.all();
 }

 // Get available ambulances
 @GetMapping("/available")
 public List<AmbulanceResponse> available() {
  return s.available();
 }

 // Create ambulance (Admin only)
 @PostMapping
 @PreAuthorize("hasRole('ADMIN')")
 public AmbulanceResponse create(@RequestBody Ambulance ambulance) {
  return s.dto(s.save(ambulance));
 }

 // Update ambulance details (Admin only)
 @PutMapping("/{id}")
 @PreAuthorize("hasRole('ADMIN')")
 public AmbulanceResponse update(
         @PathVariable Long id,
         @RequestBody Ambulance input) {

  Ambulance ambulance = s.get(id);

  if (input.getAmbulanceNumber() != null && !input.getAmbulanceNumber().isBlank()) {
   ambulance.setAmbulanceNumber(input.getAmbulanceNumber().trim());
  }

  if (input.getType() != null) {
   ambulance.setType(input.getType());
  }

  if (input.getLatitude() != null && input.getLongitude() != null) {
   if (input.getLatitude() < -90 || input.getLatitude() > 90 || input.getLongitude() < -180 || input.getLongitude() > 180) {
    throw new IllegalArgumentException("Invalid ambulance GPS coordinates.");
   }
   ambulance.setLatitude(input.getLatitude());
   ambulance.setLongitude(input.getLongitude());
  } else if (input.getLatitude() == null && input.getLongitude() == null) {
   ambulance.setLatitude(null);
   ambulance.setLongitude(null);
  } else {
   throw new IllegalArgumentException("Latitude and longitude must be provided together.");
  }

  if (input.getStatus() != null) {
   ambulance.setStatus(input.getStatus());
  }

  ambulance.setEmergencyAvailable(input.isEmergencyAvailable());

  return s.dto(s.save(ambulance));
 }
}