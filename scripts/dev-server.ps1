# 本地后端 · 按需启动（替代此前的 pm2 开机常驻）
#
# 背景（2026-07-13 清理）：此前 pm2 + 注册表 Run + clean-boot.bat + 计划任务 GuoxueAPI 四处自启，
# 其中两处指向已废弃的 C 盘老路径（项目 7/11 迁到 D 盘）早就失效；真正在跑的 pm2 常驻则有两个陷阱：
#   1. 它跑的是 dist/main.js 编译产物 —— 改了源码不 rebuild 就还是旧代码（"以为在跑新代码"的经典坑）
#   2. pm2 resurrect 会固化旧环境变量，.env 改了也不生效
# 现已全部关停，改为按需启动：所见即所得。
#
# 用法：
#   powershell -File scripts\dev-server.ps1          # 编译 + 启动（生产模式，跑 dist）
#   powershell -File scripts\dev-server.ps1 -NoBuild # 跳过编译，直接跑现有 dist
#   powershell -File scripts\dev-server.ps1 -Watch   # 开发模式（nest start --watch，改代码自动重编）
#
# 停止：在本窗口按 Ctrl+C。

param(
    [switch]$NoBuild,
    [switch]$Watch
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 端口占用检查：先释放，避免 EADDRINUSE
$port = 3000
$conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($conn) {
    Write-Host "[dev-server] 端口 $port 被 PID $($conn.OwningProcess) 占用，正在释放..." -ForegroundColor Yellow
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

if ($Watch) {
    Write-Host "[dev-server] 开发模式 (nest start --watch)" -ForegroundColor Cyan
    Set-Location (Join-Path $root "apps\server")
    $env:NODE_OPTIONS = "--max-old-space-size=6144"
    & npx nest start --watch
    exit $LASTEXITCODE
}

if (-not $NoBuild) {
    Write-Host "[dev-server] 编译后端..." -ForegroundColor Cyan
    Set-Location (Join-Path $root "apps\server")
    $env:NODE_OPTIONS = "--max-old-space-size=6144"   # 不加会 OOM
    & npx nest build
    if ($LASTEXITCODE -ne 0) { Write-Host "[dev-server] 编译失败" -ForegroundColor Red; exit 1 }
    Set-Location $root
}

# 走 pm2-api.js：它负责从根 .env 加载环境变量再拉起 dist/main.js
# （apps/server/.env 已是指向根 .env 的符号链接 —— 单一真源，勿再建第二份）
Write-Host "[dev-server] 启动后端 → http://localhost:$port" -ForegroundColor Green
Write-Host "[dev-server] 停止：Ctrl+C" -ForegroundColor DarkGray
& node (Join-Path $root "scripts\pm2-api.js")
