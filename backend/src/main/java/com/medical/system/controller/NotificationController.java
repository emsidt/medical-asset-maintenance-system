package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.notification.NotificationDto;
import com.medical.system.model.entity.User;
import com.medical.system.repository.UserRepository;
import com.medical.system.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    @GetMapping
    public ApiResponse<Page<NotificationDto>> getUserNotifications(
            Principal principal,
            Pageable pageable) {
        User currentUser = userRepository.findByUsername(principal.getName()).orElseThrow();
        return ApiResponse.success(
                notificationService.getUserNotifications(currentUser.getId(), pageable),
                "Lấy danh sách thông báo thành công"
        );
    }

    @GetMapping("/unread-count")
    public ApiResponse<Long> getUnreadCount(Principal principal) {
        User currentUser = userRepository.findByUsername(principal.getName()).orElseThrow();
        return ApiResponse.success(
                notificationService.getUnreadCount(currentUser.getId()),
                "Lấy số lượng thông báo chưa đọc thành công"
        );
    }

    @PutMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(
            @PathVariable Long id,
            Principal principal) {
        User currentUser = userRepository.findByUsername(principal.getName()).orElseThrow();
        notificationService.markAsRead(id, currentUser.getId());
        return ApiResponse.success(null, "Đánh dấu đã đọc thành công");
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> markAllAsRead(Principal principal) {
        User currentUser = userRepository.findByUsername(principal.getName()).orElseThrow();
        notificationService.markAllAsRead(currentUser.getId());
        return ApiResponse.success(null, "Đánh dấu tất cả đã đọc thành công");
    }
}
