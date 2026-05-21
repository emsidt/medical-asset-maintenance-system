package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.asset.AssetScoreDto;
import com.medical.system.dto.dashboard.DepartmentScoreDto;
import com.medical.system.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Maintenance scoring and reporting endpoints")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @Operation(summary = "Get asset maintenance scores")
    @GetMapping("/assets/scores")
    public ResponseEntity<ApiResponse<List<AssetScoreDto>>> getAssetScores() {
        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getAssetScores(),
                "Asset scores retrieved successfully"
        ));
    }

    @Operation(summary = "Get department maintenance scores")
    @GetMapping("/departments/scores")
    public ResponseEntity<ApiResponse<List<DepartmentScoreDto>>> getDepartmentScores() {
        return ResponseEntity.ok(ApiResponse.success(
                analyticsService.getDepartmentScores(),
                "Department scores retrieved successfully"
        ));
    }
}
