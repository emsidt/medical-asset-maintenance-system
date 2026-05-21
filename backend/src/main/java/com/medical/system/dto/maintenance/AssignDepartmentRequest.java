package com.medical.system.dto.maintenance;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignDepartmentRequest {
    @NotNull
    private Long departmentId;
}
