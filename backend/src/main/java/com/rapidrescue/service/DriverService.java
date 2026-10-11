package com.rapidrescue.service;
import com.rapidrescue.dto.LocationRequest; import com.rapidrescue.entity.*; import com.rapidrescue.repository.*; import org.springframework.stereotype.Service; import java.util.*;
@Service public class DriverService {
 private final DriverRepository drivers; private final AmbulanceRepository ambulances; private final LocationService locations;
 public DriverService(DriverRepository d,AmbulanceRepository a,LocationService l){drivers=d;ambulances=a;locations=l;}
 public List<Driver> all(){return drivers.findAll();} public Driver get(Long id){return drivers.findById(id).orElseThrow(()->new NoSuchElementException("Driver not found"));}
 public Driver status(Long id,boolean online,boolean available){Driver d=get(id);d.setOnline(online);d.setAvailable(available);return drivers.save(d);}
 public Driver updateLocation(Long id,LocationRequest r){Driver d=get(id);if(!com.rapidrescue.util.LocationUtil.valid(r.latitude(),r.longitude()))throw new IllegalArgumentException("Invalid coordinates");d.setLatitude(r.latitude());d.setLongitude(r.longitude());if(d.getAmbulance()!=null){d.getAmbulance().setLatitude(r.latitude());d.getAmbulance().setLongitude(r.longitude());ambulances.save(d.getAmbulance());}return drivers.save(d);}
}
