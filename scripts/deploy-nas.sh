#!/bin/bash
# Deployment-Script für NAS
# Pullt die neueste Version und startet den Container neu

set -e

echo "🚀 NoteNest NAS Deployment"
echo ""

# Prüfe ob wir im richtigen Verzeichnis sind
if [ -f "docker-compose.yml" ]; then
    COMPOSE_FILE="docker-compose.yml"
elif [ -f "docker-compose.example.yml" ]; then
    COMPOSE_FILE="docker-compose.example.yml"
else
    echo "❌ Keine docker-compose Datei gefunden!"
    echo "   Erwartet: docker-compose.yml oder docker-compose.example.yml"
    echo "   Bitte führe dieses Script im Projekt-Root aus."
    exit 1
fi

# Git Pull (falls Git verwendet wird)
if [ -d ".git" ]; then
    echo "📥 Pull neueste Version..."
    git pull
    echo "✅ Git Pull abgeschlossen"
    echo ""
fi

# Baue Docker Image neu
echo "🔨 Baue Docker Image..."
docker-compose -f "$COMPOSE_FILE" build
echo "✅ Build abgeschlossen"
echo ""

# Stoppe alte Container
echo "🛑 Stoppe alte Container..."
docker-compose -f "$COMPOSE_FILE" down
echo "✅ Container gestoppt"
echo ""

# Starte neue Container
echo "🚀 Starte neue Container..."
docker-compose -f "$COMPOSE_FILE" up -d
echo "✅ Container gestartet"
echo ""

# Zeige Logs
echo "📋 Container-Status:"
docker-compose -f "$COMPOSE_FILE" ps
echo ""

echo "✅ Deployment abgeschlossen!"
echo ""
echo "📝 Nächste Schritte:"
echo "   - Prüfe Logs: docker-compose logs -f"
echo "   - Prüfe Status: docker-compose ps"
echo ""

