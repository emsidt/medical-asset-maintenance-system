package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.model.entity.Department;
import com.medical.system.repository.DepartmentRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.concurrent.TimeUnit;
import org.springframework.http.CacheControl;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
@Tag(name = "Department Management", description = "Endpoints for hospital departments")
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    @Operation(summary = "Get all departments")
    @GetMapping
    public ResponseEntity<ApiResponse<List<Department>>> getAllDepartments() {
        List<Department> departments = departmentRepository.findAll();
        CacheControl cacheControl = CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic();
        return ResponseEntity.ok()
                .cacheControl(cacheControl)
                .body(ApiResponse.success(departments, "Departments retrieved successfully"));
    }
}
