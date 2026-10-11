package com.rapidrescue.entity;
import jakarta.persistence.*; import java.time.LocalDateTime;
@Entity @Table(indexes={@Index(name="idx_emergency_status",columnList="status"),@Index(name="idx_emergency_patient",columnList="patient_id")})
public class EmergencyRequest {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @Column(nullable=false,unique=true) private String trackingToken;
 @ManyToOne(optional=false) private Patient patient;
 private Double pickupLatitude; private Double pickupLongitude;
 private String priority="NORMAL"; private String type="OTHER"; private String status="SEARCHING"; private String notes; private boolean hospitalAck;
 private LocalDateTime createdAt=LocalDateTime.now(); private LocalDateTime updatedAt=LocalDateTime.now(); private LocalDateTime assignedAt;
 @ManyToOne private Ambulance ambulance; @ManyToOne private Driver driver; @ManyToOne private Hospital hospital;
 public Long getId(){return id;} public String getTrackingToken(){return trackingToken;} public void setTrackingToken(String v){trackingToken=v;}
 public Patient getPatient(){return patient;} public void setPatient(Patient v){patient=v;} public Double getPickupLatitude(){return pickupLatitude;} public void setPickupLatitude(Double v){pickupLatitude=v;}
 public Double getPickupLongitude(){return pickupLongitude;} public void setPickupLongitude(Double v){pickupLongitude=v;} public String getPriority(){return priority;} public void setPriority(String v){priority=v;}
 public String getType(){return type;} public void setType(String v){type=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;}
 public String getNotes(){return notes;} public void setNotes(String v){notes=v;} public boolean isHospitalAck(){return hospitalAck;} public void setHospitalAck(boolean v){hospitalAck=v;}
 public LocalDateTime getCreatedAt(){return createdAt;} public LocalDateTime getUpdatedAt(){return updatedAt;} public void touch(){updatedAt=LocalDateTime.now();}
 public LocalDateTime getAssignedAt(){return assignedAt;} public void setAssignedAt(LocalDateTime v){assignedAt=v;} public Ambulance getAmbulance(){return ambulance;} public void setAmbulance(Ambulance v){ambulance=v;}
 public Driver getDriver(){return driver;} public void setDriver(Driver v){driver=v;} public Hospital getHospital(){return hospital;} public void setHospital(Hospital v){hospital=v;}
}
