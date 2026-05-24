package com.medical.system.controller;

import com.medical.system.dto.ApiResponse;
import com.medical.system.dto.notification.NotificationDto;
import com.medical.system.model.entity.User;
import com.medical.system.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<Page<NotificationDto>> getUserNotifications(
            @AuthenticationPrincipal User currentUser,
            Pageable pageable) {
        return ApiResponse.success(
                notificationService.getUserNotifications(currentUser.getId(), pageable),
                "Lấy danh sách thông báo thành công"
        );
    }

    @GetMapping("/unread-count")
    public ApiResponse<Long> getUnreadCount(@AuthenticationPrincipal User currentUser) {
        return ApiResponse.success(
                notificationService.getUnreadCount(currentUser.getId()),
                "Lấy số lượng thông báo chưa đọc thành công"
        );
    }

    @PutMapping("/{id}/read")
    public ApiResponse<Void> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        notificationService.markAsRead(id, currentUser.getId());
        return ApiResponse.success(null, "Đánh dấu đã đọc thành công");
    }

    @PutMapping("/read-all")
    public ApiResponse<Void> markAllAsRead(@AuthenticationPrincipal User currentUser) {
        notificationService.markAllAsRead(currentUser.getId());
        return ApiResponse.success(null, "Đánh dấu tất cả đã đọc thành công");
    }
}
