package com.rapidrescue.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private final SecureRandom random = new SecureRandom();

    private final ConcurrentHashMap<String, OtpData> otpStorage =
            new ConcurrentHashMap<>();

    // Generate a 4-digit OTP
    public String generateOtp(String phone) {

        String otp = String.format(
                "%04d",
                random.nextInt(10_000)
        );

        LocalDateTime expiry = LocalDateTime.now().plusMinutes(5);

        otpStorage.put(
                phone,
                new OtpData(otp, expiry, 0)
        );

        // DEVELOPMENT ONLY: Print OTP in IntelliJ console
        System.out.println(
                "[RapidRescue DEV] OTP for "
                        + phone + " is: " + otp
        );

        return otp;
    }

    // Verify the OTP
    public boolean verifyOtp(String phone, String otp) {

        OtpData data = otpStorage.get(phone);

        // Check whether an OTP exists
        if (data == null) {
            return false;
        }

        // Check whether the OTP has expired
        if (LocalDateTime.now().isAfter(data.expiry())) {
            otpStorage.remove(phone);
            return false;
        }

        // Allow a maximum of 5 verification attempts
        if (data.attempts() >= 5) {
            otpStorage.remove(phone);
            return false;
        }

        // Check whether the OTP matches
        if (!data.otp().equals(otp)) {

            otpStorage.computeIfPresent(
                    phone,
                    (key, current) -> new OtpData(
                            current.otp(),
                            current.expiry(),
                            current.attempts() + 1
                    )
            );

            return false;
        }

        // Remove OTP after successful verification
        otpStorage.remove(phone);

        return true;
    }

    // Store OTP details temporarily in memory
    private record OtpData(
            String otp,
            LocalDateTime expiry,
            int attempts
    ) {
    }
}