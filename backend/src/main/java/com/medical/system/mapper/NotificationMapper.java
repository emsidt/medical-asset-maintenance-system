package com.medical.system.mapper;

import com.medical.system.dto.notification.NotificationDto;
import com.medical.system.model.entity.Notification;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface NotificationMapper {
    @Mapping(source = "recipient.id", target = "recipientId")
    NotificationDto toDto(Notification notification);
}
