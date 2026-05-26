# ============================================================
# push_docker_hub.ps1
# Build and push Docker images to Docker Hub
#
# Repository: mytholaptopv3
#   - mytholaptopv3:admin-ui
#   - mytholaptopv3:backend-ui
#
# Notes:
#   - Build always uses --no-cache to ensure latest source code is compiled
#   - Two tags are pushed: <tag> (e.g. admin-ui) and <ImageTag> (e.g. latest)
#
# Usage:
#   .\push_docker_hub.ps1                           # Push all
#   .\push_docker_hub.ps1 admin-ui                  # Push admin-ui only
#   .\push_docker_hub.ps1 backend-ui               # Push backend-ui only
#   .\push_docker_hub.ps1 all v1.0.0               # Push all with custom tag
# ============================================================

param(
    [Parameter(Position = 0)]
    [ValidateSet("admin-ui", "backend-ui", "all")]
    [string]$Service = "all",

    [Parameter(Position = 1)]
    [string]$ImageTag = "latest"
)

# ====================== CONFIG ======================
$ErrorActionPreference = "Continue"

$DockerHubRepo = "mytholaptopv3"

$ServiceConfigs = @{
    "admin-ui" = @{
        Context    = "apps\admin-ui"
        Dockerfile = "Dockerfile"
        Tag        = "admin-ui"
    }
    "backend-ui" = @{
        Context    = "apps\backend-ui"
        Dockerfile = "apps\backend\Dockerfile"
        Tag        = "backend-ui"
    }
}

function Write-Step { param([string]$Msg) Write-Host "[BUILD]  $Msg" -ForegroundColor Cyan }
function Write-Success { param([string]$Msg) Write-Host "[PUSH]   $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg) Write-Host "[WARN]   $Msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$Msg) Write-Host "[ERROR]  $Msg" -ForegroundColor Red }

# ====================== PRECHECK ======================
$ProjectRoot = $PSScriptRoot
if ([string]::IsNullOrEmpty($ProjectRoot)) {
    $ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if ([string]::IsNullOrEmpty($ProjectRoot)) {
    Write-Fail "Cannot determine project root."
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Docker Hub Push - MTL Commerce" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Check Docker
Write-Step "Checking Docker..."
$dockerVersion = docker version --format "{{.Server.Version}}" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker is not running."
    exit 1
}
Write-Host "         Docker $dockerVersion"
Write-Host ""

# Get Docker Hub username
Write-Step "Getting Docker Hub username..."
$DockerHubUsername = $env:DOCKER_HUB_USERNAME

if (-not $DockerHubUsername) {
    $envFile = Join-Path $ProjectRoot ".env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            if ($_ -match "^DOCKER_HUB_USERNAME\s*=\s*(.+)") {
                $script:DockerHubUsername = $matches[1].Trim()
            }
        }
    }
}

if (-not $DockerHubUsername) {
    Write-Fail "DOCKER_HUB_USERNAME not set. Add to .env: DOCKER_HUB_USERNAME=quangthai87"
    exit 1
}

$RepoFull = "$DockerHubUsername/$DockerHubRepo"
Write-Host "         Username : $DockerHubUsername"
Write-Host "         Repo     : $DockerHubRepo"
Write-Host "         Tag      : $ImageTag"
Write-Host ""

# ====================== BUILD & PUSH ======================
function Build-And-Push {
    param(
        [string]$ServiceKey,
        [string]$Context,
        [string]$Dockerfile,
        [string]$Tag
    )

    $FullImage = "$RepoFull`:$Tag"
    $TaggedImage = "$RepoFull`:$ImageTag"

    Write-Host "----------------------------------------" -ForegroundColor DarkGray
    Write-Host "  $ServiceKey" -ForegroundColor White
    Write-Host "----------------------------------------" -ForegroundColor DarkGray

    # Build with both tags (--no-cache ensures latest source code is used)
    Write-Step "Building (no cache)..."
    Write-Host "         $TaggedImage" -ForegroundColor DarkGray

    $buildCmd = "docker build --no-cache -t `"$FullImage`" -t `"$TaggedImage`" -f `"$Dockerfile`" `"$Context`""
    $buildOutput = cmd /c "$buildCmd 2>&1"
    $buildExit = $LASTEXITCODE

    if ($buildExit -ne 0) {
        Write-Fail "Build failed: $ServiceKey"
        Write-Host $buildOutput -ForegroundColor Red
        return $false
    }
    Write-Success "Build OK"

    # Push
    Write-Step "Pushing..."

    # Push tag (e.g. mytholaptopv3:admin-ui)
    $push1 = docker push $FullImage 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Push failed: $FullImage"
        Write-Host "  $($push1 | Select-Object -Last 3)" -ForegroundColor Yellow
        return $false
    }
    Write-Success "Push OK: $FullImage"

    # Push custom tag (e.g. mytholaptopv3:latest)
    if ($Tag -ne $ImageTag) {
        $push2 = docker push $TaggedImage 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warn "Push failed: $TaggedImage"
        } else {
            Write-Success "Push OK: $TaggedImage"
        }
    }

    return $true
}

# ====================== MAIN ======================
$servicesToPush = @()
switch ($Service) {
    "admin-ui"   { $servicesToPush = @("admin-ui") }
    "backend-ui" { $servicesToPush = @("backend-ui") }
    "all"       { $servicesToPush = @("admin-ui", "backend-ui") }
}

$startTime = Get-Date
$failed = @()
$success = @()

foreach ($svc in $servicesToPush) {
    $cfg = $ServiceConfigs[$svc]
    $svcPath = Join-Path $ProjectRoot $cfg.Context
    $dockerfilePath = Join-Path $svcPath $cfg.Dockerfile

    if (-not (Test-Path $dockerfilePath)) {
        Write-Fail "Dockerfile not found: $dockerfilePath"
        $failed += $svc
        continue
    }

    $ok = Build-And-Push `
        -ServiceKey $svc `
        -Context $svcPath `
        -Dockerfile $dockerfilePath `
        -Tag $cfg.Tag

    if ($ok) { $success += $svc } else { $failed += $svc }
}

# ====================== SUMMARY ======================
$elapsed = (Get-Date) - $startTime

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  SUMMARY" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  Time     : $($elapsed.ToString('mm\:ss'))"
Write-Host "  Success  : $($success.Count)  -  $($success -join ', ')" -ForegroundColor Green
if ($failed.Count -gt 0) {
    Write-Host "  Failed   : $($failed.Count)  -  $($failed -join ', ')" -ForegroundColor Red
}
Write-Host ""

if ($failed.Count -eq 0) {
    Write-Host "Done! Images on Docker Hub:" -ForegroundColor Green
    foreach ($s in $servicesToPush) {
        $t = $ServiceConfigs[$s].Tag
        Write-Host "  docker.io/$RepoFull`:$t"
        Write-Host "  docker.io/$RepoFull`:$ImageTag"
    }
    Write-Host ""
} else {
    Write-Fail "$($failed.Count) service(s) failed."
    exit 1
}
