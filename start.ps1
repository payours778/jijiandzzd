param(
  [int]$BackendPort = 3001,
  [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

function Resolve-Node {
  $command = Get-Command node -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"),
    (Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\node.exe")
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "Node.js was not found."
}

function Resolve-Pnpm {
  $command = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $fallback = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
  if (Test-Path -LiteralPath $fallback) {
    return $fallback
  }

  throw "pnpm was not found."
}

$node = Resolve-Node
$pnpm = Resolve-Pnpm
$nodeDir = Split-Path -Parent $node
$env:PATH = "$nodeDir;$env:PATH"

if (-not (Test-Path -LiteralPath (Join-Path $frontendDir "node_modules"))) {
  Write-Host "Installing frontend dependencies..."
  Push-Location $frontendDir
  & $pnpm install
  if ($LASTEXITCODE -ne 0) {
    Pop-Location
    exit $LASTEXITCODE
  }
  Pop-Location
}

Write-Host "Starting backend on port $BackendPort..."
$env:PORT = [string]$BackendPort
$backendProcess = Start-Process -FilePath $node -ArgumentList "server.mjs" -WorkingDirectory $backendDir -WindowStyle Hidden -PassThru

$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 350
  try {
    $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$BackendPort/api/health" -TimeoutSec 2
    if ($response.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
    # Keep waiting until the backend is ready.
  }
}

if (-not $ready) {
  Write-Error "Backend did not become ready."
  exit 1
}

Write-Host "Backend ready: http://127.0.0.1:$BackendPort"
Write-Host "Starting frontend on port $FrontendPort..."

Set-Location -LiteralPath $frontendDir
& $pnpm dev --host 127.0.0.1 --port $FrontendPort
