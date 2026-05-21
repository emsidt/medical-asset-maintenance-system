package com.medical.system.dto.asset;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssetScoreDto {
    private Long assetId;
    private String assetCode;
    private String assetName;
    private String assetStatus;
    private Long departmentId;
    private String departmentName;
    private int repairCount90d;
    private int repairCount365d;
    private BigDecimal avgDowntimeHours;
    private int usedPartQuantity365d;
    private int score;
    private String riskLevel;
}
