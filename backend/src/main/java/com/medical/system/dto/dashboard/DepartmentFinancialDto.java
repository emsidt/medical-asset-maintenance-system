package com.medical.system.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentFinancialDto {
    private Long departmentId;
    private String departmentCode;
    private String departmentName;
    private int assetCount;
    private BigDecimal purchaseValue;
    private BigDecimal replacementValue;
    private int repairCount;
    private BigDecimal partsCost;
    private BigDecimal laborCost;
    private BigDecimal totalRepairCost;
    private BigDecimal repairToPurchaseRatioPercent;
}
