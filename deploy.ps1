param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$frontendDist = Join-Path $frontendDir "dist\index.html"

function Resolve-Node {
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $candidates = @(
    (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"),
    (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\node.exe")
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  throw "Node.js was not found."
}

function Resolve-Pnpm {
  $command = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }
  $fallback = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
  if (Test-Path -LiteralPath $fallback) { return $fallback }
  throw "pnpm was not found."
}

$node = Resolve-Node
$nodeDir = Split-Path -Parent $node
$env:PATH = "$nodeDir;$env:PATH"

# 1. 构建生产前端
if (-not (Test-Path -LiteralPath $frontendDist)) {
  Write-Host "Frontend build not found. Building production frontend..."
  $pnpm = Resolve-Pnpm
  Push-Location $frontendDir
  & $pnpm install
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  & $pnpm build
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
  Pop-Location
}

# 2. 获取本机局域网 IP
$lanIp = "127.0.0.1"
try {
  $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -ExpandProperty IPAddress
  if ($ips) { $lanIp = $ips | Select-Object -First 1 }
} catch { }

# 3. 启动并绑定到 0.0.0.0 对外提供服务
Write-Host "Building done. Starting production server..." -ForegroundColor Cyan
$env:PORT = [string]$Port
$env:HOST = "0.0.0.0"
Set-Location -LiteralPath $backendDir
Write-Host ""
Write-Host "  Local:  http://127.0.0.1:$Port" -ForegroundColor Green
Write-Host "  LAN:    http://$lanIp`:$Port   (手机端同一网络可访问)" -ForegroundColor Green
Write-Host "  API:    http://127.0.0.1:$Port/api/health" -ForegroundColor Green
Write-Host ""
& $node server.mjs
