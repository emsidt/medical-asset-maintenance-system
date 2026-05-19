package com.medical.system.dto;

import com.medical.system.model.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String username;
    private String password; // Only for creation/update
    private com.medical.system.model.enums.Role role;
}
