package com.rapidrescue.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record EmergencyRequestDto(

        @NotNull
        Long patientId,

        @NotNull
        @DecimalMin("-90")
        @DecimalMax("90")
        Double latitude,

        @NotNull
        @DecimalMin("-180")
        @DecimalMax("180")
        Double longitude,

        String priority,

        String type,

        String notes,

        // Hospital selected by the patient
        Long destinationHospitalId,

        // Patient's pickup address
        String pickupAddress

) {}