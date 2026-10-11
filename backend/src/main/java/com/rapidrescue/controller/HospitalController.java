package com.rapidrescue.controller;
import com.rapidrescue.dto.HospitalResponse;
import com.rapidrescue.entity.Hospital;
import com.rapidrescue.entity.User;
import com.rapidrescue.repository.UserRepository;
import com.rapidrescue.service.HospitalService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.*;

@RestController
@RequestMapping("/api/hospitals")
public class HospitalController {

    private final HospitalService s;
    private final UserRepository userRepository;

    public HospitalController(HospitalService s, UserRepository userRepository) {
        this.s = s;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<HospitalResponse> all() {
        return s.all();
    }

    @GetMapping("/nearby")
    public List<HospitalResponse> nearby(@RequestParam double lat, @RequestParam double lng) {
        return s.nearby(lat, lng);
    }

    @GetMapping("/my-hospital")
    public ResponseEntity<?> myHospital(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getName() == null
                || "anonymousUser".equals(authentication.getName())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Please sign in again to access the Hospital Manager dashboard."
            );
        }
        User user = userRepository.findByEmail(authentication.getName());
        if (user == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "The signed-in account was not found. Sign out and sign in again."
            );
        }
        if (user.getRole() != com.rapidrescue.entity.Role.HOSPITAL_MANAGER) {
            throw new AccessDeniedException(
                    "This session belongs to " + user.getRole() + " (" + user.getEmail() + "). " +
                    "Sign out and sign in with the exact HOSPITAL_MANAGER account assigned by Admin."
            );
        }
        if (!user.isActive()) {
            throw new AccessDeniedException("This Hospital Manager account is inactive. Ask Admin to activate it.");
        }
        try {
            return ResponseEntity.ok(s.responseForManager(user.getId()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(404).body(Map.of(
                    "message", "No hospital is assigned to this Hospital Manager account. Ask an Admin to assign this exact account in Manage Hospitals, then sign out and sign in again."
            ));
        }
    }

    @PutMapping("/{id}/availability")
    public HospitalResponse updateAvailability(
            @PathVariable Long id,
            @RequestParam boolean emergencyAvailable,
            @RequestParam(required = false) Integer capacity,
            Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName());
        if (user == null || !user.isActive()) {
            throw new org.springframework.security.access.AccessDeniedException("Your account is unavailable. Please sign in again.");
        }
        if (user.getRole() != com.rapidrescue.entity.Role.ADMIN
                && user.getRole() != com.rapidrescue.entity.Role.HOSPITAL_MANAGER) {
            throw new org.springframework.security.access.AccessDeniedException("Only an administrator or the assigned Hospital Manager can update hospital availability.");
        }
        if (user.getRole() == com.rapidrescue.entity.Role.HOSPITAL_MANAGER) {
            Hospital h = s.get(id);
            if (h.getManager() == null || !h.getManager().getId().equals(user.getId())) {
                throw new AccessDeniedException("Your account is not assigned to this hospital.");
            }
        }
        Hospital updated = s.updateAvailability(id, emergencyAvailable, capacity);
        return new HospitalResponse(updated.getId(), updated.getName(), updated.getAddress(),
                updated.getLatitude(), updated.getLongitude(), updated.getPhone(),
                updated.isEmergencyAvailable(), updated.getCapacity(), null,
                updated.getManager() == null ? null : updated.getManager().getId(),
                updated.getManager() == null ? null : updated.getManager().getFullName(),
                updated.getManager() == null ? null : updated.getManager().getEmail());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public HospitalResponse create(@RequestBody Hospital h) {
        Hospital saved = s.save(h);
        return new HospitalResponse(saved.getId(), saved.getName(), saved.getAddress(),
                saved.getLatitude(), saved.getLongitude(), saved.getPhone(),
                saved.isEmergencyAvailable(), saved.getCapacity(), null,
                saved.getManager() == null ? null : saved.getManager().getId(),
                saved.getManager() == null ? null : saved.getManager().getFullName(),
                saved.getManager() == null ? null : saved.getManager().getEmail());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public HospitalResponse update(@PathVariable Long id, @RequestBody Hospital in) {
        Hospital h = s.get(id);
        if (in.getName() != null) h.setName(in.getName());
        if (in.getAddress() != null) h.setAddress(in.getAddress());
        if (in.getLatitude() != null) h.setLatitude(in.getLatitude());
        if (in.getLongitude() != null) h.setLongitude(in.getLongitude());
        if (in.getPhone() != null) h.setPhone(in.getPhone());
        h.setEmergencyAvailable(in.isEmergencyAvailable());
        h.setCapacity(in.getCapacity());
        Hospital saved = s.save(h);
        return new HospitalResponse(saved.getId(), saved.getName(), saved.getAddress(),
                saved.getLatitude(), saved.getLongitude(), saved.getPhone(),
                saved.isEmergencyAvailable(), saved.getCapacity(), null,
                saved.getManager() == null ? null : saved.getManager().getId(),
                saved.getManager() == null ? null : saved.getManager().getFullName(),
                saved.getManager() == null ? null : saved.getManager().getEmail());
    }
}
