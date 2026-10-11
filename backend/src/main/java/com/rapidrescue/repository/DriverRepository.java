package com.rapidrescue.repository;
import com.rapidrescue.entity.Driver; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.stereotype.Repository;
@Repository public interface DriverRepository extends JpaRepository<Driver,Long> { java.util.Optional<Driver> findByUserId(Long userId); java.util.List<Driver> findByOnlineTrue(); }
