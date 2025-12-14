# Deployment-Script für NAS (PowerShell)
# Pullt die neueste Version und startet den Container neu

Write-Host "NoteNest NAS Deployment" -ForegroundColor Cyan
Write-Host ""

# Pruefe ob wir im richtigen Verzeichnis sind
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "docker-compose.yml nicht gefunden!" -ForegroundColor Red
    Write-Host "Bitte fuehre dieses Script im Projekt-Root aus." -ForegroundColor Red
    exit 1
}

# Git Pull (falls Git verwendet wird)
if (Test-Path ".git") {
    Write-Host "Pull neueste Version..." -ForegroundColor Yellow
    git pull
    Write-Host "Git Pull abgeschlossen" -ForegroundColor Green
    Write-Host ""
}

# Baue Docker Image neu
Write-Host "Baue Docker Image..." -ForegroundColor Yellow
docker-compose build
Write-Host "Build abgeschlossen" -ForegroundColor Green
Write-Host ""

# Stoppe alte Container
Write-Host "Stoppe alte Container..." -ForegroundColor Yellow
docker-compose down
Write-Host "Container gestoppt" -ForegroundColor Green
Write-Host ""

# Starte neue Container
Write-Host "Starte neue Container..." -ForegroundColor Yellow
docker-compose up -d
Write-Host "Container gestartet" -ForegroundColor Green
Write-Host ""

# Zeige Status
Write-Host "Container-Status:" -ForegroundColor Cyan
docker-compose ps
Write-Host ""

Write-Host "Deployment abgeschlossen!" -ForegroundColor Green
Write-Host ""
Write-Host "Naechste Schritte:" -ForegroundColor Cyan
Write-Host "   - Pruefe Logs: docker-compose logs -f"
Write-Host "   - Pruefe Status: docker-compose ps"
Write-Host ""

