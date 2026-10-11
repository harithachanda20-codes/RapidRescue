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
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
@Configuration public class DatabaseConfig {
 @Bean CommandLineRunner seed(UserRepository users,PatientRepository patients,DriverRepository drivers,AmbulanceRepository ambulances,HospitalRepository hospitals,PasswordEncoder encoder){
  return args -> {
   if(!users.existsByEmail("admin@rapidrescue.com")){User u=new User();u.setFullName("RapidRescue Admin");u.setEmail("admin@rapidrescue.com");u.setPhone("9000000000");u.setPassword(encoder.encode("Admin@123"));u.setRole(Role.ADMIN);users.save(u);}
   if(hospitals.count()==0){String[][] hs={{"Apollo Hospitals Jubilee Hills","17.4216","78.4071","+914023633333"},{"Yashoda Hospitals Secunderabad","17.4399","78.4983","+914067777777"},{"KIMS Hospitals Secunderabad","17.4396","78.4982","+914023455678"},{"CARE Hospitals Banjara Hills","17.4156","78.4482","+914061616565"},{"AIG Hospitals Gachibowli","17.4435","78.3521","+914023333333"},{"NIMS Hyderabad","17.4068","78.4691","+914023398888"},{"Osmania General Hospital","17.3725","78.4800","+914023461000"}};for(String[] h:hs){Hospital x=new Hospital();x.setName(h[0]);x.setLatitude(Double.valueOf(h[1]));x.setLongitude(Double.valueOf(h[2]));x.setPhone(h[3]);x.setAddress("Hyderabad, Telangana");hospitals.save(x);}}
   if(!users.existsByEmail("driver@rapidrescue.com")){User u=new User();u.setFullName("Demo Driver");u.setEmail("driver@rapidrescue.com");u.setPhone("9000000011");u.setPassword(encoder.encode("Driver@123"));u.setRole(Role.DRIVER);users.save(u);Driver d=new Driver();d.setUser(u);d.setLicenseNumber("TS-AMB-001");d.setLicenseType("ALS");d.setOnline(true);d.setAvailable(true);d.setLatitude(17.385);d.setLongitude(78.4867);drivers.save(d);Ambulance a=new Ambulance();a.setAmbulanceNumber("RR-101");a.setType("ALS");a.setStatus("AVAILABLE");a.setLatitude(17.385);a.setLongitude(78.4867);a.setDriver(d);d.setAmbulance(a);ambulances.save(a);drivers.save(d);}
   if(!users.existsByEmail("manager@rapidrescue.com")){
    User u=new User();
    u.setFullName("Demo Hospital Manager");
    u.setEmail("manager@rapidrescue.com");
    u.setPhone("9000000033");
    u.setPassword(encoder.encode("Manager@123"));
    u.setRole(Role.HOSPITAL_MANAGER);
    users.save(u);
    hospitals.findFirstByOrderByIdAsc().ifPresent(h -> {
     if(h.getManager() == null) {
      h.setManager(u);
      hospitals.save(h);
     }
    });
   }
  };
 }
}
