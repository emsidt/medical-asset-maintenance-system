package com.medical.system.service;

import com.medical.system.dto.asset.AssetFinancialDto;
import com.medical.system.dto.dashboard.DepartmentFinancialDto;
import com.medical.system.dto.dashboard.FinancialSummaryDto;
import com.medical.system.dto.asset.UpdateAssetFinancialRequest;
import com.medical.system.dto.inventory.UpdateInventoryFinancialRequest;
import com.medical.system.exception.ResourceNotFoundException;
import com.medical.system.model.entity.Asset;
import com.medical.system.model.entity.Inventory;
import com.medical.system.repository.AssetRepository;
import com.medical.system.repository.InventoryRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FinanceService {

    private static final BigDecimal REPLACEMENT_THRESHOLD_PERCENT = new BigDecimal("60");

    private final AssetRepository assetRepository;
    private final InventoryRepository inventoryRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public FinancialSummaryDto getSummary() {
        Query query = entityManager.createNativeQuery("""
                SELECT
                    (SELECT COUNT(*) FROM assets) AS asset_count,
                    (SELECT COALESCE(SUM(purchase_price), 0) FROM assets) AS total_purchase_value,
                    (SELECT COALESCE(SUM(replacement_cost), 0) FROM assets) AS total_replacement_value,
                    (SELECT COALESCE(SUM(slp.quantity * COALESCE(i.unit_cost, 0)), 0)
                        FROM service_log_parts slp
                        JOIN inventory i ON i.id = slp.inventory_id) AS total_parts_cost,
                    (SELECT COALESCE(SUM(labor_cost), 0) FROM service_logs) AS total_labor_cost
                """);

        Object[] row = (Object[]) query.getSingleResult();
        BigDecimal totalPurchaseValue = decimal(row[1]);
        BigDecimal totalPartsCost = decimal(row[3]);
        BigDecimal totalLaborCost = decimal(row[4]);
        BigDecimal totalRepairCost = totalPartsCost.add(totalLaborCost);

        return new FinancialSummaryDto(
                number(row[0]).intValue(),
                totalPurchaseValue,
                decimal(row[2]),
                totalPartsCost,
                totalLaborCost,
                totalRepairCost,
                ratio(totalRepairCost, totalPurchaseValue)
        );
    }

    @Transactional(readOnly = true)
    public List<AssetFinancialDto> getAssetFinancials() {
        Query query = entityManager.createNativeQuery("""
                SELECT
                    a.id,
                    a.code,
                    a.name,
                    d.id AS department_id,
                    d.name AS department_name,
                    COALESCE(a.purchase_price, 0),
                    COALESCE(a.replacement_cost, 0),
                    a.purchase_date,
                    a.warranty_until,
                    COALESCE(rc.repair_count, 0),
                    COALESCE(pc.parts_cost, 0),
                    COALESCE(lc.labor_cost, 0)
                FROM assets a
                LEFT JOIN departments d ON d.id = a.department_id
                LEFT JOIN (
                    SELECT asset_id, COUNT(*) AS repair_count
                    FROM service_requests
                    GROUP BY asset_id
                ) rc ON rc.asset_id = a.id
                LEFT JOIN (
                    SELECT sr.asset_id, SUM(slp.quantity * COALESCE(i.unit_cost, 0)) AS parts_cost
                    FROM service_requests sr
                    JOIN service_logs sl ON sl.service_request_id = sr.id
                    JOIN service_log_parts slp ON slp.service_log_id = sl.id
                    JOIN inventory i ON i.id = slp.inventory_id
                    GROUP BY sr.asset_id
                ) pc ON pc.asset_id = a.id
                LEFT JOIN (
                    SELECT sr.asset_id, SUM(COALESCE(sl.labor_cost, 0)) AS labor_cost
                    FROM service_requests sr
                    JOIN service_logs sl ON sl.service_request_id = sr.id
                    GROUP BY sr.asset_id
                ) lc ON lc.asset_id = a.id
                ORDER BY (COALESCE(pc.parts_cost, 0) + COALESCE(lc.labor_cost, 0)) DESC, a.code
                """);

        return resultRows(query).stream()
                .map(row -> {
                    BigDecimal purchasePrice = decimal(row[5]);
                    BigDecimal partsCost = decimal(row[10]);
                    BigDecimal laborCost = decimal(row[11]);
                    BigDecimal totalRepairCost = partsCost.add(laborCost);
                    BigDecimal repairRatio = ratio(totalRepairCost, purchasePrice);

                    return new AssetFinancialDto(
                            number(row[0]).longValue(),
                            string(row[1]),
                            string(row[2]),
                            row[3] == null ? null : number(row[3]).longValue(),
                            string(row[4]),
                            purchasePrice,
                            decimal(row[6]),
                            localDate(row[7]),
                            localDate(row[8]),
                            number(row[9]).intValue(),
                            partsCost,
                            laborCost,
                            totalRepairCost,
                            repairRatio,
                            repairRatio.compareTo(REPLACEMENT_THRESHOLD_PERCENT) >= 0
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DepartmentFinancialDto> getDepartmentFinancials() {
        Query query = entityManager.createNativeQuery("""
                SELECT
                    d.id,
                    d.code,
                    d.name,
                    COALESCE(av.asset_count, 0) AS asset_count,
                    COALESCE(av.purchase_value, 0) AS purchase_value,
                    COALESCE(av.replacement_value, 0) AS replacement_value,
                    COALESCE(rc.repair_count, 0) AS repair_count,
                    COALESCE(pc.parts_cost, 0) AS parts_cost,
                    COALESCE(lc.labor_cost, 0) AS labor_cost
                FROM departments d
                LEFT JOIN (
                    SELECT department_id,
                           COUNT(*) AS asset_count,
                           SUM(COALESCE(purchase_price, 0)) AS purchase_value,
                           SUM(COALESCE(replacement_cost, 0)) AS replacement_value
                    FROM assets
                    GROUP BY department_id
                ) av ON av.department_id = d.id
                LEFT JOIN (
                    SELECT a.department_id, COUNT(sr.id) AS repair_count
                    FROM assets a
                    JOIN service_requests sr ON sr.asset_id = a.id
                    GROUP BY a.department_id
                ) rc ON rc.department_id = d.id
                LEFT JOIN (
                    SELECT a.department_id, SUM(slp.quantity * COALESCE(i.unit_cost, 0)) AS parts_cost
                    FROM assets a
                    JOIN service_requests sr ON sr.asset_id = a.id
                    JOIN service_logs sl ON sl.service_request_id = sr.id
                    JOIN service_log_parts slp ON slp.service_log_id = sl.id
                    JOIN inventory i ON i.id = slp.inventory_id
                    GROUP BY a.department_id
                ) pc ON pc.department_id = d.id
                LEFT JOIN (
                    SELECT a.department_id, SUM(COALESCE(sl.labor_cost, 0)) AS labor_cost
                    FROM assets a
                    JOIN service_requests sr ON sr.asset_id = a.id
                    JOIN service_logs sl ON sl.service_request_id = sr.id
                    GROUP BY a.department_id
                ) lc ON lc.department_id = d.id
                ORDER BY (COALESCE(pc.parts_cost, 0) + COALESCE(lc.labor_cost, 0)) DESC, d.code
                """);

        return resultRows(query).stream()
                .map(row -> {
                    BigDecimal purchaseValue = decimal(row[4]);
                    BigDecimal partsCost = decimal(row[7]);
                    BigDecimal laborCost = decimal(row[8]);
                    BigDecimal totalRepairCost = partsCost.add(laborCost);

                    return new DepartmentFinancialDto(
                            number(row[0]).longValue(),
                            string(row[1]),
                            string(row[2]),
                            number(row[3]).intValue(),
                            purchaseValue,
                            decimal(row[5]),
                            number(row[6]).intValue(),
                            partsCost,
                            laborCost,
                            totalRepairCost,
                            ratio(totalRepairCost, purchaseValue)
                    );
                })
                .toList();
    }

    @Transactional
    public Asset updateAssetFinancials(Long assetId, UpdateAssetFinancialRequest request) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found with id: " + assetId));

        if (request.getPurchasePrice() != null) {
            asset.setPurchasePrice(request.getPurchasePrice());
        }
        if (request.getReplacementCost() != null) {
            asset.setReplacementCost(request.getReplacementCost());
        }
        if (request.getPurchaseDate() != null) {
            asset.setPurchaseDate(request.getPurchaseDate());
        }
        if (request.getWarrantyUntil() != null) {
            asset.setWarrantyUntil(request.getWarrantyUntil());
        }

        return assetRepository.save(asset);
    }

    @Transactional
    public Inventory updateInventoryFinancials(Long inventoryId, UpdateInventoryFinancialRequest request) {
        Inventory inventory = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + inventoryId));

        if (request.getUnitCost() != null) {
            inventory.setUnitCost(request.getUnitCost());
        }

        return inventoryRepository.save(inventory);
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> resultRows(Query query) {
        return query.getResultList();
    }

    private Number number(Object value) {
        return value == null ? 0 : (Number) value;
    }

    private String string(Object value) {
        return value == null ? null : value.toString();
    }

    private BigDecimal decimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (value instanceof BigDecimal decimal) {
            return decimal.setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(((Number) value).doubleValue()).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal ratio(BigDecimal value, BigDecimal base) {
        if (base == null || BigDecimal.ZERO.compareTo(base) == 0) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.multiply(new BigDecimal("100")).divide(base, 2, RoundingMode.HALF_UP);
    }

    private LocalDate localDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date date) {
            return date.toLocalDate();
        }
        return LocalDate.parse(value.toString());
    }
}
