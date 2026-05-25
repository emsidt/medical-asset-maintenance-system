package com.medical.system.dto.rag;

public record RagTokenResponse(
        String ragBaseUrl,
        String tokenType,
        String accessToken,
        long expiresIn,
        RagUser user
) {
    public record RagUser(String username, String role) {
    }
}