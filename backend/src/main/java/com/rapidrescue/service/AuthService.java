package com.rapidrescue.service;

import com.rapidrescue.dto.*;
import com.rapidrescue.entity.*;
import com.rapidrescue.repository.*;
import com.rapidrescue.security.JwtService;

import org.springframework.beans.factory.annotation.Value;
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

    // Admin registration secret from environment configuration
    @Value("${app.admin-registration-code:}")
    private String adminRegistrationCode;

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

    // Register Patient, Driver, Hospital Manager, or authorized Admin.
    @Transactional
    public AuthResponse register(RegisterRequest request) {

        if (request.email() == null || request.email().isBlank()) {
            throw new IllegalArgumentException("Email is required.");
        }

        if (request.phone() == null || request.phone().isBlank()) {
            throw new IllegalArgumentException("Phone number is required.");
        }

        if (users.existsByEmail(request.email().trim())) {
            throw new IllegalArgumentException(
                    "Email already registered."
            );
        }

        if (users.existsByPhone(request.phone().trim())) {
            throw new IllegalArgumentException(
                    "Phone already registered."
            );
        }

        Role role = request.role();

        if (role == null) {
            throw new IllegalArgumentException(
                    "Please select a registration role."
            );
        }

        if (role != Role.PATIENT
                && role != Role.DRIVER
                && role != Role.HOSPITAL_MANAGER
                && role != Role.ADMIN) {

            throw new IllegalArgumentException(
                    "Invalid registration role."
            );
        }

        if (request.fullName() == null
                || request.fullName().isBlank()) {

            throw new IllegalArgumentException(
                    "Full name is required."
            );
        }

        if (request.password() == null
                || request.password().length() < 6) {

            throw new IllegalArgumentException(
                    "Password must contain at least 6 characters."
            );
        }

        // Admin registration requires a secret configured on the server.
        if (role == Role.ADMIN) {

            if (adminRegistrationCode == null
                    || adminRegistrationCode.isBlank()) {

                throw new IllegalArgumentException(
                        "Admin registration is not configured on the server."
                );
            }

            if (request.adminRegistrationCode() == null
                    || !adminRegistrationCode.equals(
                            request.adminRegistrationCode())) {

                throw new IllegalArgumentException(
                        "Invalid Admin registration code."
                );
            }

            // Permit public Admin registration only while no Admin exists.
            if (users.existsByRole(Role.ADMIN)) {
                throw new IllegalArgumentException(
                        "An Admin account already exists. Contact the existing administrator."
                );
            }
        }

        // Driver registration requires a licence number.
        if (role == Role.DRIVER) {

            if (request.licenseNumber() == null
                    || request.licenseNumber().isBlank()) {

                throw new IllegalArgumentException(
                        "Driver licence number is required."
                );
            }

            if (request.licenseType() == null
                    || request.licenseType().isBlank()) {

                throw new IllegalArgumentException(
                        "Driver licence type is required."
                );
            }
        }

        User user = new User();

        user.setFullName(request.fullName().trim());
        user.setEmail(request.email().trim());
        user.setPhone(request.phone().trim());
        user.setPassword(encoder.encode(request.password()));
        user.setRole(role);

        users.save(user);

        Long profileId = user.getId();

        // Create Patient profile.
        if (role == Role.PATIENT) {

            Patient patient = new Patient();

            patient.setUser(user);
            patient.setBloodGroup(request.bloodGroup());
            patient.setAllergies(request.allergies());
            patient.setEmergencyContact(request.emergencyContact());

            patients.save(patient);

            profileId = patient.getId();
        }

        // Create Driver profile.
        if (role == Role.DRIVER) {

            Driver driver = new Driver();

            driver.setUser(user);
            driver.setLicenseNumber(
                    request.licenseNumber().trim()
            );
            driver.setLicenseType(
                    request.licenseType().trim()
            );

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
         * Hospital Manager and Admin accounts are created as User accounts.
         * Hospital assignment and role-specific permissions must be
         * implemented separately if your application requires them.
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

    // Email/password login for registered users.
    public AuthResponse login(LoginRequest request) {

        User user = users.findByEmail(request.email());

        if (user == null
                || !encoder.matches(
                        request.password(),
                        user.getPassword())) {

            throw new IllegalArgumentException(
                    "Invalid email or password."
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

    // Existing patient OTP login; retained to avoid breaking the old flow.
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
                    "Mobile OTP login is available only to patients."
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