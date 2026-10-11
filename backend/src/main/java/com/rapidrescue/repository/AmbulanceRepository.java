package com.rapidrescue.repository;

import com.rapidrescue.entity.Ambulance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AmbulanceRepository extends JpaRepository<Ambulance, Long> {

    List<Ambulance> findByActiveTrue();

    List<Ambulance> findByStatusAndActiveTrue(String status);

    Optional<Ambulance> findByDriverId(Long driverId);
}