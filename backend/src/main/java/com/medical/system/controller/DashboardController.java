package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.asset.AssetDto;
import com.medical.system.dto.dashboard.DashboardStatsDto;
import com.medical.system.model.enums.AssetStatus;
import com.medical.system.repository.AssetRepository;
import com.medical.system.service.MaintenanceSchedulerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller cung cấp dữ liệu thống kê cho Dashboard (Giai đoạn 5).
 * Chỉ ADMIN và MANAGER mới được truy cập.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Thống kê và báo cáo cho Manager")
public class DashboardController {

    private final MaintenanceSchedulerService schedulerService;
    private final AssetRepository assetRepository;

    /**
     * Trả về tổng hợp: số lượng thiết bị theo trạng thái + danh sách linh kiện tồn kho thấp.
     */
    @Operation(summary = "Lấy thống kê tổng hợp cho Dashboard (MANAGER/ADMIN)")
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ApiResponse<DashboardStatsDto>> getDashboardStats() {
        DashboardStatsDto stats = schedulerService.getDashboardStats();
        return ResponseEntity.ok(ApiResponse.success(stats, "Dashboard statistics retrieved successfully"));
    }

    /**
     * API tiện ích: danh sách tất cả assets dưới dạng DTO (không expose Entity).
     */
    @Operation(summary = "Lấy danh sách thiết bị (DTO, không expose Entity)")
    @GetMapping("/assets")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
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
}
