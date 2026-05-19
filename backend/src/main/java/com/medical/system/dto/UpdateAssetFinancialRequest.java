package com.medical.system.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateAssetFinancialRequest {
    private BigDecimal purchasePrice;
    private BigDecimal replacementCost;
    private LocalDate purchaseDate;
    private LocalDate warrantyUntil;
}
