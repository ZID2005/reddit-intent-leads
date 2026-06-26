# start_scheduler.ps1
# --------------------
# Starts the SignalRadar automated pipeline scheduler.
# Run from the project root:  .\start_scheduler.ps1

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "   SignalRadar — Automated Lead Refresh Scheduler" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Listening on : http://localhost:8000" -ForegroundColor Green
Write-Host "  API docs     : http://localhost:8000/docs" -ForegroundColor Green
Write-Host "  Stop         : Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Activate virtual environment if it exists
if (Test-Path "venv\Scripts\Activate.ps1") {
    & "venv\Scripts\Activate.ps1"
}

# Run scheduler from project root so Python resolves backend.* imports correctly
python -m backend.app_entry
