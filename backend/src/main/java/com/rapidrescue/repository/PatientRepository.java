package com.rapidrescue.repository;
import com.rapidrescue.entity.Patient; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.stereotype.Repository;
@Repository public interface PatientRepository extends JpaRepository<Patient,Long> { java.util.Optional<Patient> findByUserId(Long userId); }
