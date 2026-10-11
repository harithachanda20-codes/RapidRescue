package com.rapidrescue.exception;
import org.springframework.http.*; import org.springframework.web.bind.MethodArgumentNotValidException; import org.springframework.web.bind.annotation.*; import java.time.*; import java.util.*;
@RestControllerAdvice public class GlobalExceptionHandler {
 private Map<String,Object> body(HttpStatus s,String m){return Map.of("timestamp",LocalDateTime.now(),"status",s.value(),"error",s.getReasonPhrase(),"message",m);}
 @ExceptionHandler(NoSuchElementException.class) ResponseEntity<?> notFound(NoSuchElementException e){return ResponseEntity.status(404).body(body(HttpStatus.NOT_FOUND,e.getMessage()));}
 @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class) ResponseEntity<?> forbidden(org.springframework.security.access.AccessDeniedException e){return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body(HttpStatus.FORBIDDEN,e.getMessage()));}
 @ExceptionHandler(IllegalStateException.class) ResponseEntity<?> illegalState(IllegalStateException e){return ResponseEntity.badRequest().body(body(HttpStatus.BAD_REQUEST,e.getMessage()));}
 @ExceptionHandler({IllegalArgumentException.class,MethodArgumentNotValidException.class}) ResponseEntity<?> bad(Exception e){return ResponseEntity.badRequest().body(body(HttpStatus.BAD_REQUEST,e instanceof MethodArgumentNotValidException?"Validation failed":e.getMessage()));}
 @ExceptionHandler(Exception.class) ResponseEntity<?> server(Exception e){return ResponseEntity.status(500).body(body(HttpStatus.INTERNAL_SERVER_ERROR,"Unexpected server error"));}
}
