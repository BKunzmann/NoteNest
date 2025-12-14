# Monitoring & Log-Analyse Setup

## ✅ Implementiert

### 1. Prometheus Metrics ✅

**Endpoint**: `GET /api/metrics`

**Verfügbare Metriken**:
- `notenest_http_request_duration_seconds` - HTTP-Request-Dauer
- `notenest_http_requests_total` - Gesamtanzahl HTTP-Requests
- `notenest_active_users` - Anzahl aktiver Benutzer
- `notenest_db_query_duration_seconds` - Datenbank-Query-Dauer
- `notenest_bible_api_calls_total` - Bible API Calls
- `notenest_file_operations_total` - Dateioperationen
- `notenest_rate_limit_hits_total` - Rate-Limit-Überschreitungen
- `notenest_export_operations_total` - Export-Operationen
- `notenest_errors_total` - Fehler nach Typ

**Standard-Metriken** (automatisch):
- CPU-Nutzung
- Memory-Nutzung
- Event Loop Lag
- etc.

### 2. Log-Analyse ✅

**Endpoint**: `GET /api/metrics/log-report?days=7`

**Features**:
- Analysiert Log-Dateien der letzten N Tage
- Statistiken nach Level (error, warn, info, debug)
- Top 10 Fehler
- Statistiken nach Endpoint
- Error-Typ-Analyse

**Datei**: `backend/src/utils/logAnalyzer.ts`

### 3. Erweiterte Tests ✅

**Unit-Tests**:
- `rateLimit.middleware.test.ts` - Rate Limiting Tests
- `logger.test.ts` - Logger Tests
- `auth.service.test.ts` - Auth Service Tests

**Integration-Tests**:
- `health.integration.test.ts` - Health-Check Tests
- `auth.integration.test.ts` - Auth Flow Tests

## 📊 Verwendung

### Prometheus Metrics abrufen

```bash
# Metriken abrufen
curl http://localhost:3000/api/metrics

# Beispiel-Output:
# notenest_http_requests_total{method="GET",route="/api/health",status_code="200"} 42
# notenest_http_request_duration_seconds{method="GET",route="/api/health",status_code="200",le="0.1"} 40
# ...
```

### Log-Analyse abrufen

```bash
# Log-Report für letzte 7 Tage
curl http://localhost:3000/api/metrics/log-report

# Log-Report für letzte 30 Tage
curl http://localhost:3000/api/metrics/log-report?days=30
```

### Tests ausführen

```bash
# Alle Tests
npm test

# Nur Unit-Tests
npm test -- --testPathPattern=unit

# Nur Integration-Tests
npm test -- --testPathPattern=integration

# Mit Coverage
npm test -- --coverage
```

## 🔧 Prometheus Setup

### Prometheus konfigurieren

**prometheus.yml**:
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'notenest'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

### Grafana Dashboard

**Empfohlene Dashboards**:
1. **HTTP Requests**: Request-Rate, Duration, Status Codes
2. **Error Rate**: Fehlerrate nach Typ und Endpoint
3. **Rate Limiting**: Rate-Limit-Hits nach Limiter
4. **Database Performance**: Query-Dauer, Query-Anzahl
5. **System Resources**: CPU, Memory, Disk

**Beispiel-Queries**:
```promql
# Request-Rate pro Minute
rate(notenest_http_requests_total[1m])

# Durchschnittliche Request-Dauer
rate(notenest_http_request_duration_seconds_sum[5m]) / rate(notenest_http_request_duration_seconds_count[5m])

# Error-Rate
rate(notenest_errors_total[5m])

# Rate-Limit-Hits
rate(notenest_rate_limit_hits_total[5m])
```

## 📈 Log-Analyse

### Manuelle Analyse

```typescript
import { analyzeLogs, generateLogReport } from './utils/logAnalyzer';

// Analysiere Logs der letzten 7 Tage
const stats = analyzeLogs('./logs', 7);
console.log(stats);

// Generiere Report
const report = generateLogReport('./logs', 7);
console.log(report);
```

### Automatische Log-Analyse

**Option 1: Cron-Job**
```bash
# Täglich um 2 Uhr morgens
0 2 * * * curl http://localhost:3000/api/metrics/log-report > /var/log/notenest/daily-report.txt
```

**Option 2: ELK Stack**
- Logstash: Liest Log-Dateien
- Elasticsearch: Speichert und indexiert Logs
- Kibana: Visualisierung und Analyse

**Option 3: Grafana Loki**
- Sammelt Logs
- Integriert mit Grafana
- Log-Queries in Grafana

## 🚨 Alerting

### Prometheus Alerting Rules

**alerts.yml**:
```yaml
groups:
  - name: notenest_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(notenest_errors_total[5m]) > 10
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: DatabaseSlow
        expr: rate(notenest_db_query_duration_seconds_sum[5m]) > 1
        for: 5m
        annotations:
          summary: "Database queries are slow"
          
      - alert: RateLimitExceeded
        expr: rate(notenest_rate_limit_hits_total[5m]) > 5
        for: 1m
        annotations:
          summary: "Rate limit frequently exceeded"
```

### Alertmanager

**alertmanager.yml**:
```yaml
route:
  receiver: 'email'
  
receivers:
  - name: 'email'
    email_configs:
      - to: 'admin@example.com'
        from: 'alerts@example.com'
        smarthost: 'smtp.example.com:587'
```

## 📝 Best Practices

### 1. Metriken-Labels

**Gut**:
```typescript
httpRequestTotal.inc({
  method: 'POST',
  route: '/api/files/create',
  status_code: '201',
});
```

**Schlecht**:
```typescript
// Zu viele Labels = zu viele Metriken
httpRequestTotal.inc({
  method: 'POST',
  route: '/api/files/create',
  status_code: '201',
  userId: '123', // ❌ Zu spezifisch
  ip: '192.168.1.1', // ❌ Zu spezifisch
});
```

### 2. Log-Struktur

**Gut**:
```typescript
logInfo('File created', {
  userId: 1,
  filePath: '/test.md',
  fileType: 'private',
});
```

**Schlecht**:
```typescript
// Unstrukturiert
console.log(`User ${userId} created file ${filePath}`);
```

### 3. Error-Logging

**Gut**:
```typescript
logError('Failed to save file', error, {
  userId: 1,
  filePath: '/test.md',
  operation: 'create',
});
```

**Schlecht**:
```typescript
// Keine Kontext-Informationen
logError('Error', error);
```

## 🔍 Troubleshooting

### Metriken werden nicht angezeigt

1. Prüfe, ob `/api/metrics` erreichbar ist
2. Prüfe Prometheus-Konfiguration
3. Prüfe Logs auf Fehler

### Log-Analyse funktioniert nicht

1. Prüfe, ob Log-Verzeichnis existiert
2. Prüfe Dateiberechtigungen
3. Prüfe Log-Dateiformat (muss JSON sein)

### Tests schlagen fehl

1. Prüfe, ob Datenbank initialisiert ist
2. Prüfe Test-Setup (`src/tests/setup.ts`)
3. Prüfe Jest-Konfiguration (`jest.config.js`)

## 📚 Weitere Ressourcen

- [Prometheus Dokumentation](https://prometheus.io/docs/)
- [Grafana Dokumentation](https://grafana.com/docs/)
- [Winston Dokumentation](https://github.com/winstonjs/winston)
- [Jest Dokumentation](https://jestjs.io/docs/getting-started)

