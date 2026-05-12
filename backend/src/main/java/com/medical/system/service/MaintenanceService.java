package com.medical.system.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.system.dto.AssignEngineerRequest;
import com.medical.system.dto.CompleteRepairRequest;
import com.medical.system.dto.ReportFailureRequest;
import com.medical.system.dto.ServiceRequestDto;
import com.medical.system.dto.UsedPartDto;
import com.medical.system.exception.BusinessException;
import com.medical.system.exception.ResourceNotFoundException;
import com.medical.system.mapper.ServiceRequestMapper;
import com.medical.system.model.entity.*;
import com.medical.system.model.enums.AssetStatus;
import com.medical.system.model.enums.RequestStatus;
import com.medical.system.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final ServiceRequestMapper serviceRequestMapper;
    private final ObjectMapper objectMapper;

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
                .build();

        return serviceRequestMapper.toDto(serviceRequestRepository.save(serviceRequest));
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

    /**
     * Flow 2 (Admin): Assign a pending repair request to an engineer.
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

        return serviceRequestMapper.toDto(serviceRequestRepository.save(serviceRequest));
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
                    throw new BusinessException("Insufficient stock for: " + item.getPartName() + " (Available: " + item.getQuantity() + ")");
                }

                item.setQuantity(item.getQuantity() - partDto.getQuantity());
                inventoryRepository.save(item);

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
        // No need to manually add log to serviceRequest.logs if we rely on DB/Hibernate, 
        // but adding it ensures the DTO returned has the latest logs.
        serviceRequest.getLogs().add(serviceLog);
        
        ServiceRequest savedRequest = serviceRequestRepository.save(serviceRequest);

        // Update Asset
        Asset asset = serviceRequest.getAsset();
        if (asset != null) {
            asset.setStatus(AssetStatus.AVAILABLE);
            assetRepository.save(asset);
        }

        return serviceRequestMapper.toDto(savedRequest);
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


