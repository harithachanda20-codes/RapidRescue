package com.rapidrescue.entity;
import jakarta.persistence.*; import com.fasterxml.jackson.annotation.JsonIgnore;
@Entity
public class Driver {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @OneToOne(optional=false) @JoinColumn(name="user_id",unique=true) private User user;
 @Column(nullable=false,unique=true) private String licenseNumber;
 private String licenseType; private boolean available=false; private boolean online=false;
 private Double latitude; private Double longitude;
 @JsonIgnore @OneToOne(mappedBy="driver") private Ambulance ambulance;
 public Long getId(){return id;} public User getUser(){return user;} public void setUser(User v){user=v;}
 public String getLicenseNumber(){return licenseNumber;} public void setLicenseNumber(String v){licenseNumber=v;}
 public String getLicenseType(){return licenseType;} public void setLicenseType(String v){licenseType=v;}
 public boolean isAvailable(){return available;} public void setAvailable(boolean v){available=v;}
 public boolean isOnline(){return online;} public void setOnline(boolean v){online=v;}
 public Double getLatitude(){return latitude;} public void setLatitude(Double v){latitude=v;}
 public Double getLongitude(){return longitude;} public void setLongitude(Double v){longitude=v;}
 public Ambulance getAmbulance(){return ambulance;} public void setAmbulance(Ambulance v){ambulance=v;}
}
