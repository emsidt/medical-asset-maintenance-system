package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.AssignDepartmentRequest;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Controller for asset inventory management.
 */
@RestController
@RequestMapping("/api/assets")
@RequiredArgsConstructor
@Tag(name = "Asset Management", description = "Endpoints for managing medical assets")
public class AssetController {

    private final AssetRepository assetRepository;
    private final DepartmentRepository departmentRepository;

    @Operation(summary = "Get all assets")
    @GetMapping
    public ResponseEntity<ApiResponse<List<Asset>>> getAllAssets() {
        List<Asset> assets = assetRepository.findAll();
        return ResponseEntity.ok(ApiResponse.success(assets, "Assets retrieved successfully"));
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
}
