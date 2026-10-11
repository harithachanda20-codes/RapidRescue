package com.rapidrescue.service;

import com.rapidrescue.dto.*;
import com.rapidrescue.entity.*;
import com.rapidrescue.repository.*;
import com.rapidrescue.security.JwtService;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthService {

 private final UserRepository users;
 private final PatientRepository patients;
 private final DriverRepository drivers;
 private final PasswordEncoder encoder;
 private final JwtService jwt;

 public AuthService(
         UserRepository users,
         PatientRepository patients,
         DriverRepository drivers,
         PasswordEncoder encoder,
         JwtService jwt) {

  this.users = users;
  this.patients = patients;
  this.drivers = drivers;
  this.encoder = encoder;
  this.jwt = jwt;
 }

 // Register a Driver or Hospital Manager.
 // Admin accounts cannot be created through public registration.
 @Transactional
 public AuthResponse register(RegisterRequest request) {

  if (users.existsByEmail(request.email())) {
   throw new IllegalArgumentException(
           "Email already registered"
   );
  }

  if (users.existsByPhone(request.phone())) {
   throw new IllegalArgumentException(
           "Phone already registered"
   );
  }

  Role role = request.role();

  if (role == null) {
   throw new IllegalArgumentException(
           "Please select a registration role."
   );
  }

  if (role == Role.ADMIN) {
   throw new IllegalArgumentException(
           "Admin accounts must be created by an authorized administrator."
   );
  }

  if (role != Role.PATIENT &&
          role != Role.DRIVER &&
          role != Role.HOSPITAL_MANAGER) {
   throw new IllegalArgumentException(
           "Invalid registration role."
   );
  }

  if (request.password() == null ||
          request.password().length() < 6) {
   throw new IllegalArgumentException(
           "Password must contain at least 6 characters."
   );
  }

  User user = new User();

  user.setFullName(request.fullName().trim());
  user.setEmail(request.email().trim());
  user.setPhone(request.phone().trim());
  user.setPassword(encoder.encode(request.password()));
  user.setRole(role);

  users.save(user);

  Long profileId = user.getId();

  if (role == Role.PATIENT) {
   Patient patient = new Patient();
   patient.setUser(user);
   patient.setBloodGroup(request.bloodGroup());
   patient.setAllergies(request.allergies());
   patient.setEmergencyContact(request.emergencyContact());
   patients.save(patient);
   profileId = patient.getId();
  }

  if (role == Role.DRIVER) {

   Driver driver = new Driver();

   driver.setUser(user);
   driver.setLicenseNumber(request.licenseNumber());
   driver.setLicenseType(request.licenseType());

   drivers.save(driver);

   profileId = drivers.findByUserId(user.getId())
           .orElseThrow(() ->
                   new IllegalStateException(
                           "Driver profile could not be created."
                   )
           )
           .getId();
  }

  /*
   * Hospital Manager registration creates a User account.
   * Hospital assignment and manager-specific permissions
   * must be implemented separately.
   */

  return new AuthResponse(
          jwt.generate(
                  user.getEmail(),
                  user.getRole().name()
          ),
          profileId,
          user.getFullName(),
          user.getRole().name()
  );
 }

 // Existing email/password login.
 public AuthResponse login(LoginRequest request) {

  User user = users.findByEmail(request.email());

  if (user == null ||
          !encoder.matches(
                  request.password(),
                  user.getPassword()
          )) {

   throw new IllegalArgumentException(
           "Invalid email or password"
   );
  }

  Long profileId = user.getId();

  if (user.getRole() == Role.PATIENT) {

   profileId = patients.findByUserId(user.getId())
           .orElseThrow(() ->
                   new IllegalArgumentException(
                           "Patient profile not found."
                   )
           )
           .getId();
  }

  if (user.getRole() == Role.DRIVER) {

   profileId = drivers.findByUserId(user.getId())
           .orElseThrow(() ->
                   new IllegalArgumentException(
                           "Driver profile not found."
                   )
           )
           .getId();
  }

  return new AuthResponse(
          jwt.generate(
                  user.getEmail(),
                  user.getRole().name()
          ),
          profileId,
          user.getFullName(),
          user.getRole().name()
  );
 }

 // Patient login or account creation after OTP verification.
 @Transactional
 public AuthResponse loginWithPhone(String phone) {

  User user = users.findByPhone(phone);

  if (user == null) {

   user = new User();

   user.setFullName("Patient");
   user.setPhone(phone);
   user.setEmail(phone + "@rapidrescue.local");

   user.setPassword(
           encoder.encode(
                   UUID.randomUUID().toString()
           )
   );

   user.setRole(Role.PATIENT);

   user = users.save(user);

   Patient patient = new Patient();
   patient.setUser(user);

   patients.save(patient);
  }

  if (user.getRole() != Role.PATIENT) {
   throw new IllegalArgumentException(
           "Mobile OTP login is available only for patients."
   );
  }

  Long profileId = patients.findByUserId(user.getId())
          .orElseThrow(() ->
                  new IllegalArgumentException(
                          "Patient profile not found."
                  )
          )
          .getId();

  String token = jwt.generate(
          user.getEmail(),
          user.getRole().name()
  );

  return new AuthResponse(
          token,
          profileId,
          user.getFullName(),
          user.getRole().name()
  );
 }
}