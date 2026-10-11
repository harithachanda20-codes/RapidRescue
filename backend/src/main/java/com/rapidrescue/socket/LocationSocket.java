package com.rapidrescue.socket;
import com.rapidrescue.dto.LocationRequest; import com.rapidrescue.service.LocationService; import org.springframework.messaging.handler.annotation.*; import org.springframework.stereotype.Controller;
@Controller public class LocationSocket {
 private final LocationService service; public LocationSocket(LocationService s){service=s;}
 @MessageMapping("/driver/location") public void update(LocationSocketMessage m){service.updateLocation(m.ambulanceId(),m.latitude(),m.longitude());}
 public record LocationSocketMessage(Long ambulanceId,Double latitude,Double longitude){}
}
