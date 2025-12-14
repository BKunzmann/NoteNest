#!/bin/bash
# Setup-Script für .env Datei (Linux/Mac)
# Generiert automatisch JWT-Secrets, wenn sie fehlen

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

echo "🔧 NoteNest Environment Setup"
echo ""

# Prüfe ob .env existiert
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  .env Datei nicht gefunden!"
    
    if [ -f "$ENV_EXAMPLE" ]; then
        echo "📋 Kopiere .env.example zu .env..."
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo "✅ .env erstellt"
    else
        echo "❌ .env.example nicht gefunden! Bitte erstelle .env manuell."
        exit 1
    fi
fi

# Funktion zum Generieren eines sicheren Secrets
generate_secret() {
    openssl rand -base64 32
}

# Prüfe und generiere JWT_SECRET falls nötig
if grep -q "^JWT_SECRET=$" "$ENV_FILE" || grep -q "^JWT_SECRET=your-.*-here$" "$ENV_FILE" || ! grep -q "^JWT_SECRET=.*[^=]$" "$ENV_FILE"; then
    echo "🔑 Generiere JWT_SECRET..."
    JWT_SECRET=$(generate_secret)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$ENV_FILE"
    fi
    echo "✅ JWT_SECRET generiert"
else
    echo "✅ JWT_SECRET bereits vorhanden"
fi

# Prüfe und generiere JWT_REFRESH_SECRET falls nötig
if grep -q "^JWT_REFRESH_SECRET=$" "$ENV_FILE" || grep -q "^JWT_REFRESH_SECRET=your-.*-here$" "$ENV_FILE" || ! grep -q "^JWT_REFRESH_SECRET=.*[^=]$" "$ENV_FILE"; then
    echo "🔑 Generiere JWT_REFRESH_SECRET..."
    JWT_REFRESH_SECRET=$(generate_secret)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" "$ENV_FILE"
    else
        # Linux
        sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET|" "$ENV_FILE"
    fi
    echo "✅ JWT_REFRESH_SECRET generiert"
else
    echo "✅ JWT_REFRESH_SECRET bereits vorhanden"
fi

echo ""
echo "📝 Nächste Schritte:"
echo "   1. Trage deinen BIBLE_API_KEY in .env ein (falls noch nicht geschehen)"
echo "   2. Passe andere Werte nach Bedarf an (NAS-Pfade, LDAP, etc.)"
echo "   3. Starte die Anwendung mit: docker-compose -f docker-compose.dev.yml up"
echo ""

