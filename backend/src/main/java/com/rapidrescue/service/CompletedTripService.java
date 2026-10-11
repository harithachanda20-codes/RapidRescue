package com.rapidrescue.service;

import com.rapidrescue.dto.CompletedTripResponse;
import com.rapidrescue.entity.Booking;
import com.rapidrescue.entity.Driver;
import com.rapidrescue.repository.BookingRepository;
import com.rapidrescue.repository.DriverRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;

@Service
public class CompletedTripService {

    private final BookingRepository bookings;
    private final DriverRepository drivers;

    public CompletedTripService(
            BookingRepository bookings,
            DriverRepository drivers) {
        this.bookings = bookings;
        this.drivers = drivers;
    }

    @Transactional(readOnly = true)
    public List<CompletedTripResponse> getCompletedTrips(Long driverId) {

        drivers.findById(driverId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Driver not found"));

        return bookings
                .findByDriver_IdAndStatusOrderByDropTimeDesc(
                        driverId, "COMPLETED")
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private CompletedTripResponse toResponse(Booking booking) {

        var patient = booking.getPatient();
        var user = patient != null ? patient.getUser() : null;

        var emergency = booking.getEmergencyRequest();
        var hospital = booking.getHospital();

        Long durationMinutes = null;

        if (booking.getPickupTime() != null
                && booking.getDropTime() != null) {
            durationMinutes = Duration.between(
                    booking.getPickupTime(),
                    booking.getDropTime()
            ).toMinutes();
        }

        return new CompletedTripResponse(
                booking.getId(),
                emergency != null ? emergency.getId() : null,
                user != null ? user.getFullName() : null,
                user != null ? user.getPhone() : null,
                emergency != null ? emergency.getPriority() : null,
                emergency != null ? emergency.getType() : null,
                emergency != null ? emergency.getPickupLatitude() : null,
                emergency != null ? emergency.getPickupLongitude() : null,
                hospital != null ? hospital.getName() : null,
                hospital != null ? hospital.getAddress() : null,
                hospital != null ? hospital.getLatitude() : null,
                hospital != null ? hospital.getLongitude() : null,
                booking.getTripDistanceKm(),
                booking.getBookingTime(),
                booking.getPickupTime(),
                booking.getDropTime(),
                durationMinutes,
                booking.getStatus()
        );
    }
}