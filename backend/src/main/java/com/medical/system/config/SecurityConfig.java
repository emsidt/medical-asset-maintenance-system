package com.medical.system.config;

import com.medical.system.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Main security configuration class for role-based access control.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/api-docs/**").permitAll()

                        // Staff Management: chỉ ADMIN
                        .requestMatchers("/api/staff/**").hasRole("ADMIN")

                        // Dashboard: chỉ MANAGER và ADMIN
                        .requestMatchers("/api/dashboard/**").hasAnyRole("MANAGER", "ADMIN")

                        // Role-based restrictions
                        .requestMatchers("/api/users/**").hasRole("ADMIN")
                        .requestMatchers("/api/finance/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/assets/*/department").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/assets/*/report-failure").hasAnyRole("DOCTOR", "NURSE", "ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/service-requests/*/assign").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/service-requests/*/complete").hasRole("ENGINEER")
                        .requestMatchers("/api/service-requests/**").hasAnyRole("ENGINEER", "ADMIN", "MANAGER", "DOCTOR", "NURSE")
                        .requestMatchers("/api/inventory/**").hasAnyRole("ENGINEER", "ADMIN", "MANAGER")
                        .requestMatchers("/api/departments/**").authenticated()
                        .requestMatchers("/api/analytics/**").authenticated()
                        // General secured endpoints
                        .requestMatchers("/api/assets/**").authenticated()

                        // Any other request must be authenticated
                        .anyRequest().authenticated()
                );

        // Add our JWT filter before the standard username/password filter
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://127.0.0.1:3000"));

        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept", "Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"));
        configuration.setExposedHeaders(List.of("Access-Control-Allow-Origin", "Access-Control-Allow-Credentials"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}

