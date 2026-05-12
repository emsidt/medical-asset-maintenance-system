package com.medical.system.repository;

import com.medical.system.model.entity.Asset;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssetRepository extends JpaRepository<Asset, Long> {
    @Override
    @EntityGraph(attributePaths = "department")
    List<Asset> findAll();

    Optional<Asset> findByCode(String code);
}
