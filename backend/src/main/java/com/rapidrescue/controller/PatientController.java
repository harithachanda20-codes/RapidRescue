package com.rapidrescue.controller;

import com.rapidrescue.service.BookingService;
import com.rapidrescue.service.PatientService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/patients")
public class PatientController {
    private final PatientService s;
    private final BookingService b;

    public PatientController(PatientService s, BookingService b) {
        this.s = s;
        this.b = b;
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PATIENT','ADMIN')")
    public Object get(@PathVariable Long id) {
        return s.get(id);
    }

    @GetMapping("/{id}/bookings")
    @PreAuthorize("hasAnyRole('PATIENT','ADMIN')")
    public Object bookings(@PathVariable Long id) {
        return b.patient(id);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Object all() {
        return s.all();
    }
}
