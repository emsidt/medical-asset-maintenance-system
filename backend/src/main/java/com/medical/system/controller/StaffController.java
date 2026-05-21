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

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@Tag(name = "Staff Management", description = "Endpoints for managing hospital personnel")
public class StaffController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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
}
