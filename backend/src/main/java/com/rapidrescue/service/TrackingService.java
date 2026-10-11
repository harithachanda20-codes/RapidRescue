package com.rapidrescue.service;

import com.rapidrescue.dto.TrackingResponse;
import com.rapidrescue.entity.*;
import com.rapidrescue.repository.*;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrackingService {

    private final EmergencyService emergency;
    private final EmergencyRepository emergencies;
    private final UserRepository users;
    private final PatientRepository patients;
    private final DriverRepository drivers;

    public TrackingService(
            EmergencyService emergency,
            EmergencyRepository emergencies,
            UserRepository users,
            PatientRepository patients,
            DriverRepository drivers) {

        this.emergency = emergency;
        this.emergencies = emergencies;
        this.users = users;
        this.patients = patients;
        this.drivers = drivers;
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

    @Transactional(readOnly = true)
    public TrackingResponse byToken(String token) {

        User user = currentUser();

        EmergencyRequest request = emergencies
                .findByTrackingToken(token)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Tracking record not found."
                        )
                );

        switch (user.getRole()) {

            case ADMIN:
                return emergency.dto(request);

            case PATIENT:
                Patient patient = patients.findByUserId(user.getId())
                        .orElseThrow(() ->
                                new AccessDeniedException(
                                        "Patient profile not found."
                                )
                        );

                if (!patient.getId().equals(request.getPatient().getId())) {
                    throw new AccessDeniedException(
                            "You cannot track another patient's emergency."
                    );
                }

                return emergency.dto(request);

            case DRIVER:
                Driver driver = drivers.findByUserId(user.getId())
                        .orElseThrow(() ->
                                new AccessDeniedException(
                                        "Driver profile not found."
                                )
                        );

                if (request.getDriver() == null
                        || !request.getDriver().getId().equals(driver.getId())) {

                    throw new AccessDeniedException(
                            "You can only track emergencies assigned to you."
                    );
                }

                return emergency.dto(request);

            default:
                throw new AccessDeniedException(
                        "You are not authorized to access this tracking information."
                );
        }
    }
}