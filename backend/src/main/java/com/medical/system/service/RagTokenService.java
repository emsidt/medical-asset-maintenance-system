package com.medical.system.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class RagTokenService {

    @Value("${rag.jwt.secret}")
    private String ragJwtSecret;

    @Value("${rag.jwt.expiration-ms}")
    private long expirationMs;

    @Value("${rag.jwt.issuer}")
    private String issuer;

    @Value("${rag.jwt.audience}")
    private String audience;

    public String generateRagToken(String username, String role) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusMillis(expirationMs);

        return Jwts.builder()
                .setIssuer(issuer)
                .setAudience(audience)
                .setSubject(username)
                .claim("role", role)
                .claim("scope", "rag:chat")
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiresAt))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public long getExpiresInSeconds() {
        return expirationMs / 1000;
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(ragJwtSecret.getBytes(StandardCharsets.UTF_8));
    }
}