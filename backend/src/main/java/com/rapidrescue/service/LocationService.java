package com.rapidrescue.service;
import com.rapidrescue.dto.LocationRequest; import com.rapidrescue.entity.*; import com.rapidrescue.repository.*; import com.rapidrescue.socket.SocketHandler; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
@Service public class LocationService {
 private final AmbulanceRepository ambulances; private final LocationRepository locations; private final SocketHandler socket;
 public LocationService(AmbulanceRepository a,LocationRepository l,SocketHandler s){ambulances=a;locations=l;socket=s;}
 @Transactional public void updateLocation(Long ambulanceId,Double lat,Double lng){Ambulance a=ambulances.findById(ambulanceId).orElseThrow();a.setLatitude(lat);a.setLongitude(lng);ambulances.save(a);Location x=new Location();x.setAmbulance(a);x.setLatitude(lat);x.setLongitude(lng);locations.save(x);socket.driverLocation(ambulanceId,new LocationRequest(lat,lng));}
 public java.util.List<Location> history(Long ambulanceId){return locations.findTop50ByAmbulanceIdOrderByTimestampDesc(ambulanceId);}
}
