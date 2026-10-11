package com.rapidrescue.repository;
import com.rapidrescue.entity.Location; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.stereotype.Repository;
@Repository public interface LocationRepository extends JpaRepository<Location,Long> { java.util.List<Location> findTop50ByAmbulanceIdOrderByTimestampDesc(Long ambulanceId); }
