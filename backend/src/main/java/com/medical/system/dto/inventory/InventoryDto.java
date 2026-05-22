package com.medical.system.dto.inventory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryDto {
    private Long id;
    private String partName;
    private Integer quantity;
    private Integer minQuantity;
    private Double unitPrice;
}
