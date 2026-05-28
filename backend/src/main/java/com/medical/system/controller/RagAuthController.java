package com.medical.system.controller;

import com.medical.system.dto.rag.RagTokenResponse;
import com.medical.system.service.RagTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rag")
public class RagAuthController {

    private final RagTokenService ragTokenService;

    @Value("${rag.service.public-url}")
    private String ragPublicUrl;

    public RagAuthController(RagTokenService ragTokenService) {
        this.ragTokenService = ragTokenService;
    }

    @PostMapping("/token")
    public RagTokenResponse issueToken(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String username = jwt.getSubject();
        String role = jwt.getClaimAsString("role");

        String ragToken = ragTokenService.generateRagToken(username, role);

        return new RagTokenResponse(
                ragPublicUrl,
                "Bearer",
                ragToken,
                ragTokenService.getExpiresInSeconds(),
                new RagTokenResponse.RagUser(username, role)
        );
    }
}
