package com.rapidrescue.repository;
import com.rapidrescue.entity.Hospital; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.stereotype.Repository;
@Repository public interface HospitalRepository extends JpaRepository<Hospital,Long> {
 java.util.List<Hospital> findByActiveTrue();
 java.util.Optional<Hospital> findByManager_Id(Long managerId);
 java.util.Optional<Hospital> findFirstByOrderByIdAsc();
}
