package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.auth.LoginRequest;
import com.medical.system.dto.auth.LoginResponse;
import com.medical.system.model.entity.User;
import com.medical.system.repository.UserRepository;
import com.medical.system.security.JwtService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for authentication-related endpoints.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

        private final AuthenticationManager authenticationManager;
        private final JwtService jwtService;
        private final UserRepository userRepository;

        /**
         * Authenticates a user and returns a JWT token.
         */
        @PostMapping("/login")
        public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest loginRequest) {
                // Authenticate the user
                Authentication authentication = authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(
                                                loginRequest.getUsername(),
                                                loginRequest.getPassword()));

                // Fetch user to get the role (or extract from authentication principal)
                User user = userRepository.findByUsername(loginRequest.getUsername())
                                .orElseThrow(() -> new RuntimeException("User not found after authentication"));

                // Generate token
                String token = jwtService.generateToken(user.getUsername(), user.getRole().name());

                LoginResponse loginResponse = LoginResponse.builder()
                                .token(token)
                                .username(user.getUsername())
                                .role(user.getRole().name())
                                .build();

                return ResponseEntity.ok(ApiResponse.success(loginResponse, "Login successful"));
        }
}
