package com.medical.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.system.dto.maintenance.CompleteRepairRequest;
import com.medical.system.model.entity.Asset;
import com.medical.system.model.entity.ServiceRequest;
import com.medical.system.model.entity.User;
import com.medical.system.model.enums.AssetStatus;
import com.medical.system.model.enums.RequestStatus;
import com.medical.system.model.enums.Role;
import com.medical.system.repository.AssetRepository;
import com.medical.system.repository.ServiceRequestRepository;
import com.medical.system.repository.UserRepository;
import com.medical.system.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
public class MaintenanceControllerApiTest {

    @Container
    static MySQLContainer<?> mysql = new MySQLContainer<>("mysql:8.0");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", mysql::getJdbcUrl);
        registry.add("spring.datasource.username", mysql::getUsername);
        registry.add("spring.datasource.password", mysql::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AssetRepository assetRepository;

    @Autowired
    private ServiceRequestRepository serviceRequestRepository;

    @Autowired
    private com.medical.system.repository.MaintenanceScheduleRepository maintenanceScheduleRepository;

    @Autowired
    private com.medical.system.repository.NotificationRepository notificationRepository;

    @Autowired
    private com.medical.system.repository.ServiceLogRepository serviceLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private User engineer1;
    private User hackerEngineer;
    private ServiceRequest targetRequest;

    @BeforeEach
    void setup() {
        notificationRepository.deleteAll();
        serviceLogRepository.deleteAll();
        maintenanceScheduleRepository.deleteAll();
        serviceRequestRepository.deleteAll();
        assetRepository.deleteAll();
        userRepository.deleteAll();

        engineer1 = new User();
        engineer1.setUsername("engineer1");
        engineer1.setPassword(passwordEncoder.encode("password"));
        engineer1.setRole(Role.ENGINEER);
        userRepository.save(engineer1);

        hackerEngineer = new User();
        hackerEngineer.setUsername("hacker_engineer");
        hackerEngineer.setPassword(passwordEncoder.encode("password"));
        hackerEngineer.setRole(Role.ENGINEER);
        userRepository.save(hackerEngineer);

        Asset asset = new Asset();
        asset.setName("X-Ray Machine");
        asset.setCode("XR-001");
        asset.setStatus(AssetStatus.UNDER_MAINTENANCE);
        assetRepository.save(asset);

        targetRequest = ServiceRequest.builder()
                .asset(asset)
                .status(RequestStatus.ASSIGNED)
                .assignedEngineer(engineer1)
                .reportedBy(engineer1)
                .description("X-Ray broken")
                .createdAt(LocalDateTime.now())
                .build();
        serviceRequestRepository.save(targetRequest);
    }

    @Test
    @DisplayName("Positive Path: Engineer có quyền hoàn thành task của chính mình")
    void testCompleteRepair_Success() throws Exception {
        String token = jwtService.generateAccessToken(engineer1.getUsername(), engineer1.getRole().name());
        
        CompleteRepairRequest req = new CompleteRepairRequest();
        req.setResolutionDetails("Fixed X-Ray lens");

        mockMvc.perform(post("/api/service-requests/" + targetRequest.getId() + "/complete")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Negative Path (IDOR Security): Hacker Engineer cố gắng hoàn thành task của Engineer khác -> Phải báo lỗi 403")
    void testCompleteRepair_IdorAttack_Returns403() throws Exception {
        String hackerToken = jwtService.generateAccessToken(hackerEngineer.getUsername(), hackerEngineer.getRole().name());
        
        CompleteRepairRequest req = new CompleteRepairRequest();
        req.setResolutionDetails("Hacker completes task to steal reward");

        mockMvc.perform(post("/api/service-requests/" + targetRequest.getId() + "/complete")
                .header("Authorization", "Bearer " + hackerToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }
}
