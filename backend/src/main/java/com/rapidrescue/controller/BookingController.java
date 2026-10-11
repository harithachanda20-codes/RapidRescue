package com.rapidrescue.controller;

import com.rapidrescue.service.BookingService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingService s;

    public BookingController(BookingService s) {
        this.s = s;
    }

    @GetMapping("/{id}")
    public Object get(@PathVariable Long id) {
        return s.get(id);
    }

    @GetMapping("/patient/{patientId}")
    public Object patient(@PathVariable Long patientId) {
        return s.patient(patientId);
    }

    @GetMapping("/hospital/{hospitalId}")
    public Object hospital(@PathVariable Long hospitalId) {
        return s.hospital(hospitalId);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Object all() {
        return s.all();
    }
}
