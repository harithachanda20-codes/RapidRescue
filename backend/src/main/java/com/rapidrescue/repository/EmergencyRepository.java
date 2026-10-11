package com.rapidrescue.repository;

import com.rapidrescue.entity.EmergencyRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmergencyRepository
        extends JpaRepository<EmergencyRequest, Long> {

 Optional<EmergencyRequest> findByTrackingToken(String token);

 List<EmergencyRequest> findByPatientIdOrderByCreatedAtDesc(
         Long patientId
 );

 List<EmergencyRequest> findByStatusNotInOrderByCreatedAtDesc(
         Collection<String> statuses
 );

 List<EmergencyRequest> findByHospitalIdOrderByCreatedAtDesc(
         Long hospitalId
 );

 List<EmergencyRequest> findByHospitalIdAndStatusNotInOrderByCreatedAtDesc(
         Long hospitalId,
         Collection<String> statuses
 );

 List<EmergencyRequest> findAllByOrderByCreatedAtDesc();

 long countByStatus(String status);

 long countByPriority(String priority);

 // Retrieve and lock an emergency while a driver accepts it.
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("SELECT e FROM EmergencyRequest e WHERE e.id = :id")
 Optional<EmergencyRequest> findByIdForUpdate(
         @Param("id") Long id
 );
}