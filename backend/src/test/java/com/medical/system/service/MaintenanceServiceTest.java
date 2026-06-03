package com.medical.system.service;

import com.medical.system.dto.maintenance.ReportFailureRequest;
import com.medical.system.dto.maintenance.ServiceRequestDto;
import com.medical.system.model.entity.Asset;
import com.medical.system.model.entity.ServiceRequest;
import com.medical.system.model.entity.User;
import com.medical.system.model.enums.AssetStatus;
import com.medical.system.model.enums.Role;
import com.medical.system.repository.*;
import com.medical.system.mapper.ServiceRequestMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MaintenanceServiceTest {

    @Mock private AssetRepository assetRepository;
    @Mock private ServiceRequestRepository serviceRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private ServiceRequestMapper serviceRequestMapper;
    @Mock private NotificationService notificationService;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private MaintenanceService maintenanceService;

    @BeforeEach
    void setUp() {
        // Giả lập SecurityContextHolder chứa user là "doctor"
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("doctor");
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void reportFailure_shouldCreateServiceRequestAndSendNotification() {
        // Arrange
        Long assetId = 1L;
        Asset asset = new Asset();
        asset.setId(assetId);
        asset.setName("MRI Scanner");
        asset.setStatus(AssetStatus.AVAILABLE);

        User doctor = new User();
        doctor.setId(1L);
        doctor.setUsername("doctor");
        doctor.setRole(Role.DOCTOR);

        User admin = new User();
        admin.setId(2L);
        admin.setUsername("admin");
        admin.setRole(Role.ADMIN);

        ReportFailureRequest request = new ReportFailureRequest();
        request.setDescription("Máy không khởi động được");

        when(assetRepository.findById(assetId)).thenReturn(Optional.of(asset));
        when(userRepository.findByUsername("doctor")).thenReturn(Optional.of(doctor));
        when(userRepository.findByRoleIn(List.of(Role.ADMIN, Role.ENGINEER))).thenReturn(List.of(admin));
        
        ServiceRequest savedRequest = new ServiceRequest();
        when(serviceRequestRepository.save(any(ServiceRequest.class))).thenReturn(savedRequest);
        
        ServiceRequestDto expectedDto = new ServiceRequestDto();
        when(serviceRequestMapper.toDto(savedRequest)).thenReturn(expectedDto);

        // Act
        ServiceRequestDto result = maintenanceService.reportFailure(assetId, request);

        // Assert
        assertEquals(expectedDto, result);
        assertEquals(AssetStatus.BROKEN, asset.getStatus()); // Đảm bảo trạng thái thiết bị đã bị đổi thành BROKEN
        
        verify(assetRepository, times(1)).save(asset);
        verify(serviceRequestRepository, times(1)).save(any(ServiceRequest.class));
        verify(notificationService, times(1)).sendNotification(eq(admin), anyString(), anyString());
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/service-requests"), eq(expectedDto));
    }
}
