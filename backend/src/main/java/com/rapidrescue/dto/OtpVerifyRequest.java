package com.rapidrescue.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record OtpVerifyRequest(

        @NotBlank(message = "Phone number is required")
        @Pattern(
                regexp = "^[6-9]\\d{9}$",
                message = "Enter a valid 10-digit Indian mobile number"
        )
        String phone,

        @NotBlank(message = "OTP is required")
        @Pattern(
                regexp = "^\\d{4}$",
                message = "OTP must contain exactly 4 digits"
        )
        String otp

) {}