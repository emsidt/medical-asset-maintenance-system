package com.medical.system.repository;

import com.medical.system.model.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    boolean existsByPartName(String partName);
}
