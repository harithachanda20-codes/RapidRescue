package com.rapidrescue.service;
import com.rapidrescue.entity.*; import com.rapidrescue.repository.*; import org.springframework.stereotype.Service; import java.util.*;
@Service public class PatientService {
 private final PatientRepository repo; public PatientService(PatientRepository r){repo=r;}
 public java.util.List<Patient> all(){return repo.findAll();} public Patient get(Long id){return repo.findById(id).orElseThrow(()->new NoSuchElementException("Patient not found"));}
 public Patient byUser(Long userId){return repo.findByUserId(userId).orElseThrow(()->new NoSuchElementException("Patient profile not found"));}
}
