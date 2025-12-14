#!/bin/sh
# Docker Entrypoint Script (Shell-Variante als Fallback)
# Ruft das Node.js Entrypoint-Script auf

set -e

echo "🔧 NoteNest Docker Entrypoint (Shell)"
echo ""

# Führe Node.js Entrypoint aus
node /app/scripts/docker-entrypoint.js "$@"

# Starte den eigentlichen Befehl
exec "$@"

