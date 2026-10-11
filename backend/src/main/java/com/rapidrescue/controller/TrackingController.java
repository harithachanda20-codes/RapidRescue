package com.rapidrescue.controller;
import com.rapidrescue.service.TrackingService; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/tracking") public class TrackingController {private final TrackingService s;public TrackingController(TrackingService s){this.s=s;}@GetMapping("/{token}") public Object track(@PathVariable String token){return s.byToken(token);}}
