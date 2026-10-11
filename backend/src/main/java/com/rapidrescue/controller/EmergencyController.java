package com.rapidrescue.controller;

import com.rapidrescue.dto.EmergencyRequestDto;
import com.rapidrescue.dto.TrackingResponse;
import com.rapidrescue.service.EmergencyService;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/emergency")
public class EmergencyController {

 private final EmergencyService service;

 public EmergencyController(EmergencyService service) {
  this.service = service;
 }

 // Only patients can create emergency requests.
 @PostMapping
 @PreAuthorize("hasRole('PATIENT')")
 public TrackingResponse create(
         @Valid @RequestBody EmergencyRequestDto request) {

  return service.create(request);
 }

 // Admins can view any emergency.
 // Patients and drivers must pass the service's ownership checks.
 @GetMapping("/{id}")
 @PreAuthorize("hasAnyRole('PATIENT','DRIVER','ADMIN')")
 public TrackingResponse get(@PathVariable Long id) {

  return service.getAuthorized(id);
 }

 // Only drivers can accept emergencies.
 @PostMapping("/{id}/accept/{driverId}")
 @PreAuthorize("hasRole('DRIVER')")
 public TrackingResponse acceptEmergency(
         @PathVariable Long id,
         @PathVariable Long driverId) {

  return service.acceptEmergency(id, driverId);
 }

 // Drivers update their assigned emergencies; admins may manage status.
 @PutMapping("/{id}/status")
 @PreAuthorize("hasAnyRole('DRIVER','ADMIN')")
 public TrackingResponse status(
         @PathVariable Long id,
         @RequestParam String value) {

  return service.updateStatus(id, value);
 }

 // Patients may cancel their own emergencies; admins can manage cancellations.
 @PostMapping("/{id}/cancel")
 @PreAuthorize("hasAnyRole('PATIENT','ADMIN')")
 public TrackingResponse cancel(@PathVariable Long id) {

  return service.cancelAuthorized(id);
 }

 // Patients can retrieve only their own history.
 @GetMapping("/patient/{patientId}")
 @PreAuthorize("hasRole('PATIENT')")
 public List<TrackingResponse> history(
         @PathVariable Long patientId) {

  return service.history(patientId);
 }

 // Hospital acknowledgement for hospital managers and admins.
 @PostMapping("/{id}/hospital-ack")
 public Map<String, Object> ack(
         @PathVariable Long id,
         @RequestParam(defaultValue = "Ready for arrival")
         String notes) {

  service.hospitalAck(id, notes);

  return Map.of("acknowledged", true);
 }

 // Hospital emergencies for hospital managers and admins.
 @GetMapping("/hospital/{hospitalId}")
 public List<TrackingResponse> byHospital(@PathVariable Long hospitalId) {
  return service.hospitalEmergencies(hospitalId);
 }

 // Active emergencies are available to drivers and admins.
 @GetMapping("/active")
 @PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
 public List<TrackingResponse> active() {

  return service.active();
 }
}