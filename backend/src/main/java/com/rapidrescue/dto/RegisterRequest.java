package com.rapidrescue.dto;

import com.rapidrescue.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

    @NotBlank
    String fullName,

    @Email
    @NotBlank
    String email,

    @NotBlank
    String phone,

    @Size(min = 6)
    String password,

    Role role,

    String bloodGroup,

    String allergies,

    String emergencyContact,

    String licenseNumber,

    String licenseType,

    // Required only when registering an Admin
    String adminRegistrationCode

) {}