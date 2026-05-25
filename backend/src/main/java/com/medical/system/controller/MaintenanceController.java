package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.maintenance.AssignEngineerRequest;
import com.medical.system.dto.maintenance.CompleteRepairRequest;
import com.medical.system.dto.maintenance.ServiceRequestDto;
import com.medical.system.service.MaintenanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import com.medical.system.repository.ServiceRequestRepository;
import com.medical.system.dto.maintenance.MaintenanceScheduleDto;

/**
 * Controller xử lý vòng đời Service Request: xem danh sách, hoàn thành sửa chữa.
 */
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Maintenance Management", description = "Endpoints for processing repairs and service requests")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;
    private final ServiceRequestRepository serviceRequestRepository;

    @Operation(summary = "Lấy tất cả phiếu yêu cầu dịch vụ (Engineer/Admin)")
    @GetMapping("/service-requests")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN', 'DOCTOR')")
    public ResponseEntity<ApiResponse<List<ServiceRequestDto>>> getAllServiceRequests() {
        return ResponseEntity.ok(ApiResponse.success(
                maintenanceService.getAllServiceRequests(),
                "Service requests retrieved successfully"));
    }

    @Operation(summary = "Lấy danh sách tồn kho linh kiện")
    @GetMapping("/inventory")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<com.medical.system.model.entity.Inventory>>> getAllInventory() {
        return ResponseEntity.ok(ApiResponse.success(
                maintenanceService.getAllInventory(),
                "Inventory retrieved successfully"));
    }

    @Operation(summary = "Thêm linh kiện mới (Admin)")
    @PostMapping("/inventory")
    @PreAuthorize("hasRole('ADMIN')")
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

    @Operation(summary = "Cập nhật linh kiện (Admin)")
    @PutMapping("/inventory/{id}")
    @PreAuthorize("hasRole('ADMIN')")
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
    @PreAuthorize("hasRole('ENGINEER')")
    public ResponseEntity<ApiResponse<ServiceRequestDto>> completeRepair(
            @PathVariable Long id,
            @RequestBody CompleteRepairRequest request) {

        ServiceRequestDto result = maintenanceService.completeRepair(id, request);
        return ResponseEntity.ok(ApiResponse.success(result, "Repair request completed successfully"));
    }

    @Operation(summary = "Bắt đầu bảo trì/sửa chữa (Engineer)")
    @PostMapping("/service-requests/{id}/start")
    @PreAuthorize("hasRole('ENGINEER')")
    public ResponseEntity<ApiResponse<ServiceRequestDto>> startMaintenance(@PathVariable Long id) {
        ServiceRequestDto result = maintenanceService.startMaintenance(id);
        return ResponseEntity.ok(ApiResponse.success(result, "Maintenance started successfully"));
    }

    @Operation(summary = "Lấy danh sách lịch bảo trì (Admin)")
    @GetMapping("/maintenance-schedules")
    @PreAuthorize("hasAnyRole('ADMIN', 'ENGINEER')")
    public ResponseEntity<ApiResponse<List<MaintenanceScheduleDto>>> getMaintenanceSchedules() {
        return ResponseEntity.ok(ApiResponse.success(
                maintenanceService.getAllMaintenanceSchedules(),
                "Maintenance schedules retrieved successfully"));
    }

    @Operation(summary = "Export all service requests to Excel")
    @GetMapping("/service-requests/export")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN', 'DOCTOR')")
    public ResponseEntity<byte[]> exportServiceRequests() throws IOException {
        List<ServiceRequestDto> data = maintenanceService.getAllServiceRequests();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Repair Requests");
            Row headerRow = sheet.createRow(0);
            String[] columns = {
                "ID", "Tên thiết bị", "Người báo hỏng", 
                "Kỹ sư phân công", "Mô tả sự cố", "Trạng thái", 
                "Thời gian tạo", "Thời gian hoàn thành"
            };
            for (int i = 0; i < columns.length; i++) {
                headerRow.createCell(i).setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (ServiceRequestDto dto : data) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(dto.getId() != null ? dto.getId() : 0L);
                row.createCell(1).setCellValue(dto.getAssetName() != null ? dto.getAssetName() : "");
                row.createCell(2).setCellValue(dto.getReportedByUsername() != null ? dto.getReportedByUsername() : "");
                row.createCell(3).setCellValue(dto.getAssignedEngineerUsername() != null ? dto.getAssignedEngineerUsername() : "Unassigned");
                row.createCell(4).setCellValue(dto.getDescription() != null ? dto.getDescription() : "");
                row.createCell(5).setCellValue(dto.getStatus() != null ? dto.getStatus().name() : "");
                row.createCell(6).setCellValue(dto.getCreatedAt() != null ? dto.getCreatedAt().toString() : "");
                row.createCell(7).setCellValue(dto.getCompletedAt() != null ? dto.getCompletedAt().toString() : "");
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=service_requests_report.xlsx")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(out.toByteArray());
        }
    }

    @Operation(summary = "Export inventory to Excel")
    @GetMapping("/inventory/export")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN')")
    public ResponseEntity<byte[]> exportInventory() throws IOException {
        List<com.medical.system.model.entity.Inventory> data = maintenanceService.getAllInventory();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Inventory Status");
            Row headerRow = sheet.createRow(0);
            String[] columns = {
                "ID", "Tên linh kiện", "Số lượng", 
                "Số lượng tối thiểu", "Đơn giá", "Đơn giá mua (Unit Cost)", 
                "Cảnh báo tồn kho"
            };
            for (int i = 0; i < columns.length; i++) {
                headerRow.createCell(i).setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (com.medical.system.model.entity.Inventory item : data) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(item.getId() != null ? item.getId() : 0L);
                row.createCell(1).setCellValue(item.getPartName() != null ? item.getPartName() : "");
                row.createCell(2).setCellValue(item.getQuantity() != null ? item.getQuantity() : 0);
                row.createCell(3).setCellValue(item.getMinQuantity() != null ? item.getMinQuantity() : 0);
                row.createCell(4).setCellValue(item.getUnitPrice() != null ? item.getUnitPrice() : 0.0);
                row.createCell(5).setCellValue(item.getUnitCost() != null ? item.getUnitCost().doubleValue() : 0.0);
                boolean lowStock = item.getMinQuantity() != null && item.getQuantity() != null && item.getQuantity() <= item.getMinQuantity();
                row.createCell(6).setCellValue(lowStock ? "CẢNH BÁO: Sắp hết hàng" : "Bình thường");
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=inventory_report.xlsx")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(out.toByteArray());
        }
    }

    @Operation(summary = "Export all maintenance schedules to Excel")
    @GetMapping("/maintenance-schedules/export")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN')")
    public ResponseEntity<byte[]> exportMaintenanceSchedules() throws IOException {
        List<MaintenanceScheduleDto> data = maintenanceService.getAllMaintenanceSchedules();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Maintenance Schedules");
            Row headerRow = sheet.createRow(0);
            String[] columns = {"ID", "Mã thiết bị", "Tên thiết bị", "Ngày bảo trì dự kiến", "Ghi chú"};
            for (int i = 0; i < columns.length; i++) {
                headerRow.createCell(i).setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (MaintenanceScheduleDto dto : data) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(dto.getId() != null ? dto.getId() : 0L);
                row.createCell(1).setCellValue(dto.getAssetCode() != null ? dto.getAssetCode() : "");
                row.createCell(2).setCellValue(dto.getAssetName() != null ? dto.getAssetName() : "");
                row.createCell(3).setCellValue(dto.getScheduledDate() != null ? dto.getScheduledDate().toString() : "");
                row.createCell(4).setCellValue(dto.getNotes() != null ? dto.getNotes() : "");
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=maintenance_schedules.xlsx")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(out.toByteArray());
        }
    }

    @Operation(summary = "Export critical incident log to Excel")
    @GetMapping("/service-requests/export-critical")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN')")
    public ResponseEntity<byte[]> exportCriticalIncidents() throws IOException {
        List<ServiceRequestDto> data = maintenanceService.getAllServiceRequests().stream()
                .filter(r -> r.getDescription() != null && 
                             (r.getDescription().toLowerCase().contains("khẩn") || 
                              r.getDescription().toLowerCase().contains("cấp cứu") || 
                              r.getDescription().toLowerCase().contains("gấp") || 
                              r.getDescription().toLowerCase().contains("critical") ||
                              (r.getCreatedAt() != null && r.getCompletedAt() != null && 
                               java.time.Duration.between(r.getCreatedAt(), r.getCompletedAt()).toHours() > 24)))
                .toList();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Critical Incidents");
            Row headerRow = sheet.createRow(0);
            String[] columns = {"ID", "Thiết bị", "Người báo hỏng", "Kỹ sư", "Mô tả sự cố", "Thời gian tạo", "Thời gian hoàn thành", "Thời gian xử lý (giờ)"};
            for (int i = 0; i < columns.length; i++) {
                headerRow.createCell(i).setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (ServiceRequestDto dto : data) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(dto.getId() != null ? dto.getId() : 0L);
                row.createCell(1).setCellValue(dto.getAssetName() != null ? dto.getAssetName() : "");
                row.createCell(2).setCellValue(dto.getReportedByUsername() != null ? dto.getReportedByUsername() : "");
                row.createCell(3).setCellValue(dto.getAssignedEngineerUsername() != null ? dto.getAssignedEngineerUsername() : "Unassigned");
                row.createCell(4).setCellValue(dto.getDescription() != null ? dto.getDescription() : "");
                row.createCell(5).setCellValue(dto.getCreatedAt() != null ? dto.getCreatedAt().toString() : "");
                row.createCell(6).setCellValue(dto.getCompletedAt() != null ? dto.getCompletedAt().toString() : "");
                long hours = 0;
                if (dto.getCreatedAt() != null && dto.getCompletedAt() != null) {
                    hours = java.time.Duration.between(dto.getCreatedAt(), dto.getCompletedAt()).toHours();
                }
                row.createCell(7).setCellValue(hours);
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=critical_incidents.xlsx")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(out.toByteArray());
        }
    }

    @Operation(summary = "Export handover protocol to printable Excel")
    @GetMapping("/service-requests/{id}/export-protocol")
    public ResponseEntity<byte[]> exportProtocol(@PathVariable Long id) throws IOException {
        com.medical.system.model.entity.ServiceRequest req = serviceRequestRepository.findById(id)
                .orElseThrow(() -> new com.medical.system.exception.ResourceNotFoundException("Service request not found"));
        
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Handover Protocol");
            sheet.setDisplayGridlines(true);
            
            Row r0 = sheet.createRow(0);
            r0.createCell(0).setCellValue("BIÊN BẢN BÀN GIAO VÀ NGHIỆM THU THIẾT BỊ Y TẾ");
            
            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue("Mã phiếu: " + req.getId());
            r2.createCell(3).setCellValue("Ngày hoàn thành: " + (req.getCompletedAt() != null ? req.getCompletedAt().toString() : "Chưa hoàn thành"));
            
            Row r3 = sheet.createRow(3);
            r3.createCell(0).setCellValue("Thiết bị: " + (req.getAsset() != null ? req.getAsset().getName() : ""));
            r3.createCell(3).setCellValue("Mã thiết bị: " + (req.getAsset() != null ? req.getAsset().getCode() : ""));
            
            Row r4 = sheet.createRow(4);
            r4.createCell(0).setCellValue("Khoa phòng: " + (req.getAsset() != null && req.getAsset().getDepartment() != null ? req.getAsset().getDepartment().getName() : "Chưa phân khoa"));
            
            Row r5 = sheet.createRow(5);
            r5.createCell(0).setCellValue("Người báo hỏng: " + (req.getReportedBy() != null ? req.getReportedBy().getUsername() : ""));
            r5.createCell(3).setCellValue("Kỹ sư sửa chữa: " + (req.getAssignedEngineer() != null ? req.getAssignedEngineer().getUsername() : "Unassigned"));
            
            Row r6 = sheet.createRow(6);
            r6.createCell(0).setCellValue("Mô tả lỗi: " + req.getDescription());
            
            Row r8 = sheet.createRow(8);
            r8.createCell(0).setCellValue("CHI TIẾT KHẮC PHỤC");
            
            int currentRow = 9;
            StringBuilder resolution = new StringBuilder();
            if (req.getLogs() != null) {
                for (com.medical.system.model.entity.ServiceLog log : req.getLogs()) {
                    if (log.getResolutionDetails() != null) {
                        resolution.append(log.getResolutionDetails()).append("; ");
                    }
                }
            }
            Row r9 = sheet.createRow(currentRow++);
            r9.createCell(0).setCellValue("Giải pháp: " + resolution.toString());
            
            Row r10 = sheet.createRow(currentRow++);
            r10.createCell(0).setCellValue("Linh kiện thay thế:");
            r10.createCell(1).setCellValue("Số lượng");
            
            if (req.getLogs() != null) {
                for (com.medical.system.model.entity.ServiceLog log : req.getLogs()) {
                    if (log.getUsedParts() != null) {
                        for (com.medical.system.model.entity.ServiceLogPart part : log.getUsedParts()) {
                            Row partRow = sheet.createRow(currentRow++);
                            partRow.createCell(0).setCellValue(part.getInventory() != null ? part.getInventory().getPartName() : "");
                            partRow.createCell(1).setCellValue(part.getQuantity() != null ? part.getQuantity() : 0);
                        }
                    }
                }
            }
            
            currentRow += 2;
            Row sigHeader = sheet.createRow(currentRow++);
            sigHeader.createCell(0).setCellValue("KỸ SƯ SỬA CHỮA");
            sigHeader.createCell(3).setCellValue("ĐẠI DIỆN KHOA/PHÒNG");
            
            Row sigSub = sheet.createRow(currentRow++);
            sigSub.createCell(0).setCellValue("(Ký và ghi rõ họ tên)");
            sigSub.createCell(3).setCellValue("(Ký và ghi rõ họ tên)");
            
            currentRow += 3;
            Row sigLine = sheet.createRow(currentRow++);
            sigLine.createCell(0).setCellValue(".............................");
            sigLine.createCell(3).setCellValue(".............................");
            
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=handover_protocol_" + id + ".xlsx")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(out.toByteArray());
        }
    }
}

