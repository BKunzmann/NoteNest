# Setup-Anleitung (PowerShell)

## PowerShell-Befehle

**Wichtig**: PowerShell verwendet `;` statt `&&` für Befehlsverkettung.

### Dependencies installieren

```powershell
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

**Oder in einem Befehl:**
```powershell
cd backend; npm install; cd ..; cd frontend; npm install; cd ..
```

### Entwicklung starten

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Docker-Entwicklung

```powershell
docker-compose -f docker-compose.dev.yml up
```

### .env Datei erstellen

```powershell
# .env.example kopieren
Copy-Item .env.example .env

# .env bearbeiten (mit Editor deiner Wahl)
notepad .env
```

### JWT-Secrets generieren

```powershell
# Mit OpenSSL (wenn installiert)
openssl rand -base64 32

# Oder mit PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
```

