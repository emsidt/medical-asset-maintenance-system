package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.asset.AssetDto;
import com.medical.system.dto.maintenance.ReportFailureRequest;
import com.medical.system.dto.maintenance.ServiceRequestDto;
import com.medical.system.service.MaintenanceService;
import com.medical.system.dto.maintenance.AssignDepartmentRequest;
import com.medical.system.exception.ResourceNotFoundException;
import com.medical.system.model.entity.Asset;
import com.medical.system.model.entity.Department;
import com.medical.system.repository.AssetRepository;
import com.medical.system.repository.DepartmentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import java.time.temporal.ChronoUnit;
import java.time.LocalDate;

/**
 * Controller quản lý thiết bị y tế.
 * Luôn trả về AssetDto, không trả Entity trực tiếp.
 */
@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
@Tag(name = "Asset Management", description = "Endpoints for managing medical assets")
public class AssetController {

    private final AssetRepository assetRepository;
    private final MaintenanceService maintenanceService;
    private final DepartmentRepository departmentRepository;

    @Operation(summary = "Lấy danh sách tất cả thiết bị (DTO)")
    @GetMapping
    public ResponseEntity<ApiResponse<List<AssetDto>>> getAllAssets() {
        List<AssetDto> dtos = assetRepository.findAll().stream()
                .map(a -> AssetDto.builder()
                        .id(a.getId())
                        .code(a.getCode())
                        .name(a.getName())
                        .status(a.getStatus())
                        .nextMaintenanceDate(a.getNextMaintenanceDate())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.success(dtos, "Assets retrieved successfully"));
    }

    @Operation(summary = "Thêm thiết bị mới (Admin)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AssetDto>> createAsset(@Valid @RequestBody AssetDto assetDto) {
        com.medical.system.model.entity.Asset asset = com.medical.system.model.entity.Asset.builder()
                .code(assetDto.getCode())
                .name(assetDto.getName())
                .status(assetDto.getStatus() != null ? assetDto.getStatus() : com.medical.system.model.enums.AssetStatus.AVAILABLE)
                .nextMaintenanceDate(assetDto.getNextMaintenanceDate())
                .build();
        
        com.medical.system.model.entity.Asset saved = assetRepository.save(asset);
        return ResponseEntity.ok(ApiResponse.success(mapToDto(saved), "Asset created successfully"));
    }

    @Operation(summary = "Cập nhật thông tin thiết bị (Admin)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AssetDto>> updateAsset(@PathVariable Long id, @Valid @RequestBody AssetDto assetDto) {
        com.medical.system.model.entity.Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new com.medical.system.exception.ResourceNotFoundException("Asset not found"));
        
        asset.setName(assetDto.getName());
        asset.setCode(assetDto.getCode());
        asset.setStatus(assetDto.getStatus());
        asset.setNextMaintenanceDate(assetDto.getNextMaintenanceDate());
        
        com.medical.system.model.entity.Asset updated = assetRepository.save(asset);
        return ResponseEntity.ok(ApiResponse.success(mapToDto(updated), "Asset updated successfully"));
    }

    @Operation(summary = "Xóa thiết bị (Admin)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteAsset(@PathVariable Long id) {
        assetRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Asset deleted successfully"));
    }

    @Operation(summary = "Báo hỏng thiết bị (Doctor)")
    @PostMapping("/{id}/report-failure")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    @CacheEvict(value = "dashboard_stats", allEntries = true)
    public ResponseEntity<ApiResponse<ServiceRequestDto>> reportFailure(
            @PathVariable Long id,
            @Valid @RequestBody ReportFailureRequest request) {
        ServiceRequestDto result = maintenanceService.reportFailure(id, request);
        return ResponseEntity.ok(ApiResponse.success(result, "Asset failure reported successfully"));
    }

    @Operation(summary = "Lấy danh sách các yêu cầu sửa chữa/bảo trì đang xử lý của thiết bị")
    @GetMapping("/{id}/active-requests")
    @PreAuthorize("hasAnyRole('ENGINEER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<ServiceRequestDto>>> getActiveRequests(@PathVariable Long id) {
        List<ServiceRequestDto> result = maintenanceService.getActiveServiceRequestsByAssetId(id);
        return ResponseEntity.ok(ApiResponse.success(result, "Active requests retrieved successfully"));
    }

    private AssetDto mapToDto(com.medical.system.model.entity.Asset a) {
        return AssetDto.builder()
                .id(a.getId())
                .code(a.getCode())
                .name(a.getName())
                .status(a.getStatus())
                .nextMaintenanceDate(a.getNextMaintenanceDate())
                .build();
    }

    @Operation(summary = "Assign asset to a department")
    @PatchMapping("/{id}/department")
    public ResponseEntity<ApiResponse<Asset>> assignDepartment(
            @PathVariable Long id,
            @Valid @RequestBody AssignDepartmentRequest request
    ) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found with id: " + id));
        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + request.getDepartmentId()));

        asset.setDepartment(department);
        Asset savedAsset = assetRepository.save(asset);
        return ResponseEntity.ok(ApiResponse.success(savedAsset, "Asset department assigned successfully"));
    }

    @Operation(summary = "Export asset depreciation to Excel")
    @GetMapping("/export-depreciation")
    public ResponseEntity<byte[]> exportDepreciation() throws IOException {
        List<Asset> assets = assetRepository.findAll();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Asset Depreciation");
            Row headerRow = sheet.createRow(0);
            String[] columns = {"Mã thiết bị", "Tên thiết bị", "Giá mua", "Ngày mua", "Khấu hao lũy kế", "Giá trị còn lại", "Chi phí thay thế"};
            for (int i = 0; i < columns.length; i++) {
                headerRow.createCell(i).setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (Asset a : assets) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(a.getCode() != null ? a.getCode() : "");
                row.createCell(1).setCellValue(a.getName() != null ? a.getName() : "");
                double price = a.getPurchasePrice() != null ? a.getPurchasePrice().doubleValue() : 0.0;
                row.createCell(2).setCellValue(price);
                row.createCell(3).setCellValue(a.getPurchaseDate() != null ? a.getPurchaseDate().toString() : "");
                long years = 0;
                if (a.getPurchaseDate() != null) {
                    years = ChronoUnit.YEARS.between(a.getPurchaseDate(), LocalDate.now());
                    years = Math.max(0, years);
                }
                Cell cellDepAccum = row.createCell(4);
                cellDepAccum.setCellFormula(String.format("MIN(C%d, C%d * 0.10 * %d)", rowIdx, rowIdx, years));
                
                Cell cellRemaining = row.createCell(5);
                cellRemaining.setCellFormula(String.format("C%d - E%d", rowIdx, rowIdx));
                
                row.createCell(6).setCellValue(a.getReplacementCost() != null ? a.getReplacementCost().doubleValue() : 0.0);
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=asset_depreciation.xlsx")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(out.toByteArray());
        }
    }
}

