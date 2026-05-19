package com.medical.system.config;

import com.medical.system.model.entity.Asset;
import com.medical.system.model.entity.Department;
import com.medical.system.model.entity.Inventory;
import com.medical.system.model.entity.User;
import com.medical.system.model.enums.AssetStatus;
import com.medical.system.model.enums.Role;
import com.medical.system.repository.AssetRepository;
import com.medical.system.repository.DepartmentRepository;
import com.medical.system.repository.InventoryRepository;
import com.medical.system.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DefaultDataBootstrap implements CommandLineRunner {

    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final DepartmentRepository departmentRepository;
    private final InventoryRepository inventoryRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedUsersIfMissing();
        Map<String, Department> departments = seedDepartmentsIfMissing();
        seedAssetsIfMissing(departments);
        seedInventoryIfMissing();
    }

    private void seedUsersIfMissing() {
        createUserIfMissing("admin", "admin123", Role.ADMIN);
        createUserIfMissing("doctor", "doctor123", Role.DOCTOR);
        createUserIfMissing("engineer", "engineer123", Role.ENGINEER);
    }

    private Map<String, Department> seedDepartmentsIfMissing() {
        Department icu = createDepartmentIfMissing("ICU", "Khoa Hoi suc tich cuc");
        Department er = createDepartmentIfMissing("ER", "Khoa Cap cuu");
        Department rad = createDepartmentIfMissing("RAD", "Khoa Chan doan hinh anh");
        Department sur = createDepartmentIfMissing("SUR", "Khoa Phau thuat");

        return Map.of(
                "ICU", icu,
                "ER", er,
                "RAD", rad,
                "SUR", sur
        );
    }

    private void seedAssetsIfMissing(Map<String, Department> departments) {
        createAssetIfMissing("AST001", "MRI Scanner - Siemens", departments.get("RAD"),
                money("2500000000"), money("3000000000"), LocalDate.of(2023, 1, 15), LocalDate.of(2028, 1, 15));
        createAssetIfMissing("AST002", "Ventilator - Drager", departments.get("ICU"),
                money("450000000"), money("520000000"), LocalDate.of(2024, 3, 10), LocalDate.of(2027, 3, 10));
        createAssetIfMissing("AST003", "Ultrasound - GE", departments.get("RAD"),
                money("780000000"), money("900000000"), LocalDate.of(2022, 9, 5), LocalDate.of(2026, 9, 5));
        createAssetIfMissing("AST004", "X-Ray Machine - Philips", departments.get("ER"),
                money("1200000000"), money("1450000000"), LocalDate.of(2021, 11, 20), LocalDate.of(2026, 11, 20));
        createAssetIfMissing("AST005", "Patient Monitor - Mindray", departments.get("ICU"),
                money("120000000"), money("150000000"), LocalDate.of(2024, 6, 1), LocalDate.of(2027, 6, 1));
        createAssetIfMissing("AST006", "Infusion Pump - Baxter", departments.get("SUR"),
                money("65000000"), money("80000000"), LocalDate.of(2023, 8, 12), LocalDate.of(2026, 8, 12));
    }

    private void seedInventoryIfMissing() {
        createInventoryIfMissing("LCD Display Panel", 10, money("2500000"));
        createInventoryIfMissing("Power Supply Unit", 5, money("1800000"));
        createInventoryIfMissing("Oxygen Sensor", 50, money("450000"));
        createInventoryIfMissing("Thermal Printer Paper", 100, money("25000"));
    }

    private void createUserIfMissing(String username, String password, Role role) {
        if (userRepository.findByUsername(username).isPresent()) {
            return;
        }

        userRepository.save(User.builder()
                .username(username)
                .password(passwordEncoder.encode(password))
                .role(role)
                .build());
        log.info("Created default user: {}", username);
    }

    private Department createDepartmentIfMissing(String code, String name) {
        return departmentRepository.findByCode(code)
                .orElseGet(() -> {
                    Department department = departmentRepository.save(Department.builder()
                            .code(code)
                            .name(name)
                            .build());
                    log.info("Created default department: {}", code);
                    return department;
                });
    }

    private void createAssetIfMissing(
            String code,
            String name,
            Department department,
            BigDecimal purchasePrice,
            BigDecimal replacementCost,
            LocalDate purchaseDate,
            LocalDate warrantyUntil
    ) {
        if (assetRepository.findByCode(code).isPresent()) {
            return;
        }

        assetRepository.save(Asset.builder()
                .code(code)
                .name(name)
                .status(AssetStatus.AVAILABLE)
                .department(department)
                .purchasePrice(purchasePrice)
                .replacementCost(replacementCost)
                .purchaseDate(purchaseDate)
                .warrantyUntil(warrantyUntil)
                .build());
        log.info("Created default asset: {}", code);
    }

    private void createInventoryIfMissing(String partName, int quantity, BigDecimal unitCost) {
        if (inventoryRepository.existsByPartName(partName)) {
            return;
        }

        inventoryRepository.save(Inventory.builder()
                .partName(partName)
                .quantity(quantity)
                .unitCost(unitCost)
                .build());
        log.info("Created default inventory item: {}", partName);
    }

    private BigDecimal money(String value) {
        return new BigDecimal(value);
    }
}
