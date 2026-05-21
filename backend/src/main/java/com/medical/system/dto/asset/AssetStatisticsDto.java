package com.medical.system.dto.asset;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO trả về thống kê số lượng thiết bị theo từng trạng thái.
 * Dùng cho Pie Chart trên Dashboard Manager.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetStatisticsDto {
    private long available;
    private long broken;
    private long underMaintenance;
    private long maintenanceDue;
    private long total;
}
