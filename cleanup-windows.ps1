# =====================================================================
# AUTO CLEANUP SCRIPT (KIND)
# =====================================================================

# Yeu cau quyen Admin
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Dang yeu cau quyen Administrator de xet file hosts..." -ForegroundColor Cyan
    Start-Process powershell.exe "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

# Fix loi duong dan: Chuyen den thu muc chua script
Set-Location -Path $PSScriptRoot

Write-Host "=== TIEN TRINH DON DEP TAI NGUYEN KIND ===" -ForegroundColor Cyan

if (Get-Command kind -ErrorAction SilentlyContinue) {
    Write-Host "`n[1/3] Dang xoa cum Kind (medical-cluster)..." -ForegroundColor Green
    kind delete cluster --name medical-cluster
} else {
    Write-Host "`n[1/3] Kind khong ton tai hoac chua duoc cai dat." -ForegroundColor Yellow
}

Write-Host "`n[2/3] Xoa cac Docker images da build..." -ForegroundColor Green
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker rmi medical-backend:latest medical-frontend:latest -f 2>$null
    Write-Host "-> Da xoa cac image." -ForegroundColor Yellow
}

Write-Host "`n[3/3] Khoi phuc file hosts..." -ForegroundColor Green
$domain = "medical.local"
$hostsPath = "$env:windir\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsPath -ErrorAction SilentlyContinue
if ($hostsContent -match $domain) {
    $newHosts = $hostsContent -notmatch $domain
    $newHosts | Set-Content $hostsPath
    Write-Host "-> Da xoa '$domain' khoi file hosts." -ForegroundColor Yellow
} else {
    Write-Host "-> Khong tim thay '$domain' trong file hosts." -ForegroundColor Yellow
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " DON DEP HOAN TAT SACH SE!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

Write-Host "`nCua so se duoc giu mo. Ban co the dong cua so nay." -ForegroundColor DarkGray
