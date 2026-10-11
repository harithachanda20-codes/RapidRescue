package com.rapidrescue.controller;

import com.rapidrescue.dto.*;
import com.rapidrescue.service.AuthService;
import com.rapidrescue.service.OtpService;
import com.rapidrescue.entity.User;
import com.rapidrescue.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;
    private final UserRepository userRepository;

    public AuthController(
            AuthService authService,
            OtpService otpService,
            UserRepository userRepository) {
        this.authService = authService;
        this.otpService = otpService;
        this.userRepository = userRepository;
    }

    // Register a new account
    @PostMapping("/register")
    public AuthResponse register(
            @Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    // Existing email/password login for Admin and Drivers
    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    // Request an OTP
    @PostMapping("/otp/request")
    public Map<String, String> requestOtp(
            @Valid @RequestBody OtpRequest request) {

        otpService.generateOtp(request.phone());

        return Map.of(
                "message",
                "OTP generated. SMS delivery is not configured yet."
        );
    }

    // Verify OTP and log in the existing patient
    @PostMapping("/otp/verify")
    public AuthResponse verifyOtp(
            @Valid @RequestBody OtpVerifyRequest request) {

        boolean verified = otpService.verifyOtp(
                request.phone(),
                request.otp()
        );

        if (!verified) {
            throw new IllegalArgumentException(
                    "Invalid or expired OTP"
            );
        }

        return authService.loginWithPhone(request.phone());
    }


    /** Returns the current authenticated identity without exposing credentials. */
    @GetMapping("/me")
    public Map<String, Object> currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in again.");
        }
        User user = userRepository.findByEmail(authentication.getName());
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "The signed-in account no longer exists.");
        }
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("name", user.getFullName());
        result.put("email", user.getEmail());
        result.put("role", user.getRole() == null ? null : user.getRole().name());
        result.put("active", user.isActive());
        return result;
    }

    // Logout
    @PostMapping("/logout")
    public Map<String, String> logout() {
        return Map.of(
                "message",
                "Logout is client-side for JWT authentication"
        );
    }
}