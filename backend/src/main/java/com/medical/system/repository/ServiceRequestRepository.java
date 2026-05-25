package com.medical.system.repository;

import com.medical.system.model.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import com.medical.system.model.enums.RequestStatus;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {
    List<ServiceRequest> findByAssetIdAndStatusInOrderByCreatedAtDesc(Long assetId, List<RequestStatus> statuses);
}
