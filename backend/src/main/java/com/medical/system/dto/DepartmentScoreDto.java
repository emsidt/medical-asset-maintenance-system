package com.medical.system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentScoreDto {
    private Long departmentId;
    private String departmentCode;
    private String departmentName;
    private int assetCount;
    private int brokenAssetCount;
    private int repairCount90d;
    private int repairCount365d;
    private BigDecimal avgDowntimeHours;
    private int usedPartQuantity365d;
    private int score;
    private String riskLevel;
}
