package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.AssignEngineerRequest;
import com.medical.system.dto.CompleteRepairRequest;
import com.medical.system.dto.ReportFailureRequest;
import com.medical.system.dto.ServiceRequestDto;
import com.medical.system.service.MaintenanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Maintenance Management", description = "Endpoints for reporting failures and processing repairs")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    @Operation(summary = "Report asset failure (Doctor)")
    @PostMapping("/assets/{id}/report-failure")
    public ResponseEntity<ApiResponse<ServiceRequestDto>> reportFailure(
            @PathVariable Long id,
            @Valid @RequestBody ReportFailureRequest request) {
        
        ServiceRequestDto result = maintenanceService.reportFailure(id, request);
        return ResponseEntity.ok(ApiResponse.success(result, "Asset failure reported successfully"));
    }

    @Operation(summary = "Get all service requests")
    @GetMapping("/service-requests")
    public ResponseEntity<ApiResponse<List<ServiceRequestDto>>> getAllServiceRequests() {
        return ResponseEntity.ok(ApiResponse.success(maintenanceService.getAllServiceRequests(), "Service requests retrieved successfully"));
    }

    @Operation(summary = "Get all inventory items")
    @GetMapping("/inventory")
    public ResponseEntity<ApiResponse<List<com.medical.system.model.entity.Inventory>>> getAllInventory() {
        return ResponseEntity.ok(ApiResponse.success(maintenanceService.getAllInventory(), "Inventory retrieved successfully"));
    }

    @Operation(summary = "Assign repair request to engineer (Admin)")
    @PatchMapping("/service-requests/{id}/assign")
    public ResponseEntity<ApiResponse<ServiceRequestDto>> assignEngineer(
            @PathVariable Long id,
            @Valid @RequestBody AssignEngineerRequest request) {

        ServiceRequestDto result = maintenanceService.assignEngineer(id, request);
        return ResponseEntity.ok(ApiResponse.success(result, "Repair request assigned successfully"));
    }

    @Operation(summary = "Complete assigned repair request (Engineer)")
    @PostMapping("/service-requests/{id}/complete")
    public ResponseEntity<ApiResponse<ServiceRequestDto>> completeRepair(
            @PathVariable Long id,
            @RequestBody CompleteRepairRequest request) {

        
        ServiceRequestDto result = maintenanceService.completeRepair(id, request);
        return ResponseEntity.ok(ApiResponse.success(result, "Repair request completed successfully"));
    }
}
