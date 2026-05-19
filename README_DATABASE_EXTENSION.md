# Ghi chu database va huong mo rong tinh diem thiet bi

Tai lieu nay mo ta nhanh cau truc hien tai cua project, database dang co, va cach nen mo rong de tinh diem thiet bi theo khoa/phong ban, so lan sua chua, chi phi vat tu... voi muc anh huong thap nhat len code hien tai.

## 1. Cau truc project

```text
medical-asset-maintenance-system/
|-- backend/
|   |-- pom.xml
|   `-- src/main/
|       |-- java/com/medical/system/
|       |   |-- config/          # Security, OpenAPI, seed data
|       |   |-- controller/      # REST API
|       |   |-- dto/             # Request/response DTO
|       |   |-- exception/       # Xu ly loi dung chung
|       |   |-- mapper/          # MapStruct mapper
|       |   |-- model/
|       |   |   |-- entity/      # JPA entity -> table database
|       |   |   `-- enums/       # Role, AssetStatus, RequestStatus
|       |   |-- repository/      # Spring Data JPA repository
|       |   |-- security/        # JWT filter/service/user details
|       |   `-- service/         # Nghiep vu bao hong/sua chua
|       `-- resources/
|           `-- application.yml  # Cau hinh MySQL/JPA/JWT/server
|-- frontend/
|   |-- app/                     # Next.js App Router pages/actions
|   |-- components/              # UI components
|   |-- lib/                     # Axios/utils
|   `-- types/                   # TypeScript types
`-- README.md
```

Backend dung Spring Boot 3.2.5, Java 21, JPA/Hibernate, MySQL. Frontend dung Next.js 14, TypeScript, Tailwind CSS.

## 2. Database hien tai

Database duoc tao/cap nhat tu JPA entity, cau hinh trong `backend/src/main/resources/application.yml`:

```yaml
spring.jpa.hibernate.ddl-auto: update
spring.datasource.url: jdbc:mysql://localhost:3306/medical_system
```

Luu y: project hien chua co Flyway/Liquibase migration. `ddl-auto: update` tien cho demo, nhung khi database co du lieu that thi nen chuyen sang migration ro rang de tranh thay doi schema ngoai y muon.

### Bang `users`

Nguoi dung he thong.

| Cot | Y nghia |
| --- | --- |
| `id` | Khoa chinh |
| `username` | Ten dang nhap, unique |
| `password` | Mat khau da hash |
| `role` | `ADMIN`, `DOCTOR`, `ENGINEER` |

### Bang `assets`

Thiet bi y te.

| Cot | Y nghia |
| --- | --- |
| `id` | Khoa chinh |
| `code` | Ma thiet bi, unique |
| `name` | Ten thiet bi |
| `status` | Trang thai thiet bi, vi du `AVAILABLE`, `BROKEN` |

Hien tai bang nay chua co thong tin khoa/phong ban.

### Bang `service_requests`

Phieu bao hong/sua chua.

| Cot | Y nghia |
| --- | --- |
| `id` | Khoa chinh |
| `asset_id` | Thiet bi bi bao hong |
| `reported_by_id` | Nguoi bao hong |
| `description` | Mo ta loi |
| `status` | Trang thai phieu, vi du `PENDING`, `COMPLETED` |
| `created_at` | Thoi diem tao |
| `completed_at` | Thoi diem hoan thanh |

Quan he: moi phieu gan voi 1 thiet bi va 1 nguoi bao hong.

### Bang `service_logs`

Nhat ky sua chua cho phieu bao hong.

| Cot | Y nghia |
| --- | --- |
| `id` | Khoa chinh |
| `service_request_id` | Phieu sua chua |
| `engineer_id` | Ky su sua chua |
| `resolution_details` | Noi dung xu ly |
| `additional_log_data` | JSON dang text, hien dang luu thong tin phu |
| `created_at` | Thoi diem ghi log |

### Bang `service_log_parts`

Vat tu/phu tung da dung trong mot lan sua.

| Cot | Y nghia |
| --- | --- |
| `id` | Khoa chinh |
| `service_log_id` | Log sua chua |
| `inventory_id` | Vat tu trong kho |
| `quantity` | So luong da dung |

### Bang `inventory`

Kho vat tu.

| Cot | Y nghia |
| --- | --- |
| `id` | Khoa chinh |
| `part_name` | Ten vat tu |
| `quantity` | So luong ton |

## 3. Luong nghiep vu hien tai

### Bao hong

1. Bac si chon thiet bi.
2. Backend kiem tra thiet bi dang `AVAILABLE`.
3. Doi `assets.status` sang `BROKEN`.
4. Tao dong moi trong `service_requests` voi `status = PENDING`.

### Hoan thanh sua chua

1. Ky su chon phieu sua chua.
2. Tao `service_logs`.
3. Neu co dung vat tu, tru `inventory.quantity` va tao `service_log_parts`.
4. Doi `service_requests.status` sang `COMPLETED`, set `completed_at`.
5. Doi `assets.status` ve `AVAILABLE`.

## 4. Muc tieu tinh diem thiet bi theo khoa

Ban muon tinh cac chi so kieu:

- Diem/rui ro cua thiet bi theo khoa.
- So lan sua chua cua tung thiet bi.
- So lan sua chua trong 30/90/365 ngay.
- Thoi gian downtime tu luc bao hong den luc hoan thanh.
- Vat tu tieu hao theo thiet bi/khoa.
- Xep hang khoa co nhieu thiet bi hong hoac chi phi bao tri cao.

Nhung yeu cau nay nen duoc build tren du lieu lich su sua chua da co, khong nen ghi de vao bang `assets` qua nhieu, vi `assets` nen la bang trang thai hien tai cua thiet bi.

## 5. Huong chinh database it anh huong nhat

### Buoc 1: Them bang `departments`

Them bang khoa/phong ban doc lap.

```sql
CREATE TABLE departments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Vi du du lieu:

