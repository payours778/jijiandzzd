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
$nodeDir = Split-Path -Parent $node
$env:PATH = "$nodeDir;$env:PATH"

if (-not (Test-Path -LiteralPath $frontendDist)) {
  Write-Host "Frontend build not found. Building production frontend..."
  $pnpm = Resolve-Pnpm
  Push-Location $frontendDir
  & $pnpm install
  if ($LASTEXITCODE -ne 0) {
    Pop-Location
    exit $LASTEXITCODE
  }
  & $pnpm build
  if ($LASTEXITCODE -ne 0) {
    Pop-Location
    exit $LASTEXITCODE
  }
  Pop-Location
}

Write-Host "Starting Mini Playbox on http://127.0.0.1:$Port"
$env:PORT = [string]$Port
Set-Location -LiteralPath $backendDir
& $node server.mjs
