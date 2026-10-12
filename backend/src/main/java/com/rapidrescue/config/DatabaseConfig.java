package com.rapidrescue.config;

import com.rapidrescue.entity.Ambulance;
import com.rapidrescue.entity.Driver;
import com.rapidrescue.entity.Hospital;
import com.rapidrescue.entity.Role;
import com.rapidrescue.entity.User;

import com.rapidrescue.repository.AmbulanceRepository;
import com.rapidrescue.repository.DriverRepository;
import com.rapidrescue.repository.HospitalRepository;
import com.rapidrescue.repository.PatientRepository;
import com.rapidrescue.repository.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DatabaseConfig {

 @Value("${ADMIN_RESET_PASSWORD:}")
 private String adminResetPassword;

 @Bean
 CommandLineRunner seed(
         UserRepository users,
         PatientRepository patients,
         DriverRepository drivers,
         AmbulanceRepository ambulances,
         HospitalRepository hospitals,
         PasswordEncoder encoder) {

  return args -> {

   // --------------------------------------------------
   // 1. CREATE OR RESET ADMIN ACCOUNT
   // --------------------------------------------------

   String adminEmail = "admin@rapidrescue.com";

   User admin = users.findByEmail(adminEmail);

   if (adminResetPassword != null
           && !adminResetPassword.isBlank()) {

    if (adminResetPassword.length() < 12) {
     throw new IllegalStateException(
             "ADMIN_RESET_PASSWORD must contain at least 12 characters."
     );
    }

    if (admin == null) {
     admin = new User();
     admin.setFullName("RapidRescue Admin");
     admin.setEmail(adminEmail);
     admin.setPhone("9000000000");
     admin.setRole(Role.ADMIN);
    }

    if (admin.getRole() != Role.ADMIN) {
     throw new IllegalStateException(
             "The configured admin email does not belong to an ADMIN account."
     );
    }

    admin.setPassword(
            encoder.encode(adminResetPassword)
    );

    users.save(admin);

    System.out.println(
            "Admin password reset completed."
    );

   } else if (admin == null) {

    // Create the default admin only if no account exists.
    User newAdmin = new User();

    newAdmin.setFullName("RapidRescue Admin");
    newAdmin.setEmail(adminEmail);
    newAdmin.setPhone("9000000000");
    newAdmin.setPassword(
            encoder.encode("Admin@123")
    );
    newAdmin.setRole(Role.ADMIN);

    users.save(newAdmin);
   }

   // --------------------------------------------------
   // 2. INITIALIZE HOSPITALS
   // --------------------------------------------------

   if (hospitals.count() == 0) {

    String[][] hospitalData = {
            {
                    "Apollo Hospitals Jubilee Hills",
                    "17.4216",
                    "78.4071",
                    "+914023633333"
            },
            {
                    "Yashoda Hospitals Secunderabad",
                    "17.4399",
                    "78.4983",
                    "+914067777777"
            },
            {
                    "KIMS Hospitals Secunderabad",
                    "17.4396",
                    "78.4982",
                    "+914023455678"
            },
            {
                    "CARE Hospitals Banjara Hills",
                    "17.4156",
                    "78.4482",
                    "+914061616565"
            },
            {
                    "AIG Hospitals Gachibowli",
                    "17.4435",
                    "78.3521",
                    "+914023333333"
            },
            {
                    "NIMS Hyderabad",
                    "17.4068",
                    "78.4691",
                    "+914023398888"
            },
            {
                    "Osmania General Hospital",
                    "17.3725",
                    "78.4800",
                    "+914023461000"
            }
    };

    for (String[] data : hospitalData) {

     Hospital hospital = new Hospital();

     hospital.setName(data[0]);
     hospital.setLatitude(
             Double.valueOf(data[1])
     );
     hospital.setLongitude(
             Double.valueOf(data[2])
     );
     hospital.setPhone(data[3]);
     hospital.setAddress(
             "Hyderabad, Telangana"
     );

     hospitals.save(hospital);
    }
   }

   // --------------------------------------------------
   // 3. CREATE DEMO DRIVER AND AMBULANCE IF MISSING
   // --------------------------------------------------

   if (!users.existsByEmail("driver@rapidrescue.com")) {

    User driverUser = new User();

    driverUser.setFullName("Demo Driver");
    driverUser.setEmail("driver@rapidrescue.com");
    driverUser.setPhone("9000000011");
    driverUser.setPassword(
            encoder.encode("Driver@123")
    );
    driverUser.setRole(Role.DRIVER);

    users.save(driverUser);

    Driver driver = new Driver();

    driver.setUser(driverUser);
    driver.setLicenseNumber("TS-AMB-001");
    driver.setLicenseType("ALS");
    driver.setOnline(true);
    driver.setAvailable(true);
    driver.setLatitude(17.385);
    driver.setLongitude(78.4867);

    drivers.save(driver);

    Ambulance ambulance = new Ambulance();

    ambulance.setAmbulanceNumber("RR-101");
    ambulance.setType("ALS");
    ambulance.setStatus("AVAILABLE");
    ambulance.setLatitude(17.385);
    ambulance.setLongitude(78.4867);
    ambulance.setDriver(driver);

    driver.setAmbulance(ambulance);

    ambulances.save(ambulance);
    drivers.save(driver);
   }

   // --------------------------------------------------
   // 4. CREATE DEMO HOSPITAL MANAGER IF MISSING
   // --------------------------------------------------

   if (!users.existsByEmail("manager@rapidrescue.com")) {

    User manager = new User();

    manager.setFullName("Demo Hospital Manager");
    manager.setEmail("manager@rapidrescue.com");
    manager.setPhone("9000000033");
    manager.setPassword(
            encoder.encode("Manager@123")
    );
    manager.setRole(Role.HOSPITAL_MANAGER);

    users.save(manager);

    hospitals.findFirstByOrderByIdAsc()
            .ifPresent(hospital -> {

             if (hospital.getManager() == null) {
              hospital.setManager(manager);
              hospitals.save(hospital);
             }
            });
   }
  };
 }
}