| code | name |
| --- | --- |
| ICU | Khoa Hoi suc tich cuc |
| ER | Khoa Cap cuu |
| RAD | Khoa Chan doan hinh anh |

### Buoc 2: Gan thiet bi voi khoa bang cot nullable

Them cot `department_id` vao `assets`.

```sql
ALTER TABLE assets
ADD COLUMN department_id BIGINT NULL,
ADD CONSTRAINT fk_assets_department
    FOREIGN KEY (department_id) REFERENCES departments(id);

CREATE INDEX idx_assets_department_id ON assets(department_id);
```

Ly do nen de `NULL` ban dau:

- Khong lam hong du lieu cu.
- Khong bat buoc phai gan khoa cho tat ca thiet bi ngay lap tuc.
- Code hien tai van co the chay neu chua dung den `department_id`.

Entity `Asset` sau nay chi can them:

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "department_id")
private Department department;
```

### Buoc 3: Neu thiet bi co the chuyen khoa, them bang lich su

Neu mot thiet bi co the duoc dieu chuyen qua cac khoa, khong nen chi dua vao `assets.department_id`, vi se mat lich su. Khi do them bang:

```sql
CREATE TABLE asset_department_assignments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    asset_id BIGINT NOT NULL,
    department_id BIGINT NOT NULL,
    assigned_from DATETIME NOT NULL,
    assigned_to DATETIME NULL,
    note VARCHAR(500),
    CONSTRAINT fk_assignment_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
    CONSTRAINT fk_assignment_department FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE INDEX idx_assignment_asset_time
    ON asset_department_assignments(asset_id, assigned_from, assigned_to);

CREATE INDEX idx_assignment_department_time
    ON asset_department_assignments(department_id, assigned_from, assigned_to);
```

Khuyen nghi:

- Neu demo/don gian: chi them `assets.department_id`.
- Neu can bao cao chinh xac theo lich su: them ca `asset_department_assignments`.

## 6. Tinh diem nen lam bang query/service, khong nen luu cung vao `assets`

Khong nen them cac cot nhu `repair_count`, `risk_score`, `department_score` truc tiep vao `assets` ngay tu dau, vi cac gia tri nay la du lieu tinh toan. Neu luu cung, ban phai dong bo moi lan bao hong/sua xong, rat de lech so.

Nen tinh diem tu cac bang lich su:

- `service_requests`: dem so lan bao hong/sua chua.
- `service_logs`: xem lan sua, ky su, thoi diem log.
- `service_log_parts`: tinh muc tieu hao vat tu.
- `assets.department_id` hoac `asset_department_assignments`: gom nhom theo khoa.

### Query dem so lan sua chua theo khoa

Dung khi thiet bi gan khoa truc tiep bang `assets.department_id`:

```sql
SELECT
    d.id AS department_id,
    d.name AS department_name,
    COUNT(sr.id) AS repair_count
FROM departments d
JOIN assets a ON a.department_id = d.id
LEFT JOIN service_requests sr ON sr.asset_id = a.id
GROUP BY d.id, d.name
ORDER BY repair_count DESC;
```

### Query dem so lan sua chua theo thiet bi

```sql
SELECT
    a.id AS asset_id,
    a.code AS asset_code,
    a.name AS asset_name,
    COUNT(sr.id) AS repair_count,
    MAX(sr.completed_at) AS last_completed_at
FROM assets a
LEFT JOIN service_requests sr ON sr.asset_id = a.id
GROUP BY a.id, a.code, a.name
ORDER BY repair_count DESC;
```

### Query downtime trung binh theo khoa

```sql
SELECT
    d.id AS department_id,
    d.name AS department_name,
    AVG(TIMESTAMPDIFF(HOUR, sr.created_at, sr.completed_at)) AS avg_downtime_hours
FROM departments d
JOIN assets a ON a.department_id = d.id
JOIN service_requests sr ON sr.asset_id = a.id
WHERE sr.completed_at IS NOT NULL
GROUP BY d.id, d.name;
```

### Query vat tu tieu hao theo khoa

```sql
SELECT
    d.id AS department_id,
    d.name AS department_name,
    i.part_name,
    SUM(slp.quantity) AS used_quantity
