package com.rapidrescue.security;

import com.rapidrescue.repository.UserRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

 private final UserRepository repo;

 public CustomUserDetailsService(UserRepository repo) {
  this.repo = repo;
 }

 @Override
 public UserDetails loadUserByUsername(String email) {

  var user = repo.findByEmail(email);

  if (user == null) {
   throw new UsernameNotFoundException(
           "User not found: " + email
   );
  }

  return User.withUsername(user.getEmail())
          .password(user.getPassword())
          .authorities("ROLE_" + user.getRole().name())
          .disabled(!user.isActive())
          .build();
 }
}