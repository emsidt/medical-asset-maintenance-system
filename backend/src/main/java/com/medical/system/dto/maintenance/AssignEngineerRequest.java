package com.medical.system.dto.maintenance;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignEngineerRequest {
    @NotNull
    private Long engineerId;
}
