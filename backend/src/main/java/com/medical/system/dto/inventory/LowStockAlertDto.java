package com.medical.system.dto.inventory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO cho cảnh báo linh kiện tồn kho thấp.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LowStockAlertDto {
    private Long id;
    private String partName;
    private int quantity;
    private int threshold;
}
