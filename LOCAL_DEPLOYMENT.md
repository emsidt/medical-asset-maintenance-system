# Hướng dẫn Triển khai Cục bộ bằng Kubernetes trong Docker (KIND)

Tài liệu này hướng dẫn cách chạy toàn bộ ứng dụng **Medical Asset & Maintenance Management System** cục bộ sử dụng **Kind** thay vì Minikube, giúp ứng dụng nhẹ nhàng hơn, tích hợp trực tiếp vào Docker Desktop. Tài liệu cũng cung cấp hướng dẫn dọn dẹp sạch sẽ tài nguyên khi không sử dụng.

---

## ⚡ 1-Click: Triển Khai & Dọn Dẹp Siêu Tốc (Dành cho Windows)

Để việc triển khai diễn ra nhanh nhất, dự án cung cấp sẵn 2 file script để tự động hóa 100% quá trình từ cài đặt tới triển khai.

**Yêu cầu:** Máy tính đã cài sẵn và đang mở **Docker Desktop**.

### Triển khai ứng dụng (Deploy)
1. Mở thư mục gốc của dự án.
2. Chuột phải vào file `deploy-windows.ps1` và chọn **Run with PowerShell**.
3. Script sẽ yêu cầu quyền Administrator (để cập nhật file `hosts`). Hãy chọn "Yes".
4. Ngồi chờ hệ thống tự động:
   - Cài đặt `kind` và `kubectl` (nếu chưa có).
   - Khởi tạo cụm Kind (`medical-cluster`).
   - Cài đặt Ingress NGINX cho Kind.
   - Build ứng dụng bằng Docker.
   - Nạp (Load) image vào Kind.
   - Apply các file `.yaml` trong thư mục `k8s/`.
   - Cập nhật tên miền `medical.local` trong file hosts trỏ về `127.0.0.1`.
5. Sau khi hoàn tất, truy cập ứng dụng tại: **[http://medical.local](http://medical.local)**

### Dọn dẹp ứng dụng (Clean up)
Khi không dùng nữa và muốn xóa hoàn toàn để lấy lại RAM và dung lượng ổ cứng:
1. Chuột phải vào file `cleanup-windows.ps1` và chọn **Run with PowerShell**.
2. Script sẽ yêu cầu quyền Administrator và tự động:
   - Xóa cụm Kind (`medical-cluster`).
   - Xóa các Docker Image đã build.
   - Xóa cấu hình tên miền `medical.local` khỏi file hosts.

---

## 🛠 Triển Khai & Dọn Dẹp Thủ Công (Dành cho macOS / Linux hoặc làm từng bước)

Nếu bạn không dùng Windows hoặc muốn hiểu rõ các lệnh phía dưới, vui lòng làm theo hướng dẫn sau.

<details>
<summary>Nhấn vào đây để xem các bước thủ công</summary>

### A. Triển Khai Ứng Dụng

**Bước 1: Cài đặt công cụ (Yêu cầu đã cài Docker)**
- **Windows (Winget):** `winget install Kubernetes.kind; winget install Kubernetes.kubectl`
- **macOS (Homebrew):** `brew install kind kubectl docker colima`
- **Linux:** Truy cập trang chủ của Kind và Kubectl để tải bản phân phối phù hợp.

**Bước 2: Tạo cụm Kind với Ingress hỗ trợ**
```bash
kind create cluster --name medical-cluster --config k8s/kind-config.yaml
```

**Bước 3: Cài đặt Ingress NGINX**
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```
*Chờ khoảng 1-2 phút cho Ingress khởi động (`Running`).*

**Bước 4: Build Docker Image**
```bash
docker build -t medical-backend:latest ./backend
docker build -t medical-frontend:latest ./frontend
```

**Bước 5: Load Image vào Kind**
```bash
kind load docker-image medical-backend:latest --name medical-cluster
kind load docker-image medical-frontend:latest --name medical-cluster
```

**Bước 6: Apply K8s Configurations**
```bash
kubectl apply -k k8s/
```

**Bước 7: Cấu hình file Hosts**
1. Mở file hosts với quyền Admin (`C:\Windows\System32\drivers\etc\hosts` trên Windows hoặc `/etc/hosts` trên Mac/Linux).
2. Thêm dòng sau:
   `127.0.0.1 medical.local`
3. Truy cập [http://medical.local](http://medical.local).

---

### B. Dọn Dẹp Ứng Dụng

Khi muốn giải phóng tài nguyên:
```bash
# 1. Xóa toàn bộ cụm Kind (tự động xóa k8s resources bên trong)
kind delete cluster --name medical-cluster

# 2. Xóa các image đã build trong Docker
docker rmi medical-backend:latest medical-frontend:latest -f

# 3. (Tùy chọn) Gỡ cài đặt công cụ (Chỉ trên Windows)
winget uninstall Kubernetes.kind; winget uninstall Kubernetes.kubectl
```
Và đừng quên mở lại file `hosts` để xóa dòng `127.0.0.1 medical.local`.

</details>
