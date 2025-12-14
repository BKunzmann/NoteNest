# Setup-Script fuer .env Datei
# Generiert automatisch JWT-Secrets, wenn sie fehlen

$envFile = ".env"
$envExample = ".env.example"

Write-Host "NoteNest Environment Setup" -ForegroundColor Cyan
Write-Host ""

# Pruefe ob .env existiert
if (-not (Test-Path $envFile)) {
    Write-Host ".env Datei nicht gefunden!" -ForegroundColor Yellow
    
    if (Test-Path $envExample) {
        Write-Host "Kopiere .env.example zu .env..." -ForegroundColor Green
        Copy-Item $envExample $envFile
        Write-Host ".env erstellt" -ForegroundColor Green
    } else {
        Write-Host ".env.example nicht gefunden! Bitte erstelle .env manuell." -ForegroundColor Red
        exit 1
    }
}

# Lese .env Datei zeilenweise
$envLines = Get-Content $envFile
$needsUpdate = $false

# Funktion zum Generieren eines sicheren Secrets
function Generate-Secret {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    return [Convert]::ToBase64String($bytes)
}

# Pruefe und aktualisiere JWT_SECRET
for ($i = 0; $i -lt $envLines.Length; $i++) {
    if ($envLines[$i] -match "^JWT_SECRET=(.*)$") {
        $currentValue = $matches[1].Trim()
        if ([string]::IsNullOrWhiteSpace($currentValue) -or $currentValue -eq "your-super-secret-jwt-key-here") {
            Write-Host "Generiere JWT_SECRET..." -ForegroundColor Yellow
            $newSecret = Generate-Secret
            $envLines[$i] = "JWT_SECRET=$newSecret"
            $needsUpdate = $true
            Write-Host "JWT_SECRET generiert" -ForegroundColor Green
        } else {
            Write-Host "JWT_SECRET bereits vorhanden" -ForegroundColor Green
        }
        break
    }
}

# Pruefe und aktualisiere JWT_REFRESH_SECRET
for ($i = 0; $i -lt $envLines.Length; $i++) {
    if ($envLines[$i] -match "^JWT_REFRESH_SECRET=(.*)$") {
        $currentValue = $matches[1].Trim()
        if ([string]::IsNullOrWhiteSpace($currentValue) -or $currentValue -eq "your-super-secret-refresh-key-here") {
            Write-Host "Generiere JWT_REFRESH_SECRET..." -ForegroundColor Yellow
            $newSecret = Generate-Secret
            $envLines[$i] = "JWT_REFRESH_SECRET=$newSecret"
            $needsUpdate = $true
            Write-Host "JWT_REFRESH_SECRET generiert" -ForegroundColor Green
        } else {
            Write-Host "JWT_REFRESH_SECRET bereits vorhanden" -ForegroundColor Green
        }
        break
    }
}

# Speichere .env wenn Aenderungen vorgenommen wurden
if ($needsUpdate) {
    Write-Host ""
    Write-Host "Speichere .env..." -ForegroundColor Yellow
    $envLines | Set-Content $envFile -Encoding UTF8
    Write-Host ".env aktualisiert" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Alle Secrets vorhanden, keine Aenderungen noetig" -ForegroundColor Green
}

Write-Host ""
Write-Host "Naechste Schritte:" -ForegroundColor Cyan
Write-Host "   1. Trage deinen BIBLE_API_KEY in .env ein (falls noch nicht geschehen)"
Write-Host "   2. Passe andere Werte nach Bedarf an (NAS-Pfade, LDAP, etc.)"
Write-Host "   3. Starte die Anwendung mit: docker-compose -f docker-compose.dev.yml up"
Write-Host ""
