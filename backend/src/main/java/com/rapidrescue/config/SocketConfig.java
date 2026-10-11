package com.rapidrescue.config;
import org.springframework.context.annotation.*; import org.springframework.messaging.simp.config.MessageBrokerRegistry; import org.springframework.web.socket.config.annotation.*;
@Configuration @EnableWebSocketMessageBroker public class SocketConfig implements WebSocketMessageBrokerConfigurer {
 public void configureMessageBroker(MessageBrokerRegistry r){r.enableSimpleBroker("/topic");r.setApplicationDestinationPrefixes("/app");}
 public void registerStompEndpoints(StompEndpointRegistry r){
  r.addEndpoint("/ws").setAllowedOriginPatterns("*");
  r.addEndpoint("/ws").setAllowedOriginPatterns("*").withSockJS();
 }
}
