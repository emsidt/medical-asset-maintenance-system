package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.auth.UserDto;
import com.medical.system.model.entity.User;
import com.medical.system.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpHeaders;
import com.medical.system.repository.ServiceRequestRepository;
import com.medical.system.model.entity.ServiceRequest;
import com.medical.system.model.enums.Role;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@Tag(name = "Staff Management", description = "Endpoints for managing hospital personnel")
public class StaffController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ServiceRequestRepository serviceRequestRepository;

    @Operation(summary = "Lấy danh sách nhân viên (Admin)")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllStaff() {
        List<UserDto> dtos = userRepository.findAll().stream()
                .map(u -> UserDto.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .role(u.getRole())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.success(dtos, "Staff list retrieved successfully"));
    }

    @Operation(summary = "Thêm nhân viên mới (Admin)")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> createStaff(@RequestBody UserDto dto) {
        User user = User.builder()
                .username(dto.getUsername())
                .password(passwordEncoder.encode(dto.getPassword()))
                .role(dto.getRole())
                .build();
        User saved = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(
                UserDto.builder().id(saved.getId()).username(saved.getUsername()).role(saved.getRole()).build(),
                "Staff member created successfully"));
    }

    @Operation(summary = "Cập nhật nhân viên (Admin)")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserDto>> updateStaff(@PathVariable Long id, @RequestBody UserDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Staff member not found"));

        user.setUsername(dto.getUsername());
        user.setRole(dto.getRole());
        
        if (dto.getPassword() != null && !dto.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(dto.getPassword()));
        }

        User updated = userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(
                UserDto.builder().id(updated.getId()).username(updated.getUsername()).role(updated.getRole()).build(),
                "Staff member updated successfully"));
    }

    @Operation(summary = "Xóa nhân viên (Admin)")

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteStaff(@PathVariable Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Staff member deleted successfully"));
    }

    @Operation(summary = "Export staff performance to Excel")
    @GetMapping("/export-performance")
    public ResponseEntity<byte[]> exportPerformance() throws IOException {
        List<User> engineers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ENGINEER)
                .toList();
        List<ServiceRequest> requests = serviceRequestRepository.findAll();
        
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Staff Performance");
            Row headerRow = sheet.createRow(0);
            String[] columns = {"Kỹ sư", "Tổng số ca được giao", "Số ca hoàn thành", "Thời gian sửa TB (giờ)", "Số ca vi phạm SLA (>24h)"};
            for (int i = 0; i < columns.length; i++) {
                headerRow.createCell(i).setCellValue(columns[i]);
            }
            int rowIdx = 1;
            for (User eng : engineers) {
                List<ServiceRequest> engReqs = requests.stream()
                        .filter(r -> r.getAssignedEngineer() != null && r.getAssignedEngineer().getId().equals(eng.getId()))
                        .toList();
                List<ServiceRequest> completedReqs = engReqs.stream()
                        .filter(r -> r.getStatus() == com.medical.system.model.enums.RequestStatus.COMPLETED && r.getCreatedAt() != null && r.getCompletedAt() != null)
                        .toList();
                
                long totalAssigned = engReqs.size();
                long totalCompleted = completedReqs.size();
                
                double avgRepairHours = 0.0;
                long slaBreaches = 0;
                if (totalCompleted > 0) {
                    long totalHours = 0;
                    for (ServiceRequest r : completedReqs) {
                        long hours = java.time.Duration.between(r.getCreatedAt(), r.getCompletedAt()).toHours();
                        totalHours += hours;
                        if (hours > 24) {
                            slaBreaches++;
                        }
                    }
                    avgRepairHours = (double) totalHours / totalCompleted;
                }
                
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(eng.getUsername());
                row.createCell(1).setCellValue(totalAssigned);
                row.createCell(2).setCellValue(totalCompleted);
                row.createCell(3).setCellValue(avgRepairHours);
                row.createCell(4).setCellValue(slaBreaches);
            }
            workbook.write(out);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=staff_performance.xlsx")
                    .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    .body(out.toByteArray());
        }
    }
}
