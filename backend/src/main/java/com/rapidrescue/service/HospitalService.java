package com.rapidrescue.service;
import com.rapidrescue.dto.HospitalResponse; import com.rapidrescue.entity.Hospital; import com.rapidrescue.repository.HospitalRepository; import com.rapidrescue.util.DistanceCalculator; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional; import java.util.*;
@Service public class HospitalService {
 private final HospitalRepository repo; public HospitalService(HospitalRepository r){repo=r;}
 public List<HospitalResponse> all(){return repo.findByActiveTrue().stream().map(h->dto(h,null)).toList();}
 public List<HospitalResponse> nearby(double lat,double lng){return repo.findByActiveTrue().stream().map(h->dto(h,DistanceCalculator.km(lat,lng,h.getLatitude(),h.getLongitude()))).sorted(Comparator.comparing(HospitalResponse::distanceKm)).toList();}
 public Hospital nearest(double lat,double lng){return nearby(lat,lng).stream().findFirst().map(x->repo.findById(x.id()).orElseThrow()).orElse(null);}
 @Transactional public Hospital save(Hospital h){return repo.save(h);} @Transactional public void clearPreviousManagerAssignment(Long managerId, Long targetHospitalId){repo.findByManager_Id(managerId).ifPresent(previous->{if(!previous.getId().equals(targetHospitalId)){previous.setManager(null);repo.save(previous);}});} public Hospital get(Long id){return repo.findById(id).orElseThrow(()->new NoSuchElementException("Hospital not found"));}
 public Hospital forManager(Long userId){return repo.findByManager_Id(userId).orElseThrow(()->new NoSuchElementException("No hospital is assigned to this manager account."));}
 @Transactional(readOnly=true) public HospitalResponse responseForManager(Long userId){return dto(forManager(userId), null);}
 public Hospital updateAvailability(Long id,boolean available,Integer cap){Hospital h=get(id);h.setEmergencyAvailable(available);if(cap!=null&&cap>=0)h.setCapacity(cap);return repo.save(h);}
 private HospitalResponse dto(Hospital h,Double d){return new HospitalResponse(h.getId(), h.getName(), h.getAddress(), h.getLatitude(), h.getLongitude(), h.getPhone(), h.isEmergencyAvailable(), h.getCapacity(), d, h.getManager() == null ? null : h.getManager().getId(), h.getManager() == null ? null : h.getManager().getFullName(), h.getManager() == null ? null : h.getManager().getEmail());}
}
