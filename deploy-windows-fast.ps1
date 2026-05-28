# =====================================================================
# AUTO DEPLOY SCRIPT DANH CHO WINDOWS (SU DUNG KIND & GITHUB PACKAGES)
# =====================================================================

# Yeu cau quyen Admin
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Dang yeu cau quyen Administrator de xoa host..." -ForegroundColor Cyan
    Start-Process powershell.exe "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Fix loi duong dan: Chuyen den thu muc chua script
Set-Location -Path $PSScriptRoot

Write-Host "=== KHOI DONG TIEN TRINH DEPLOY TU DONG TU GITHUB PACKAGES ===" -ForegroundColor Cyan

# Kiem tra trang thai Docker
Write-Host "Kiem tra trang thai Docker..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Loi: Khong tim thay lenh 'docker'. Vui long cai dat Docker Desktop!" -ForegroundColor Red
    exit
}

docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Loi: Docker Desktop chua duoc bat! Vui long khoi dong Docker Desktop roi chay lai script nay." -ForegroundColor Red
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
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s

Write-Host "`n[3/6] Pull Docker Images tu GitHub Container Registry (GHCR)..." -ForegroundColor Green
$backendImage = "ghcr.io/shimamurahougetsu1337/medical-asset-maintenance-system-backend:latest"
$frontendImage = "ghcr.io/shimamurahougetsu1337/medical-asset-maintenance-system-frontend:latest"

Write-Host "Dang tai Backend Image tu GitHub..." -ForegroundColor Cyan
docker pull $backendImage
Write-Host "Dang tai Frontend Image tu GitHub..." -ForegroundColor Cyan
docker pull $frontendImage

Write-Host "Doi ten (Tag) Image de phu hop voi cau hinh Kubernetes hien tai..." -ForegroundColor Yellow
docker tag $backendImage medical-backend:latest
docker tag $frontendImage medical-frontend:latest

Write-Host "`n[4/6] Load Images vao Cum Kind..." -ForegroundColor Green
kind load docker-image medical-backend:latest --name medical-cluster
kind load docker-image medical-frontend:latest --name medical-cluster

Write-Host "`n[5/6] Apply Kubernetes Configurations bang Kustomize..." -ForegroundColor Green
kubectl apply -k k8s/

# Buoc phu: Restart lai cac deployment de no nhan image moi nhat (trong truong hop image cung ten)
Write-Host "Khoi dong lai cac Pods de cap nhat code moi nhat..." -ForegroundColor Yellow
kubectl rollout restart deployment/backend-deployment -n medical-system
kubectl rollout restart deployment/frontend-deployment -n medical-system

Write-Host "`n[6/6] Cau hinh file hosts..." -ForegroundColor Green
$domain = "medical.local"
$ip = "127.0.0.1" 

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
Write-Host " TRIEN KHAI HOAN TAT THANH CONG SIÊU TỐC!" -ForegroundColor Green
Write-Host " URL Ung dung    : http://$domain" -ForegroundColor Cyan
Write-Host " API Swagger Docs: http://$domain/swagger-ui/index.html" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green

Write-Host "`nCua so se duoc giu mo de ban kiem tra log. Ban co the dong cua so nay." -ForegroundColor DarkGray
