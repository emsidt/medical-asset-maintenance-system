package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.asset.AssetFinancialDto;
import com.medical.system.dto.dashboard.DepartmentFinancialDto;
import com.medical.system.dto.dashboard.FinancialSummaryDto;
import com.medical.system.dto.asset.UpdateAssetFinancialRequest;
import com.medical.system.dto.inventory.UpdateInventoryFinancialRequest;
import com.medical.system.model.entity.Asset;
import com.medical.system.model.entity.Inventory;
import com.medical.system.service.FinanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
@Tag(name = "Finance", description = "Financial reporting and cost management endpoints")
public class FinanceController {

    private final FinanceService financeService;

    @Operation(summary = "Get financial summary")
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<FinancialSummaryDto>> getSummary() {
        return ResponseEntity.ok(ApiResponse.success(financeService.getSummary(), "Financial summary retrieved successfully"));
    }

    @Operation(summary = "Get asset financial report")
    @GetMapping("/assets")
    public ResponseEntity<ApiResponse<List<AssetFinancialDto>>> getAssetFinancials() {
        return ResponseEntity.ok(ApiResponse.success(financeService.getAssetFinancials(), "Asset financials retrieved successfully"));
    }

    @Operation(summary = "Get department financial report")
    @GetMapping("/departments")
    public ResponseEntity<ApiResponse<List<DepartmentFinancialDto>>> getDepartmentFinancials() {
        return ResponseEntity.ok(ApiResponse.success(financeService.getDepartmentFinancials(), "Department financials retrieved successfully"));
    }

    @Operation(summary = "Export asset financials to Excel")
    @GetMapping("/assets/export")
    public ResponseEntity<byte[]> exportAssetFinancials() throws IOException {
        List<AssetFinancialDto> data = financeService.getAssetFinancials();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Asset Financials");
            Row headerRow = sheet.createRow(0);
            String[] columns = {"Mã thiết bị", "Tên thiết bị", "Chi phí mua", "Chi phí sửa chữa", "Tỷ lệ (%)"};
            for (int i = 0; i < columns.length; i++) {
                headerRow.createCell(i).setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (AssetFinancialDto dto : data) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(dto.getAssetCode());
                row.createCell(1).setCellValue(dto.getAssetName());
                row.createCell(2).setCellValue(dto.getPurchasePrice() != null ? dto.getPurchasePrice().doubleValue() : 0);
                row.createCell(3).setCellValue(dto.getTotalRepairCost() != null ? dto.getTotalRepairCost().doubleValue() : 0);
                row.createCell(4).setCellValue(dto.getRepairToPurchaseRatioPercent() != null ? dto.getRepairToPurchaseRatioPercent().doubleValue() : 0);
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=asset_report.xlsx")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(out.toByteArray());
        }
    }

    @Operation(summary = "Export lifecycle cost analysis to Excel")
    @GetMapping("/export-lifecycle")
    public ResponseEntity<byte[]> exportLifecycle() throws IOException {
        List<Object[]> data = financeService.getLifecycleCosts();
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Lifecycle Cost Analysis");
            Row headerRow = sheet.createRow(0);
            String[] columns = {"Mã thiết bị", "Tên thiết bị", "Giá mua mới", "Tổng chi phí sửa chữa", "Tỷ lệ (%)", "Thời gian chết (giờ)"};
            for (int i = 0; i < columns.length; i++) {
                headerRow.createCell(i).setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (Object[] row : data) {
                Row r = sheet.createRow(rowIdx++);
                r.createCell(0).setCellValue(row[0] != null ? row[0].toString() : "");
                r.createCell(1).setCellValue(row[1] != null ? row[1].toString() : "");
                
                double purchasePrice = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;
                double totalRepairCost = row[3] != null ? ((Number) row[3]).doubleValue() : 0.0;
                double ratio = 0.0;
                if (purchasePrice > 0) {
                    ratio = (totalRepairCost / purchasePrice) * 100;
                }
                
                r.createCell(2).setCellValue(purchasePrice);
                r.createCell(3).setCellValue(totalRepairCost);
                r.createCell(4).setCellValue(ratio);
                r.createCell(5).setCellValue(row[4] != null ? ((Number) row[4]).longValue() : 0L);
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=lifecycle_cost_analysis.xlsx")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(out.toByteArray());
        }
    }

    @Operation(summary = "Update asset financial fields")
    @PatchMapping("/assets/{id}")
    public ResponseEntity<ApiResponse<Asset>> updateAssetFinancials(
            @PathVariable Long id,
            @RequestBody UpdateAssetFinancialRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                financeService.updateAssetFinancials(id, request),
                "Asset financials updated successfully"
        ));
    }

    @Operation(summary = "Update inventory unit cost")
    @PatchMapping("/inventory/{id}")
    public ResponseEntity<ApiResponse<Inventory>> updateInventoryFinancials(
            @PathVariable Long id,
            @RequestBody UpdateInventoryFinancialRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                financeService.updateInventoryFinancials(id, request),
                "Inventory financials updated successfully"
        ));
    }
}
