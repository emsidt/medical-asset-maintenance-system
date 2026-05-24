package com.medical.system.service;

import com.medical.system.dto.notification.NotificationDto;
import com.medical.system.mapper.NotificationMapper;
import com.medical.system.model.entity.Notification;
import com.medical.system.model.entity.User;
import com.medical.system.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void sendNotification(User recipient, String title, String message) {
        Notification notification = Notification.builder()
                .recipient(recipient)
                .title(title)
                .message(message)
                .isRead(false)
                .build();

        notification = notificationRepository.save(notification);
        NotificationDto dto = notificationMapper.toDto(notification);

        try {
            messagingTemplate.convertAndSendToUser(
                    recipient.getUsername(),
                    "/queue/notifications",
                    dto
            );
            log.info("Sent real-time notification to user: {}", recipient.getUsername());
        } catch (Exception e) {
            log.error("Failed to send real-time notification to user: {}", recipient.getUsername(), e);
        }
    }

    @Transactional(readOnly = true)
    public Page<NotificationDto> getUserNotifications(Long userId, Pageable pageable) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable)
                .map(notificationMapper::toDto);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        if (!notification.getRecipient().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized to read this notification");
        }
        
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }
}
