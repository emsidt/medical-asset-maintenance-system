package com.medical.system.mapper;

import com.medical.system.dto.maintenance.ServiceLogDto;
import com.medical.system.dto.maintenance.ServiceLogPartDto;
import com.medical.system.dto.maintenance.ServiceRequestDto;
import com.medical.system.model.entity.ServiceLog;
import com.medical.system.model.entity.ServiceLogPart;
import com.medical.system.model.entity.ServiceRequest;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ServiceRequestMapper {
    @Mapping(target = "assetId", source = "asset.id")
    @Mapping(target = "assetName", source = "asset.name")
    @Mapping(target = "reportedByUsername", source = "reportedBy.username")
    @Mapping(target = "assignedEngineerId", source = "assignedEngineer.id")
    @Mapping(target = "assignedEngineerUsername", source = "assignedEngineer.username")
    ServiceRequestDto toDto(ServiceRequest entity);

    @Mapping(target = "engineerUsername", source = "engineer.username")
    ServiceLogDto toDto(ServiceLog entity);

    @Mapping(target = "partName", source = "inventory.partName")
    ServiceLogPartDto toDto(ServiceLogPart entity);

    List<ServiceLogDto> toLogDtoList(List<ServiceLog> entities);
}

