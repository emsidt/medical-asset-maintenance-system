package com.medical.system.service;

import com.medical.system.dto.dashboard.DashboardStatsDto;
import com.medical.system.model.entity.Asset;
import com.medical.system.model.entity.Inventory;
import com.medical.system.model.entity.User;
import com.medical.system.model.enums.AssetStatus;
import com.medical.system.model.enums.Role;
import com.medical.system.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MaintenanceSchedulerServiceTest {

    @Mock private AssetRepository assetRepository;
    @Mock private InventoryRepository inventoryRepository;
    @Mock private MaintenanceScheduleRepository maintenanceScheduleRepository;
    @Mock private ServiceRequestRepository serviceRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private com.medical.system.mapper.ServiceRequestMapper serviceRequestMapper;
    @Mock private com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private MaintenanceSchedulerService schedulerService;

    @Test
    void generateMaintenanceSchedules_shouldCreateSchedules_whenAssetsAreDue() {
        // Arrange
        Asset asset = new Asset();
        asset.setId(1L);
        asset.setName("X-Ray Machine");
        asset.setStatus(AssetStatus.AVAILABLE);

        User admin = new User();
        admin.setId(1L);
        admin.setUsername("admin");
        admin.setRole(Role.ADMIN);

        when(assetRepository.findByNextMaintenanceDateLessThanEqual(any(LocalDate.class)))
                .thenReturn(List.of(asset));
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(admin));
        when(userRepository.findByRoleIn(List.of(Role.ADMIN))).thenReturn(List.of(admin));

        // Act
        schedulerService.generateMaintenanceSchedules();

        // Assert
        verify(maintenanceScheduleRepository, times(1)).save(any());
        verify(serviceRequestRepository, times(1)).save(any());
        verify(notificationService, times(1)).sendNotification(eq(admin), anyString(), anyString());
        verify(assetRepository, times(1)).save(asset);

        assertEquals(AssetStatus.MAINTENANCE_DUE, asset.getStatus());
        assertNotNull(asset.getNextMaintenanceDate());
    }

    @Test
    void getDashboardStats_shouldReturnCorrectStats() {
        // Arrange
        when(assetRepository.countByStatus(AssetStatus.AVAILABLE)).thenReturn(10L);
        when(assetRepository.countByStatus(AssetStatus.BROKEN)).thenReturn(2L);
        when(assetRepository.countByStatus(AssetStatus.UNDER_MAINTENANCE)).thenReturn(3L);
        when(assetRepository.countByStatus(AssetStatus.MAINTENANCE_DUE)).thenReturn(1L);

        Inventory lowStockItem = new Inventory();
        lowStockItem.setId(1L);
        lowStockItem.setPartName("Filter");
        lowStockItem.setQuantity(5);
        lowStockItem.setMinQuantity(10);
        
        when(inventoryRepository.findItemsWithLowStock()).thenReturn(List.of(lowStockItem));

        // Act
        DashboardStatsDto stats = schedulerService.getDashboardStats();

        // Assert
        assertNotNull(stats);
        assertEquals(10L, stats.getAssetStats().getAvailable());
        assertEquals(2L, stats.getAssetStats().getBroken());
        assertEquals(16L, stats.getAssetStats().getTotal());
        
        assertEquals(1, stats.getLowStockAlerts().size());
        assertEquals("Filter", stats.getLowStockAlerts().get(0).getPartName());
    }
}
