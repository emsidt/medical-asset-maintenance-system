package com.medical.system.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinancialSummaryDto {
    private int assetCount;
    private BigDecimal totalPurchaseValue;
    private BigDecimal totalReplacementValue;
    private BigDecimal totalPartsCost;
    private BigDecimal totalLaborCost;
    private BigDecimal totalRepairCost;
    private BigDecimal repairToPurchaseRatioPercent;
}
