package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.asset.AssetScoreDto;
import com.medical.system.dto.dashboard.DepartmentScoreDto;
import com.medical.system.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

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

    @Operation(summary = "Export analytics scores to Excel")
    @GetMapping("/export")
    public ResponseEntity<byte[]> exportAnalytics() throws IOException {
        List<DepartmentScoreDto> deptData = analyticsService.getDepartmentScores();
        List<AssetScoreDto> assetData = analyticsService.getAssetScores();

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // Sheet 1: Department Scores
            Sheet deptSheet = workbook.createSheet("Department Scores");
            Row deptHeaderRow = deptSheet.createRow(0);
            String[] deptColumns = {
                "Mã khoa", "Tên khoa", "Số thiết bị", "Số hỏng", 
                "Số sửa chữa (90 ngày)", "Số sửa chữa (365 ngày)", 
                "Thời gian chết TB (giờ)", "Linh kiện đã dùng (365 ngày)", 
                "Điểm số", "Mức độ rủi ro"
            };
            for (int i = 0; i < deptColumns.length; i++) {
                deptHeaderRow.createCell(i).setCellValue(deptColumns[i]);
            }
            int deptRowIdx = 1;
            for (DepartmentScoreDto dto : deptData) {
                Row row = deptSheet.createRow(deptRowIdx++);
                row.createCell(0).setCellValue(dto.getDepartmentCode());
                row.createCell(1).setCellValue(dto.getDepartmentName());
                row.createCell(2).setCellValue(dto.getAssetCount());
                row.createCell(3).setCellValue(dto.getBrokenAssetCount());
                row.createCell(4).setCellValue(dto.getRepairCount90d());
                row.createCell(5).setCellValue(dto.getRepairCount365d());
                row.createCell(6).setCellValue(dto.getAvgDowntimeHours() != null ? dto.getAvgDowntimeHours().doubleValue() : 0.0);
                row.createCell(7).setCellValue(dto.getUsedPartQuantity365d());
                row.createCell(8).setCellValue(dto.getScore());
                row.createCell(9).setCellValue(dto.getRiskLevel() != null ? dto.getRiskLevel() : "LOW");
            }

            // Sheet 2: Asset Scores
            Sheet assetSheet = workbook.createSheet("Asset Scores");
            Row assetHeaderRow = assetSheet.createRow(0);
            String[] assetColumns = {
                "Mã thiết bị", "Tên thiết bị", "Trạng thái", "Khoa/Phòng", 
                "Số sửa chữa (90 ngày)", "Số sửa chữa (365 ngày)", 
                "Linh kiện đã dùng (365 ngày)", "Điểm số", "Mức độ rủi ro"
            };
            for (int i = 0; i < assetColumns.length; i++) {
                assetHeaderRow.createCell(i).setCellValue(assetColumns[i]);
            }
            int assetRowIdx = 1;
            for (AssetScoreDto dto : assetData) {
                Row row = assetSheet.createRow(assetRowIdx++);
                row.createCell(0).setCellValue(dto.getAssetCode());
                row.createCell(1).setCellValue(dto.getAssetName());
                row.createCell(2).setCellValue(dto.getAssetStatus() != null ? dto.getAssetStatus() : "");
                row.createCell(3).setCellValue(dto.getDepartmentName() != null ? dto.getDepartmentName() : "Unassigned");
                row.createCell(4).setCellValue(dto.getRepairCount90d());
                row.createCell(5).setCellValue(dto.getRepairCount365d());
                row.createCell(6).setCellValue(dto.getUsedPartQuantity365d());
                row.createCell(7).setCellValue(dto.getScore());
                row.createCell(8).setCellValue(dto.getRiskLevel() != null ? dto.getRiskLevel() : "LOW");
            }

            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=maintenance_analytics.xlsx")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(out.toByteArray());
        }
    }
}
