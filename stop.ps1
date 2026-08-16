param(
  [int]$Port = 3001
)

$ErrorActionPreference = "Stop"

$pids = @()

foreach ($line in (& netstat -ano)) {
  if ($line -match ":${Port}\s+.*LISTENING\s+(\d+)") {
    $pids += [int]$Matches[1]
  }
}

foreach ($processId in ($pids | Sort-Object -Unique)) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
  if ($process) {
    Write-Host "Stopping process $processId on port $Port..."
    Stop-Process -Id $processId -Force
  }
}

Write-Host "Stopped."
