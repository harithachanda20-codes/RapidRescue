package com.rapidrescue.controller;

import com.rapidrescue.entity.Hospital;
import com.rapidrescue.entity.User;
import com.rapidrescue.repository.AmbulanceRepository;
import com.rapidrescue.repository.PatientRepository;
import com.rapidrescue.repository.UserRepository;
import com.rapidrescue.service.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final EmergencyService e;
    private final DriverService d;
    private final AmbulanceService a;
    private final HospitalService h;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final AmbulanceRepository ambulanceRepository;

    public AdminController(
            EmergencyService e,
            DriverService d,
            AmbulanceService a,
            HospitalService h,
            UserRepository userRepository,
            PatientRepository patientRepository,
            AmbulanceRepository ambulanceRepository) {
        this.e = e;
        this.d = d;
        this.a = a;
        this.h = h;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.ambulanceRepository = ambulanceRepository;
    }

    @GetMapping("/requests")
    public Object requests() {
        return e.active();
    }

    @GetMapping("/emergencies/all")
    public Object allEmergencies() {
        return e.allEmergencies();
    }

    @GetMapping("/drivers")
    public Object drivers() {
        return d.all();
    }

    @PostMapping("/driver/status")
    public Object driverStatus(@RequestParam Long id, @RequestParam boolean online, @RequestParam boolean available) {
        return d.status(id, online, available);
    }

    @PostMapping("/request/cancel")
    public Object cancel(@RequestParam Long id) {
        return e.updateStatus(id, "CANCELLED");
    }

    @GetMapping("/stats")
    public Object stats() {
        long activeCount = e.count("SEARCHING") + e.count("QUEUED") + e.count("ASSIGNED") + e.count("ARRIVED") + e.count("PICKED_UP");
        return Map.of(
                "total", e.count("ASSIGNED") + e.count("COMPLETED") + e.count("QUEUED") + e.count("ARRIVED") + e.count("PICKED_UP") + e.count("SEARCHING"),
                "active", activeCount,
                "completed", e.count("COMPLETED"),
                "critical", e.countPriority("CRITICAL"),
                "patients", patientRepository.count(),
                "drivers", d.all().size(),
                "ambulances", ambulanceRepository.count(),
                "hospitals", h.all().size()
        );
    }

    @GetMapping("/hospitals")
    public Object hospitals() {
        return h.all();
    }

    @GetMapping("/users")
    public List<Map<String, Object>> users() {
        return userRepository.findAll().stream().map(u -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", u.getId());
            map.put("fullName", u.getFullName());
            map.put("email", u.getEmail());
            map.put("phone", u.getPhone());
            map.put("role", u.getRole().name());
            map.put("active", u.isActive());
            map.put("createdAt", u.getCreatedAt());
            return map;
        }).toList();
    }

    @PostMapping("/users/{id}/toggle-active")
    public Map<String, Object> toggleUserActive(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("User not found"));
        user.setActive(!user.isActive());
        userRepository.save(user);
        return Map.of("id", user.getId(), "active", user.isActive());
    }


    @GetMapping("/managers")
    public List<Map<String, Object>> managers() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == com.rapidrescue.entity.Role.HOSPITAL_MANAGER && u.isActive())
                .map(u -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", u.getId());
                    map.put("fullName", u.getFullName());
                    map.put("email", u.getEmail());
                    map.put("phone", u.getPhone());
                    map.put("role", u.getRole().name());
                    return map;
                }).toList();
    }

    @DeleteMapping("/hospitals/{hospitalId}")
    public Map<String, Object> deactivateHospital(@PathVariable Long hospitalId) {
        Hospital hospital = h.get(hospitalId);
        hospital.setActive(false);
        h.save(hospital);
        return Map.of("id", hospitalId, "active", false, "message", "Hospital deactivated successfully.");
    }

    @PostMapping("/hospitals/{hospitalId}/assign-manager")
    @Transactional
    public Map<String, Object> assignManager(
            @PathVariable Long hospitalId,
            @RequestParam Long managerId) {
        Hospital hospital = h.get(hospitalId);
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new NoSuchElementException("Manager user not found"));
        if (manager.getRole() != com.rapidrescue.entity.Role.HOSPITAL_MANAGER) {
            throw new IllegalArgumentException("Only a Hospital Manager account can be assigned to a hospital.");
        }
        if (!manager.isActive()) {
            throw new IllegalArgumentException("This Hospital Manager account is inactive. Activate it before assigning a hospital.");
        }
        if (!hospital.isActive()) {
            throw new IllegalArgumentException("This hospital is inactive. Reactivate it before assigning a manager.");
        }
        // A manager dashboard represents one assigned hospital. If this manager was
        // previously assigned elsewhere, clear that previous association in the same
        // transaction so /hospitals/my-hospital cannot resolve a stale assignment.
        h.clearPreviousManagerAssignment(manager.getId(), hospitalId);
        hospital.setManager(manager);
        Hospital saved = h.save(hospital);
        // Return a safe response; never serialize the manager's password hash.
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", saved.getId());
        response.put("name", saved.getName());
        response.put("managerId", manager.getId());
        response.put("managerName", manager.getFullName());
        response.put("managerEmail", manager.getEmail());
        return response;
    }
}
