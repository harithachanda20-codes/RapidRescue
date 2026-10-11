package com.rapidrescue.socket;
import org.springframework.messaging.simp.SimpMessagingTemplate; import org.springframework.stereotype.Component;
@Component public class SocketHandler {
 private final SimpMessagingTemplate template; public SocketHandler(SimpMessagingTemplate t){template=t;}
 public void requestUpdate(Object payload){template.convertAndSend("/topic/requests",payload);}
 public void tracking(Long bookingId,Object payload){template.convertAndSend("/topic/tracking/"+bookingId,payload);}
 public void driverLocation(Long ambulanceId,Object payload){template.convertAndSend("/topic/ambulance/"+ambulanceId,payload);}
}
