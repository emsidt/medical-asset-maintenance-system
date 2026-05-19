package com.medical.system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssetFinancialDto {
    private Long assetId;
    private String assetCode;
    private String assetName;
    private Long departmentId;
    private String departmentName;
    private BigDecimal purchasePrice;
    private BigDecimal replacementCost;
    private LocalDate purchaseDate;
    private LocalDate warrantyUntil;
    private int repairCount;
    private BigDecimal partsCost;
    private BigDecimal laborCost;
    private BigDecimal totalRepairCost;
    private BigDecimal repairToPurchaseRatioPercent;
    private boolean replacementRecommended;
}
