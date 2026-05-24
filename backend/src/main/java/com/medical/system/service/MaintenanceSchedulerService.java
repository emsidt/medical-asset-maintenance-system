package com.medical.system.service;

import com.medical.system.dto.asset.AssetStatisticsDto;
import com.medical.system.dto.dashboard.DashboardStatsDto;
import com.medical.system.dto.inventory.LowStockAlertDto;
import com.medical.system.model.entity.Asset;
import com.medical.system.model.entity.MaintenanceSchedule;
import com.medical.system.model.entity.ServiceRequest;
import com.medical.system.model.entity.User;
import com.medical.system.model.enums.AssetStatus;
import com.medical.system.model.enums.RequestStatus;
import com.medical.system.model.enums.Role;
import com.medical.system.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service xử lý các tác vụ tự động (Cron Job) và tổng hợp dữ liệu thống kê cho Dashboard.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MaintenanceSchedulerService {

    // Ngưỡng cảnh báo tồn kho thấp: <= 10 đơn vị
    private static final int LOW_STOCK_THRESHOLD = 10;

    private final AssetRepository assetRepository;
    private final InventoryRepository inventoryRepository;
    private final MaintenanceScheduleRepository maintenanceScheduleRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final UserRepository userRepository;
    private final com.medical.system.mapper.ServiceRequestMapper serviceRequestMapper;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;
    private final NotificationService notificationService;

    /**
     * Cron Job chạy lúc 00:00 mỗi ngày.
     * Quét toàn bộ Asset có nextMaintenanceDate <= ngày hôm nay,
     * tự động tạo MaintenanceSchedule mới cho các asset đó.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void generateMaintenanceSchedules() {
        log.info("=== [CRON] Bắt đầu quét lịch bảo trì - {}", LocalDate.now());

        List<Asset> assetsToSchedule = assetRepository.findByNextMaintenanceDateLessThanEqual(LocalDate.now());

        if (assetsToSchedule.isEmpty()) {
            log.info("[CRON] Không có thiết bị nào đến hạn bảo trì hôm nay.");
            return;
        }

        for (Asset asset : assetsToSchedule) {
            MaintenanceSchedule schedule = MaintenanceSchedule.builder()
                    .asset(asset)
                    .scheduledDate(LocalDate.now())
                    .notes("Lịch bảo trì tự động được tạo bởi hệ thống cho thiết bị: " + asset.getName())
                    .build();

            maintenanceScheduleRepository.save(schedule);

            // Tự động tạo Phiếu yêu cầu bảo trì (Service Request)
            User admin = userRepository.findByUsername("admin").orElse(null);
            ServiceRequest serviceRequest = ServiceRequest.builder()
                    .asset(asset)
                    .description("Bảo trì định kỳ hệ thống: " + asset.getName())
                    .status(RequestStatus.PENDING)
                    .reportedBy(admin)
                    .build();
            ServiceRequest savedRequest = serviceRequestRepository.save(serviceRequest);
            List<User> adminsAndManagers = userRepository.findByRoleIn(List.of(Role.ADMIN));
            for (User manager : adminsAndManagers) {
                notificationService.sendNotification(
                    manager,
                    "Lịch bảo trì định kỳ mới",
                    "Hệ thống vừa tự động tạo yêu cầu bảo trì cho thiết bị: " + asset.getName()
                );
            }

            // Cập nhật trạng thái sang MAINTENANCE_DUE để thông báo
            asset.setStatus(AssetStatus.MAINTENANCE_DUE);
            // Cập nhật lịch bảo trì tiếp theo sang 90 ngày sau (chu kỳ bảo trì định kỳ)
            asset.setNextMaintenanceDate(LocalDate.now().plusDays(90));
            assetRepository.save(asset);

            log.info("[CRON] Đã tạo lịch bảo trì cho: {} (ID: {})", asset.getName(), asset.getId());
        }

        log.info("=== [CRON] Hoàn thành. Đã tạo {} lịch bảo trì.", assetsToSchedule.size());
    }

    /**
     * Trả về tổng hợp thống kê cho Dashboard Manager:
     * - Số lượng thiết bị theo từng trạng thái (dữ liệu Pie Chart)
     * - Danh sách linh kiện sắp hết hàng (Low Stock Alerts)
     */
    @Transactional(readOnly = true)
    public DashboardStatsDto getDashboardStats() {

        // --- Thống kê Asset theo trạng thái ---
        long available = assetRepository.countByStatus(AssetStatus.AVAILABLE);
        long broken = assetRepository.countByStatus(AssetStatus.BROKEN);
        long underMaintenance = assetRepository.countByStatus(AssetStatus.UNDER_MAINTENANCE);
        long maintenanceDue = assetRepository.countByStatus(AssetStatus.MAINTENANCE_DUE);

        AssetStatisticsDto assetStats = AssetStatisticsDto.builder()
                .available(available)
                .broken(broken)
                .underMaintenance(underMaintenance)
                .maintenanceDue(maintenanceDue)
                .total(available + broken + underMaintenance + maintenanceDue)
                .build();

        // --- Cảnh báo tồn kho thấp ---
        List<LowStockAlertDto> lowStockAlerts = inventoryRepository
                .findItemsWithLowStock()
                .stream()
                .map(item -> LowStockAlertDto.builder()
                        .id(item.getId())
                        .partName(item.getPartName())
                        .quantity(item.getQuantity())
                        .threshold(item.getMinQuantity() != null ? item.getMinQuantity() : 0)
                        .build())
                .collect(Collectors.toList());

        return DashboardStatsDto.builder()
                .assetStats(assetStats)
                .lowStockAlerts(lowStockAlerts)
                .build();
    }
}
