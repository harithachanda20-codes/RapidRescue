package com.rapidrescue.entity;
import jakarta.persistence.*; import java.time.LocalDateTime;
@Entity @Table(indexes={@Index(name="idx_location_ambulance_time",columnList="ambulance_id,timestamp")})
public class Location {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(optional=false) private Ambulance ambulance; @ManyToOne private Booking booking;
 private Double latitude; private Double longitude; private LocalDateTime timestamp=LocalDateTime.now();
 public Long getId(){return id;} public Ambulance getAmbulance(){return ambulance;} public void setAmbulance(Ambulance v){ambulance=v;}
 public Booking getBooking(){return booking;} public void setBooking(Booking v){booking=v;} public Double getLatitude(){return latitude;} public void setLatitude(Double v){latitude=v;}
 public Double getLongitude(){return longitude;} public void setLongitude(Double v){longitude=v;} public LocalDateTime getTimestamp(){return timestamp;}
}
