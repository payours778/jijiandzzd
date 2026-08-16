param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"

$listeningProcessIds = @()
$netstatOutput = & netstat -ano

foreach ($line in $netstatOutput) {
  if ($line -match ":${Port}\s+.*LISTENING\s+(\d+)") {
    $listeningProcessIds += [int]$Matches[1]
  }
}

$listeningProcessIds = $listeningProcessIds | Sort-Object -Unique

if ($listeningProcessIds.Count -eq 0) {
  Write-Host "No Mini Playbox dev server is listening on port $Port."
  exit 0
}

foreach ($processId in $listeningProcessIds) {
  $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

  if ($process) {
    Write-Host "Stopping Mini Playbox dev server (PID $processId)..."
    Stop-Process -Id $processId -Force
  }
}

Write-Host "Stopped."
