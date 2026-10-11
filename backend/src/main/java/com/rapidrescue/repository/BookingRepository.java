package com.rapidrescue.repository;

import com.rapidrescue.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByPatientIdOrderByBookingTimeDesc(Long patientId);

    Optional<Booking> findByEmergencyRequestId(Long id);

    // Retrieve completed trips for a particular driver.
    List<Booking> findByDriver_IdAndStatusOrderByDropTimeDesc(
            Long driverId,
            String status
    );

    List<Booking> findByHospitalIdOrderByBookingTimeDesc(Long hospitalId);

    List<Booking> findAllByOrderByBookingTimeDesc();
}