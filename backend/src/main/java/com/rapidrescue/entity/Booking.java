package com.rapidrescue.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(indexes = {
        @Index(name = "idx_booking_patient", columnList = "patient_id")
})
public class Booking {

 @Id
 @GeneratedValue(strategy = GenerationType.IDENTITY)
 private Long id;

 @OneToOne(optional = false)
 @JoinColumn(name = "emergency_request_id", unique = true)
 private EmergencyRequest emergencyRequest;

 @ManyToOne(optional = false)
 private Patient patient;

 @ManyToOne
 private Driver driver;

 @ManyToOne
 private Ambulance ambulance;

 @ManyToOne
 private Hospital hospital;

 private String status;

 private LocalDateTime bookingTime;
 private LocalDateTime pickupTime;
 private LocalDateTime dropTime;

 // Actual trip distance in kilometres
 private Double tripDistanceKm;

 public Long getId() {
  return id;
 }

 public EmergencyRequest getEmergencyRequest() {
  return emergencyRequest;
 }

 public void setEmergencyRequest(EmergencyRequest emergencyRequest) {
  this.emergencyRequest = emergencyRequest;
 }

 public Patient getPatient() {
  return patient;
 }

 public void setPatient(Patient patient) {
  this.patient = patient;
 }

 public Driver getDriver() {
  return driver;
 }

 public void setDriver(Driver driver) {
  this.driver = driver;
 }

 public Ambulance getAmbulance() {
  return ambulance;
 }

 public void setAmbulance(Ambulance ambulance) {
  this.ambulance = ambulance;
 }

 public Hospital getHospital() {
  return hospital;
 }

 public void setHospital(Hospital hospital) {
  this.hospital = hospital;
 }

 public String getStatus() {
  return status;
 }

 public void setStatus(String status) {
  this.status = status;
 }

 public LocalDateTime getBookingTime() {
  return bookingTime;
 }

 public void setBookingTime(LocalDateTime bookingTime) {
  this.bookingTime = bookingTime;
 }

 public LocalDateTime getPickupTime() {
  return pickupTime;
 }

 public void setPickupTime(LocalDateTime pickupTime) {
  this.pickupTime = pickupTime;
 }

 public LocalDateTime getDropTime() {
  return dropTime;
 }

 public void setDropTime(LocalDateTime dropTime) {
  this.dropTime = dropTime;
 }

 public Double getTripDistanceKm() {
  return tripDistanceKm;
 }

 public void setTripDistanceKm(Double tripDistanceKm) {
  this.tripDistanceKm = tripDistanceKm;
 }
}