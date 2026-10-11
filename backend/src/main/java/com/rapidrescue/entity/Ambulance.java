package com.rapidrescue.entity;
import jakarta.persistence.*;
@Entity
public class Ambulance {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,unique=true) private String ambulanceNumber;
 private String type; private String status="AVAILABLE"; private boolean emergencyAvailable=true; private boolean active=true;
 private Double latitude; private Double longitude;
 @OneToOne @JoinColumn(name="driver_id") private Driver driver;
 public Long getId(){return id;} public String getAmbulanceNumber(){return ambulanceNumber;} public void setAmbulanceNumber(String v){ambulanceNumber=v;}
 public String getType(){return type;} public void setType(String v){type=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;}
 public boolean isEmergencyAvailable(){return emergencyAvailable;} public void setEmergencyAvailable(boolean v){emergencyAvailable=v;}
 public boolean isActive(){return active;} public void setActive(boolean v){active=v;}
 public Double getLatitude(){return latitude;} public void setLatitude(Double v){latitude=v;} public Double getLongitude(){return longitude;} public void setLongitude(Double v){longitude=v;}
 public Driver getDriver(){return driver;} public void setDriver(Driver v){driver=v;}
}