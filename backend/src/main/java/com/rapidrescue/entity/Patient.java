package com.rapidrescue.entity;
import jakarta.persistence.*;
@Entity
public class Patient {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @OneToOne(optional=false) @JoinColumn(name="user_id",unique=true) private User user;
 private String bloodGroup; private String allergies; private String emergencyContact;
 public Long getId(){return id;} public User getUser(){return user;} public void setUser(User u){user=u;}
 public String getBloodGroup(){return bloodGroup;} public void setBloodGroup(String v){bloodGroup=v;}
 public String getAllergies(){return allergies;} public void setAllergies(String v){allergies=v;}
 public String getEmergencyContact(){return emergencyContact;} public void setEmergencyContact(String v){emergencyContact=v;}
}
