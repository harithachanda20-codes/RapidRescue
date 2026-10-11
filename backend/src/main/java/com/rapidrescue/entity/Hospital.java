package com.rapidrescue.entity;
import jakarta.persistence.*;
@Entity
public class Hospital {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private String name; private String address; private Double latitude; private Double longitude;
 private String phone; private boolean emergencyAvailable=true; private Integer capacity; private boolean active=true;
 @ManyToOne @JoinColumn(name="manager_user_id") private User manager;
 public Long getId(){return id;} public String getName(){return name;} public void setName(String v){name=v;} public String getAddress(){return address;} public void setAddress(String v){address=v;}
 public Double getLatitude(){return latitude;} public void setLatitude(Double v){latitude=v;} public Double getLongitude(){return longitude; } public void setLongitude(Double v){longitude=v;}
 public String getPhone(){return phone;} public void setPhone(String v){phone=v;} public boolean isEmergencyAvailable(){return emergencyAvailable;} public void setEmergencyAvailable(boolean v){emergencyAvailable=v;}
 public Integer getCapacity(){return capacity;} public void setCapacity(Integer v){capacity=v;} public boolean isActive(){return active;} public void setActive(boolean v){active=v;}
 public User getManager(){return manager;} public void setManager(User v){manager=v;}
}
