package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.maintenance.AssignEngineerRequest;
import com.medical.system.dto.maintenance.CompleteRepairRequest;
import com.medical.system.dto.maintenance.ServiceRequestDto;
import com.medical.system.service.MaintenanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller xử lý vòng đời Service Request: xem danh sách, hoàn thành sửa chữa.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Maintenance Management", description = "Endpoints for processing repairs and service requests")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    @Operation(summary = "Lấy tất cả phiếu yêu cầu dịch vụ (Engineer/Admin)")
    @GetMapping("/service-requests")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN', 'MANAGER', 'DOCTOR', 'NURSE')")
    public ResponseEntity<ApiResponse<List<ServiceRequestDto>>> getAllServiceRequests() {
        return ResponseEntity.ok(ApiResponse.success(
                maintenanceService.getAllServiceRequests(),
                "Service requests retrieved successfully"));
    }

    @Operation(summary = "Lấy danh sách tồn kho linh kiện")
    @GetMapping("/inventory")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<List<com.medical.system.model.entity.Inventory>>> getAllInventory() {
        return ResponseEntity.ok(ApiResponse.success(
                maintenanceService.getAllInventory(),
                "Inventory retrieved successfully"));
    }

    @Operation(summary = "Thêm linh kiện mới (Admin/Manager)")
    @PostMapping("/inventory")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<com.medical.system.model.entity.Inventory>> createInventory(
            @RequestBody com.medical.system.dto.inventory.InventoryDto dto) {
        com.medical.system.model.entity.Inventory inventory = com.medical.system.model.entity.Inventory.builder()
                .partName(dto.getPartName())
                .quantity(dto.getQuantity())
                .minQuantity(dto.getMinQuantity())
                .unitPrice(dto.getUnitPrice())
                .build();
        return ResponseEntity.ok(ApiResponse.success(
                maintenanceService.saveInventory(inventory),
                "Inventory item created successfully"));
    }

    @Operation(summary = "Cập nhật linh kiện (Admin/Manager)")
    @PutMapping("/inventory/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<ApiResponse<com.medical.system.model.entity.Inventory>> updateInventory(
            @PathVariable Long id,
            @RequestBody com.medical.system.dto.inventory.InventoryDto dto) {
        return ResponseEntity.ok(ApiResponse.success(
                maintenanceService.updateInventory(id, dto),
                "Inventory item updated successfully"));
    }

    @Operation(summary = "Xóa linh kiện (Admin)")
    @DeleteMapping("/inventory/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteInventory(@PathVariable Long id) {
        maintenanceService.deleteInventory(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Inventory item deleted successfully"));
    }

    @Operation(summary = "Assign repair request to engineer (Admin)")
    @PatchMapping("/service-requests/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ServiceRequestDto>> assignEngineer(
            @PathVariable Long id,
            @jakarta.validation.Valid @RequestBody AssignEngineerRequest request) {

        ServiceRequestDto result = maintenanceService.assignEngineer(id, request);
        return ResponseEntity.ok(ApiResponse.success(result, "Repair request assigned successfully"));
    }

    @Operation(summary = "Complete assigned repair request (Engineer)")
    @PostMapping("/service-requests/{id}/complete")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ServiceRequestDto>> completeRepair(
            @PathVariable Long id,
            @RequestBody CompleteRepairRequest request) {

        ServiceRequestDto result = maintenanceService.completeRepair(id, request);
        return ResponseEntity.ok(ApiResponse.success(result, "Repair request completed successfully"));
    }

    @Operation(summary = "Bắt đầu bảo trì/sửa chữa (Engineer)")
    @PostMapping("/service-requests/{id}/start")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN')")
    public ResponseEntity<ApiResponse<ServiceRequestDto>> startMaintenance(@PathVariable Long id) {
        ServiceRequestDto result = maintenanceService.startMaintenance(id);
        return ResponseEntity.ok(ApiResponse.success(result, "Maintenance started successfully"));
    }

    @Operation(summary = "Lấy danh sách lịch bảo trì (Admin/Manager)")
    @GetMapping("/maintenance-schedules")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'ENGINEER')")
    public ResponseEntity<ApiResponse<List<com.medical.system.dto.maintenance.MaintenanceScheduleDto>>> getMaintenanceSchedules() {
        return ResponseEntity.ok(ApiResponse.success(
                maintenanceService.getAllMaintenanceSchedules(),
                "Maintenance schedules retrieved successfully"));
    }
}

