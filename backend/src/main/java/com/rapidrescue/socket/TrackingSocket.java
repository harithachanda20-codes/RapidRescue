package com.rapidrescue.socket;
import org.springframework.messaging.handler.annotation.*; import org.springframework.messaging.simp.SimpMessagingTemplate; import org.springframework.stereotype.Controller;
@Controller public class TrackingSocket {
 private final SimpMessagingTemplate template; public TrackingSocket(SimpMessagingTemplate t){template=t;}
 @MessageMapping("/tracking/watch") public void watch(WatchMessage m){ if(m.bookingId()!=null) template.convertAndSend("/topic/tracking/"+m.bookingId(), java.util.Map.of("watching",true,"bookingId",m.bookingId()));}
 public record WatchMessage(Long bookingId){}
}