FROM departments d
JOIN assets a ON a.department_id = d.id
JOIN service_requests sr ON sr.asset_id = a.id
JOIN service_logs sl ON sl.service_request_id = sr.id
JOIN service_log_parts slp ON slp.service_log_id = sl.id
JOIN inventory i ON i.id = slp.inventory_id
GROUP BY d.id, d.name, i.part_name
ORDER BY d.name, used_quantity DESC;
```

## 7. Cong thuc diem goi y

Nen tinh diem theo thang 0-100, diem cang cao thi rui ro/can uu tien bao tri cang cao.

Vi du cho tung thiet bi:

```text
score =
  repair_count_90d * 20
+ repair_count_365d * 5
+ avg_downtime_hours * 1
+ used_part_quantity_365d * 2
+ current_broken_bonus
```

Trong do:

- `repair_count_90d`: so phieu sua trong 90 ngay gan nhat.
- `repair_count_365d`: so phieu sua trong 365 ngay gan nhat.
- `avg_downtime_hours`: thoi gian hong trung binh.
- `used_part_quantity_365d`: tong so vat tu da dung trong 365 ngay.
- `current_broken_bonus`: cong them vi du 30 diem neu thiet bi dang `BROKEN`.

Nen gioi han diem:

```text
final_score = MIN(100, score)
```

Muc phan loai:

| Diem | Muc |
| --- | --- |
| 0-29 | Thap |
| 30-59 | Trung binh |
| 60-79 | Cao |
| 80-100 | Rat cao |

## 8. Neu can luu ket qua tinh diem

Ban chi nen luu diem khi:

- Dashboard can load nhanh.
- Du lieu lon.
- Can xem lai diem tai mot thoi diem trong qua khu.

Khi do them bang snapshot rieng, khong sua bang `assets`:

```sql
CREATE TABLE asset_score_snapshots (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    asset_id BIGINT NOT NULL,
    department_id BIGINT NULL,
    score INT NOT NULL,
    repair_count_90d INT NOT NULL DEFAULT 0,
    repair_count_365d INT NOT NULL DEFAULT 0,
    avg_downtime_hours DECIMAL(10,2) NULL,
    used_part_quantity_365d INT NOT NULL DEFAULT 0,
    calculated_at DATETIME NOT NULL,
    CONSTRAINT fk_score_asset FOREIGN KEY (asset_id) REFERENCES assets(id),
    CONSTRAINT fk_score_department FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE INDEX idx_score_asset_calculated_at
    ON asset_score_snapshots(asset_id, calculated_at);

CREATE INDEX idx_score_department_calculated_at
    ON asset_score_snapshots(department_id, calculated_at);
```

Bang nay co the duoc update boi scheduled job moi ngay/gio, hoac tinh lai khi user mo dashboard.

## 9. Thu tu trien khai de it rui ro

1. Them bang `departments`.
2. Them `department_id` nullable vao `assets`.
3. Tao entity/repository `Department`.
4. Them field `department` vao `Asset`, nhung chua bat buoc tren API cu.
5. Cap nhat seed data de tao departments va gan mot so asset vao khoa.
6. Tao API thong ke rieng, vi du `/api/analytics/assets/scores` va `/api/analytics/departments/scores`.
7. Tinh diem bang query/service rieng, khong chen logic vao flow `reportFailure` va `completeRepair` neu chua can.
8. Khi du lieu lon moi them `asset_score_snapshots`.

## 10. Khuyen nghi quan trong

- Nen dung Flyway hoac Liquibase truoc khi schema phuc tap hon. Khong nen phu thuoc lau dai vao `hibernate.ddl-auto=update`.
- Khong nen sua truc tiep y nghia cua `service_requests` va `service_logs`, vi day la lich su nghiep vu quan trong.
- Khong nen luu `repair_count` truc tiep trong `assets` luc dau. Hay tinh tu `service_requests`.
- Nen them index cho cac cot hay query: `assets.department_id`, `service_requests.asset_id`, `service_requests.created_at`, `service_requests.completed_at`.
- Neu can bao cao dung theo lich su chuyen khoa, bat buoc them `asset_department_assignments`.
- `DataInitializer` hien dang xoa va seed lai database moi lan backend start. Khi muon giu du lieu that, can tat hoac sua logic nay.

## 11. Mo hinh database de xuat

Ban co the hinh dung ERD muc cao nhu sau:

```text
departments
  1 --- n assets
          1 --- n service_requests
                    1 --- n service_logs
                              1 --- n service_log_parts
                                        n --- 1 inventory

users
  1 --- n service_requests.reported_by_id
  1 --- n service_logs.engineer_id
```

Neu can lich su chuyen khoa:

```text
departments
  1 --- n asset_department_assignments
assets
  1 --- n asset_department_assignments
```

Day la cach mo rong an toan nhat vi cac bang sua chua hien tai van giu nguyen, frontend/API hien co it bi anh huong, va phan tinh diem co the phat trien thanh module analytics rieng.
