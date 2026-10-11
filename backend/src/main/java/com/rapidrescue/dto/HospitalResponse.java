package com.rapidrescue.dto;

public record HospitalResponse(
        Long id, String name, String address, Double latitude, Double longitude,
        String phone, boolean emergencyAvailable, Integer capacity, Double distanceKm,
        Long managerId, String managerName, String managerEmail) {}
