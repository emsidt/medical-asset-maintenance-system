# =====================================================================
# AUTO DEPLOY SCRIPT DANH CHO WINDOWS (SU DUNG KIND)
# =====================================================================

# Yeu cau quyen Admin
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Dang yeu cau quyen Administrator de xoa host..." -ForegroundColor Cyan
    Start-Process powershell.exe "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Fix loi duong dan: Chuyen den thu muc chua script
Set-Location -Path $PSScriptRoot

Write-Host "=== KHOI DONG TIEN TRINH DEPLOY TU DONG (KIND) ===" -ForegroundColor Cyan

# [Tối ưu] Kiem tra xem Docker Desktop da bat hay chua
Write-Host "Kiem tra trang thai Docker..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Loi: Khong tim thay lenh 'docker'. Vui long cai dat Docker Desktop!" -ForegroundColor Red
    # Window kept open by -NoExit
    exit
}

docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Loi: Docker Desktop chua duoc bat! Vui long khoi dong Docker Desktop roi chay lai script nay." -ForegroundColor Red
    # Window kept open by -NoExit
    exit
}
Write-Host "-> Docker Desktop dang chay tot." -ForegroundColor Green

$needReloadPath = $false

if (-not (Get-Command kind -ErrorAction SilentlyContinue)) {
    Write-Host "Dang cai dat kind..." -ForegroundColor Yellow
    winget install Kubernetes.kind --accept-source-agreements --accept-package-agreements
    $needReloadPath = $true
}

if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "Dang cai dat kubectl..." -ForegroundColor Yellow
    winget install Kubernetes.kubectl --accept-source-agreements --accept-package-agreements
    $needReloadPath = $true
}

if ($needReloadPath) {
    Write-Host "Dang nap lai bien moi truong PATH..." -ForegroundColor Yellow
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

Write-Host "`n[1/6] Khoi dong Cum Kind..." -ForegroundColor Green
# [Tối ưu] Kiem tra cum da ton tai hay chua (Idempotency)
$existingClusters = kind get clusters 2>$null
if ($existingClusters -contains "medical-cluster") {
    Write-Host "-> Cum 'medical-cluster' da ton tai. Bo qua tao moi." -ForegroundColor Yellow
} else {
    Write-Host "-> Dang tao moi cum 'medical-cluster' (voi k8s/kind-config.yaml map port 80/443)..." -ForegroundColor Yellow
    kind create cluster --name medical-cluster --config k8s/kind-config.yaml
}

Write-Host "`n[2/6] Kich hoat Ingress Controller cho Kind..." -ForegroundColor Green
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
Write-Host "Dang cho Ingress Controller khoi dong (Co the mat 1-2 phut)..." -ForegroundColor Yellow
# Wait until the ingress-nginx-controller is ready
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s

Write-Host "`n[3/6] Build Docker Images (su dung Docker Desktop)..." -ForegroundColor Green
docker build -t medical-backend:latest ./backend
docker build -t medical-frontend:latest ./frontend

Write-Host "`n[4/6] Load Images vao Cum Kind..." -ForegroundColor Green
kind load docker-image medical-backend:latest --name medical-cluster
kind load docker-image medical-frontend:latest --name medical-cluster

Write-Host "`n[5/6] Apply Kubernetes Configurations bang Kustomize..." -ForegroundColor Green
kubectl apply -k k8s/

Write-Host "`n[6/6] Cau hinh file hosts..." -ForegroundColor Green
$domain = "medical.local"
$ip = "127.0.0.1" # Kind maps ports to localhost by default

$hostsPath = "$env:windir\System32\drivers\etc\hosts"
$entry = "$ip`t$domain"
$hostsContent = Get-Content $hostsPath -ErrorAction SilentlyContinue
if ($hostsContent -match $domain) {
    $newHosts = $hostsContent -notmatch $domain
    $newHosts += $entry
    $newHosts | Set-Content $hostsPath
    Write-Host "-> Da cap nhat IP ($ip) cho '$domain' vao file hosts." -ForegroundColor Yellow
} else {
    Add-Content -Path $hostsPath -Value "`n$entry"
    Write-Host "-> Da them '$entry' vao file hosts." -ForegroundColor Yellow
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " TRIEN KHAI HOAN TAT THANH CONG!" -ForegroundColor Green
Write-Host " URL Ung dung    : http://$domain" -ForegroundColor Cyan
Write-Host " API Swagger Docs: http://$domain/swagger-ui/index.html" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green

Write-Host "`nCua so se duoc giu mo de ban kiem tra log. Ban co the dong cua so nay." -ForegroundColor DarkGray
