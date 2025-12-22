# Stage 1: Frontend Build
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Verwende npm install (lock file könnte nicht synchron sein)
RUN npm install
COPY frontend/ .
# Build
RUN npm run build

# Stage 2: Backend Build
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
# Verwende npm install (lock file könnte nicht synchron sein)
RUN npm install
COPY backend/ .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Installiere Puppeteer Dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Copy built files
COPY --from=frontend-builder /app/frontend/build ./frontend/build
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/package*.json ./backend/

# Copy Bibel-Datenbank (lokal)
COPY data/bibles/*.json ./data/bibles/

# Copy Entrypoint Script
COPY scripts/docker-entrypoint.js ./scripts/
COPY scripts/docker-entrypoint.sh ./scripts/
RUN chmod +x ./scripts/docker-entrypoint.sh

# Create data directory
RUN mkdir -p /data/users /data/database /app/logs

EXPOSE 3000

# Verwende Entrypoint-Script
ENTRYPOINT ["node", "/app/scripts/docker-entrypoint.js"]
CMD ["node", "backend/dist/index.js"]

