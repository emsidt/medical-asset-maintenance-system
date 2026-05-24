package com.medical.system.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.system.dto.maintenance.AssignEngineerRequest;
import com.medical.system.dto.maintenance.CompleteRepairRequest;
import com.medical.system.dto.maintenance.ReportFailureRequest;
import com.medical.system.dto.maintenance.ServiceRequestDto;
import com.medical.system.dto.maintenance.UsedPartDto;
import com.medical.system.exception.BusinessException;
import com.medical.system.exception.ResourceNotFoundException;
import com.medical.system.mapper.ServiceRequestMapper;
import com.medical.system.model.entity.*;
import com.medical.system.model.enums.AssetStatus;
import com.medical.system.model.enums.RequestStatus;
import com.medical.system.model.enums.Role;
import com.medical.system.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MaintenanceService {

    private final AssetRepository assetRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final InventoryRepository inventoryRepository;
    private final UserRepository userRepository;
    private final ServiceLogRepository serviceLogRepository;
    private final MaintenanceScheduleRepository maintenanceScheduleRepository;
    private final ServiceRequestMapper serviceRequestMapper;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Flow 1 (Doctor): Report a failure for an asset.
     */
    @Transactional
    public ServiceRequestDto reportFailure(Long assetId, ReportFailureRequest request) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found with id: " + assetId));

        if (asset.getStatus() != AssetStatus.AVAILABLE) {
            throw new BusinessException("Asset is currently " + asset.getStatus());
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User reporter = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        asset.setStatus(AssetStatus.BROKEN);
        assetRepository.save(asset);

        ServiceRequest serviceRequest = ServiceRequest.builder()
                .asset(asset)
                .reportedBy(reporter)
                .description(request.getDescription())
                .status(RequestStatus.PENDING)
                .priority(request.getPriority() != null ? request.getPriority() : com.medical.system.model.enums.RequestPriority.LOW)
                .build();

        ServiceRequestDto dto = serviceRequestMapper.toDto(serviceRequestRepository.save(serviceRequest));
        
        List<User> adminsAndManagers = userRepository.findByRoleIn(List.of(Role.ADMIN));
        for (User manager : adminsAndManagers) {
            notificationService.sendNotification(
                manager, 
                "Báo hỏng thiết bị mới", 
                "Bác sĩ " + reporter.getUsername() + " vừa báo hỏng thiết bị " + asset.getName()
            );
        }

        messagingTemplate.convertAndSend("/topic/service-requests", dto);

        return dto;
    }

    @Transactional(readOnly = true)
    public List<ServiceRequestDto> getAllServiceRequests() {
        return serviceRequestRepository.findAll().stream()
                .map(serviceRequestMapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Inventory> getAllInventory() {
        return inventoryRepository.findAll();
    }

    @Transactional
    public Inventory saveInventory(Inventory inventory) {
        return inventoryRepository.save(inventory);
    }

    @Transactional
    public Inventory updateInventory(Long id, com.medical.system.dto.inventory.InventoryDto dto) {
        Inventory item = inventoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found"));

        item.setPartName(dto.getPartName());
        item.setQuantity(dto.getQuantity());
        item.setMinQuantity(dto.getMinQuantity());
        item.setUnitPrice(dto.getUnitPrice());

        return inventoryRepository.save(item);
    }

    @Transactional
    public void deleteInventory(Long id) {
        inventoryRepository.deleteById(id);
    }

    /**
     * Flow 2: Start Maintenance/Repair (Engineer)
     */
    @Transactional
    public ServiceRequestDto startMaintenance(Long requestId) {
        ServiceRequest serviceRequest = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Service request not found"));

        if (serviceRequest.getStatus() != RequestStatus.PENDING) {
            throw new BusinessException("Request is already " + serviceRequest.getStatus());
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        if (currentUser.getRole() == com.medical.system.model.enums.Role.ENGINEER) {
            serviceRequest.setAssignedEngineer(currentUser);
        }

        serviceRequest.setStatus(RequestStatus.ASSIGNED);
        
        Asset asset = serviceRequest.getAsset();
        if (asset != null) {
            asset.setStatus(AssetStatus.UNDER_MAINTENANCE);
            assetRepository.save(asset);
        }

        ServiceRequestDto result = serviceRequestMapper.toDto(serviceRequestRepository.save(serviceRequest));
        messagingTemplate.convertAndSend("/topic/service-requests", result);
        return result;
    }

    /**
     * Flow 2b (Admin): Assign a pending repair request to an engineer.
     */
    @Transactional
    public ServiceRequestDto assignEngineer(Long requestId, AssignEngineerRequest request) {
        ServiceRequest serviceRequest = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Service request not found with id: " + requestId));

        if (serviceRequest.getStatus() == RequestStatus.COMPLETED) {
            throw new BusinessException("Completed requests cannot be reassigned");
        }

        User engineer = userRepository.findById(request.getEngineerId())
                .orElseThrow(() -> new ResourceNotFoundException("Engineer not found with id: " + request.getEngineerId()));

        if (engineer.getRole() != com.medical.system.model.enums.Role.ENGINEER) {
            throw new BusinessException("Selected user is not an engineer");
        }

        serviceRequest.setAssignedEngineer(engineer);
        serviceRequest.setStatus(RequestStatus.ASSIGNED);
        Asset asset = serviceRequest.getAsset();
        if (asset != null) {
            asset.setStatus(AssetStatus.UNDER_MAINTENANCE);
            assetRepository.save(asset);
        }

        ServiceRequestDto result = serviceRequestMapper.toDto(serviceRequestRepository.save(serviceRequest));
        
        notificationService.sendNotification(
            engineer,
            "Nhiệm vụ mới",
            "Bạn vừa được phân công sửa chữa thiết bị: " + asset.getName()
        );

        messagingTemplate.convertAndSend("/topic/service-requests", result);

        return result;
    }

    /**
     * Flow 3 (Engineer): Complete an assigned repair request.
     */
    @Transactional
    public ServiceRequestDto completeRepair(Long requestId, CompleteRepairRequest request) {

        ServiceRequest serviceRequest = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Service request not found with id: " + requestId));

        // Idempotency: If already completed, just return the current state
        if (serviceRequest.getStatus() == RequestStatus.COMPLETED) {
            return serviceRequestMapper.toDto(serviceRequest);
        }

        if (serviceRequest.getStatus() != RequestStatus.ASSIGNED) {
            throw new BusinessException("Repair request must be assigned to an engineer before completion");
        }

        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User engineer = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        if (serviceRequest.getAssignedEngineer() != null
                && !serviceRequest.getAssignedEngineer().getId().equals(engineer.getId())) {
            throw new BusinessException("Repair request is assigned to another engineer");
        }

        // Create Service Log
        ServiceLog serviceLog = ServiceLog.builder()
                .serviceRequest(serviceRequest)
                .engineer(engineer)
                .resolutionDetails(request.getResolutionDetails())
                .additionalLogData("{\"status\": \"REPAIRED\", \"completedAt\": \"" + LocalDateTime.now() + "\"}")
                .laborHours(request.getLaborHours())
                .hourlyRate(request.getHourlyRate())
                .laborCost(resolveLaborCost(request))
                .usedParts(new ArrayList<>())
                .build();

        // Process used parts
        if (request.getUsedParts() != null) {
            for (UsedPartDto partDto : request.getUsedParts()) {
                Inventory item = inventoryRepository.findById(partDto.getPartId())
                        .orElseThrow(() -> new ResourceNotFoundException("Part not found: " + partDto.getPartId()));

                if (item.getQuantity() < partDto.getQuantity()) {
                    throw new BusinessException("Insufficient stock for: " + item.getPartName() + " (Available: "
                            + item.getQuantity() + ")");
                }

                item.setQuantity(item.getQuantity() - partDto.getQuantity());
                inventoryRepository.save(item);

                if (item.getMinQuantity() != null && item.getQuantity() <= item.getMinQuantity()) {
                    System.err.println("CẢNH BÁO ĐỎ (Gửi tới Admin): Linh kiện " + item.getPartName() + " sắp hết (Còn: " + item.getQuantity() + " / Ngưỡng: " + item.getMinQuantity() + ")!");
                }

                ServiceLogPart logPart = ServiceLogPart.builder()
                        .serviceLog(serviceLog)
                        .inventory(item)
                        .quantity(partDto.getQuantity())
                        .build();
                serviceLog.getUsedParts().add(logPart);
            }
        }

        // Save log (cascades to parts)
        serviceLogRepository.save(serviceLog);

        // Update Request
        serviceRequest.setStatus(RequestStatus.COMPLETED);
        serviceRequest.setCompletedAt(LocalDateTime.now());
        // No need to manually add log to serviceRequest.logs if we rely on
        // DB/Hibernate,
        // but adding it ensures the DTO returned has the latest logs.
        serviceRequest.getLogs().add(serviceLog);

        ServiceRequest savedRequest = serviceRequestRepository.save(serviceRequest);

        // Update Asset
        Asset asset = serviceRequest.getAsset();
        if (asset != null) {
            asset.setStatus(AssetStatus.AVAILABLE);
            assetRepository.save(asset);
        }

        ServiceRequestDto dto = serviceRequestMapper.toDto(savedRequest);
        
        if (serviceRequest.getReportedBy() != null) {
            notificationService.sendNotification(
                serviceRequest.getReportedBy(),
                "Thiết bị đã được sửa xong",
                "Thiết bị " + asset.getName() + " bạn báo hỏng đã được sửa xong bởi kỹ sư " + engineer.getUsername()
            );
        }

        messagingTemplate.convertAndSend("/topic/service-requests", dto);

        return dto;
    }

    @Transactional(readOnly = true)
    public List<com.medical.system.dto.maintenance.MaintenanceScheduleDto> getAllMaintenanceSchedules() {
        return ((List<com.medical.system.model.entity.MaintenanceSchedule>) maintenanceScheduleRepository.findAll()).stream()
                .map(s -> com.medical.system.dto.maintenance.MaintenanceScheduleDto.builder()
                        .id(s.getId())
                        .assetId(s.getAsset().getId())
                        .assetName(s.getAsset().getName())
                        .assetCode(s.getAsset().getCode())
                        .scheduledDate(s.getScheduledDate())
                        .notes(s.getNotes())
                        .build())
                .toList();
    }

    private BigDecimal resolveLaborCost(CompleteRepairRequest request) {
        if (request.getLaborCost() != null) {
            return request.getLaborCost();
        }
        if (request.getLaborHours() != null && request.getHourlyRate() != null) {
            return request.getLaborHours().multiply(request.getHourlyRate());
        }
        return BigDecimal.ZERO;
    }
}
