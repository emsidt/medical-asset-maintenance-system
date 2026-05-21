package com.medical.system.dto.maintenance;

import com.medical.system.model.enums.RequestPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReportFailureRequest {
    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Priority is required")
    private RequestPriority priority;
}
