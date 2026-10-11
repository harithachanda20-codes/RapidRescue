package com.rapidrescue.dto;

import java.time.LocalDateTime;

public record CompletedTripResponse(
        Long bookingId,
        Long emergencyId,
        String patientName,
        String patientPhone,
        String priority,
        String emergencyType,
        Double pickupLatitude,
        Double pickupLongitude,
        String hospitalName,
        String hospitalAddress,
        Double hospitalLatitude,
        Double hospitalLongitude,
        Double tripDistanceKm,
        LocalDateTime bookingTime,
        LocalDateTime pickupTime,
        LocalDateTime completionTime,
        Long durationMinutes,
        String status
) {
}