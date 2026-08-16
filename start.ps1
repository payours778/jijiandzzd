param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root "frontend"

Set-Location -LiteralPath $frontend

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

  throw "Node.js was not found. Install Node.js or open this project inside Codex."
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

  throw "pnpm was not found. Install pnpm or open this project inside Codex."
}

$node = Resolve-Node
$pnpm = Resolve-Pnpm
$nodeDir = Split-Path -Parent $node
$env:PATH = "$nodeDir;$env:PATH"

if (-not (Test-Path -LiteralPath (Join-Path $frontend "node_modules"))) {
  Write-Host "Installing frontend dependencies..."
  & $pnpm install
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Write-Host "Starting Mini Playbox frontend..."
& $pnpm dev --host 127.0.0.1 --port $Port
exit $LASTEXITCODE
