package com.medical.system.dto.inventory;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateInventoryFinancialRequest {
    private BigDecimal unitCost;
}
