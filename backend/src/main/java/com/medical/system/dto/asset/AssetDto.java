package com.medical.system.dto.asset;

import com.medical.system.model.enums.AssetStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO đại diện cho một thiết bị y tế, tránh expose Entity trực tiếp ra Controller.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetDto {
    private Long id;
    private String code;
    private String name;
    private AssetStatus status;
    private LocalDate nextMaintenanceDate;
}
