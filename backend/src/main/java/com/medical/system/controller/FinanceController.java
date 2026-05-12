package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.AssetFinancialDto;
import com.medical.system.dto.DepartmentFinancialDto;
import com.medical.system.dto.FinancialSummaryDto;
import com.medical.system.dto.UpdateAssetFinancialRequest;
import com.medical.system.dto.UpdateInventoryFinancialRequest;
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
