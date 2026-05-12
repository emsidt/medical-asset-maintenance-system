package com.medical.system.service;

import com.medical.system.dto.AssetScoreDto;
import com.medical.system.dto.DepartmentScoreDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class AnalyticsService {

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<AssetScoreDto> getAssetScores() {
        Query query = entityManager.createNativeQuery("""
                SELECT
                    a.id AS asset_id,
                    a.code AS asset_code,
                    a.name AS asset_name,
                    a.status AS asset_status,
                    d.id AS department_id,
                    d.name AS department_name,
                    COUNT(DISTINCT CASE
                        WHEN sr.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 90 DAY) THEN sr.id
                    END) AS repair_count_90d,
                    COUNT(DISTINCT CASE
                        WHEN sr.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 365 DAY) THEN sr.id
                    END) AS repair_count_365d,
                    COALESCE(AVG(CASE
                        WHEN sr.completed_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, sr.created_at, sr.completed_at)
                    END), 0) AS avg_downtime_hours,
                    COALESCE(SUM(CASE
                        WHEN sr.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 365 DAY) THEN slp.quantity
                        ELSE 0
                    END), 0) AS used_part_quantity_365d
                FROM assets a
                LEFT JOIN departments d ON d.id = a.department_id
                LEFT JOIN service_requests sr ON sr.asset_id = a.id
                LEFT JOIN service_logs sl ON sl.service_request_id = sr.id
                LEFT JOIN service_log_parts slp ON slp.service_log_id = sl.id
                GROUP BY a.id, a.code, a.name, a.status, d.id, d.name
                ORDER BY repair_count_90d DESC, repair_count_365d DESC, a.code
                """);

        return resultRows(query).stream()
                .map(row -> toAssetScore((Object[]) row))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DepartmentScoreDto> getDepartmentScores() {
        Query query = entityManager.createNativeQuery("""
                SELECT
                    d.id AS department_id,
                    d.code AS department_code,
                    d.name AS department_name,
                    COUNT(DISTINCT a.id) AS asset_count,
                    COUNT(DISTINCT CASE WHEN a.status = 'BROKEN' THEN a.id END) AS broken_asset_count,
                    COUNT(DISTINCT CASE
                        WHEN sr.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 90 DAY) THEN sr.id
                    END) AS repair_count_90d,
                    COUNT(DISTINCT CASE
                        WHEN sr.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 365 DAY) THEN sr.id
                    END) AS repair_count_365d,
                    COALESCE(AVG(CASE
                        WHEN sr.completed_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, sr.created_at, sr.completed_at)
                    END), 0) AS avg_downtime_hours,
                    COALESCE(SUM(CASE
                        WHEN sr.created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 365 DAY) THEN slp.quantity
                        ELSE 0
                    END), 0) AS used_part_quantity_365d
                FROM departments d
                LEFT JOIN assets a ON a.department_id = d.id
                LEFT JOIN service_requests sr ON sr.asset_id = a.id
                LEFT JOIN service_logs sl ON sl.service_request_id = sr.id
                LEFT JOIN service_log_parts slp ON slp.service_log_id = sl.id
                GROUP BY d.id, d.code, d.name
                ORDER BY repair_count_90d DESC, repair_count_365d DESC, d.code
                """);

        return resultRows(query).stream()
                .map(row -> toDepartmentScore((Object[]) row))
                .toList();
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> resultRows(Query query) {
        return query.getResultList();
    }

    private AssetScoreDto toAssetScore(Object[] row) {
        int repairCount90d = number(row[6]).intValue();
        int repairCount365d = number(row[7]).intValue();
        BigDecimal avgDowntimeHours = decimal(row[8]);
        int usedPartQuantity365d = number(row[9]).intValue();
        String assetStatus = string(row[3]);

        int score = calculateScore(
                repairCount90d,
                repairCount365d,
                avgDowntimeHours,
                usedPartQuantity365d,
                "BROKEN".equals(assetStatus) ? 30 : 0
        );

        return new AssetScoreDto(
                number(row[0]).longValue(),
                string(row[1]),
                string(row[2]),
                assetStatus,
                row[4] == null ? null : number(row[4]).longValue(),
                string(row[5]),
                repairCount90d,
                repairCount365d,
                avgDowntimeHours,
                usedPartQuantity365d,
                score,
                riskLevel(score)
        );
    }

    private DepartmentScoreDto toDepartmentScore(Object[] row) {
        int assetCount = number(row[3]).intValue();
        int brokenAssetCount = number(row[4]).intValue();
        int repairCount90d = number(row[5]).intValue();
        int repairCount365d = number(row[6]).intValue();
        BigDecimal avgDowntimeHours = decimal(row[7]);
        int usedPartQuantity365d = number(row[8]).intValue();

        int score = calculateScore(
                repairCount90d,
                repairCount365d,
                avgDowntimeHours,
                usedPartQuantity365d,
                brokenAssetCount * 20
        );

        return new DepartmentScoreDto(
                number(row[0]).longValue(),
                string(row[1]),
                string(row[2]),
                assetCount,
                brokenAssetCount,
                repairCount90d,
                repairCount365d,
                avgDowntimeHours,
                usedPartQuantity365d,
                score,
                riskLevel(score)
        );
    }

    private int calculateScore(
            int repairCount90d,
            int repairCount365d,
            BigDecimal avgDowntimeHours,
            int usedPartQuantity365d,
            int bonus
    ) {
        int rawScore = repairCount90d * 20
                + repairCount365d * 5
                + avgDowntimeHours.setScale(0, RoundingMode.HALF_UP).intValue()
                + usedPartQuantity365d * 2
                + bonus;

        return Math.min(100, rawScore);
    }

    private String riskLevel(int score) {
        if (score >= 80) {
            return "VERY_HIGH";
        }
        if (score >= 60) {
            return "HIGH";
        }
        if (score >= 30) {
            return "MEDIUM";
        }
        return "LOW";
    }

    private Number number(Object value) {
        return value == null ? 0 : (Number) value;
    }

    private String string(Object value) {
        return value == null ? null : value.toString();
    }

    private BigDecimal decimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal.setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(((Number) value).doubleValue()).setScale(2, RoundingMode.HALF_UP);
    }
}
