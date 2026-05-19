package com.medical.system.repository;

import com.medical.system.model.entity.Asset;
import com.medical.system.model.enums.AssetStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long> {

    @Override
    @EntityGraph(attributePaths = "department")
    List<Asset> findAll();

    /**
     * Tìm thiết bị theo mã (Dùng để seed data hoặc tìm nhanh).
     */
    Optional<Asset> findByCode(String code);

    /**
     * Dùng bởi Cron Job để tìm các Asset đến hạn bảo trì.
     */
    List<Asset> findByNextMaintenanceDateLessThanEqual(LocalDate date);

    /**
     * Dùng bởi API thống kê để đếm thiết bị theo trạng thái.
     */
    long countByStatus(AssetStatus status);
}

