param(
  [int]$BackendPort = 3001,
  [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

function Stop-Port($port) {
  $pids = @()

  foreach ($line in (& netstat -ano)) {
    if ($line -match ":${port}\s+.*LISTENING\s+(\d+)") {
      $pids += [int]$Matches[1]
    }
  }

  foreach ($processId in ($pids | Sort-Object -Unique)) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
      Write-Host "Stopping process $processId on port $port..."
      Stop-Process -Id $processId -Force
    }
  }
}

Stop-Port $BackendPort
Stop-Port $FrontendPort
Write-Host "Stopped."
