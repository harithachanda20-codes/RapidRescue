package com.rapidrescue.service;
import com.rapidrescue.dto.AmbulanceResponse; import com.rapidrescue.entity.*; import com.rapidrescue.repository.*; import org.springframework.stereotype.Service; import java.util.*;
@Service public class AmbulanceService {
 private final AmbulanceRepository repo; public AmbulanceService(AmbulanceRepository r){repo=r;}
 public List<AmbulanceResponse> all(){return repo.findByActiveTrue().stream().map(this::dto).toList();}
 public List<AmbulanceResponse> available(){return repo.findByStatusAndActiveTrue("AVAILABLE").stream().filter(Ambulance::isEmergencyAvailable).map(this::dto).toList();}
 public Ambulance get(Long id){return repo.findById(id).orElseThrow(()->new NoSuchElementException("Ambulance not found"));}
 public Ambulance save(Ambulance a){return repo.save(a);}
 public AmbulanceResponse dto(Ambulance a){Driver d=a.getDriver();return new AmbulanceResponse(a.getId(),a.getAmbulanceNumber(),a.getType(),a.getStatus(),a.isEmergencyAvailable(),a.getLatitude(),a.getLongitude(),d==null?null:d.getId(),d==null?null:d.getUser().getFullName(),d==null?null:d.getUser().getPhone());}
}
