package com.medical.system.dto.maintenance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaintenanceScheduleDto {
    private Long id;
    private Long assetId;
    private String assetName;
    private String assetCode;
    private LocalDate scheduledDate;
    private String notes;
}
