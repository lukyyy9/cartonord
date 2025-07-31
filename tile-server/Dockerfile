FROM node:22.11.0-alpine

WORKDIR /app

# Installation des dépendances système pour sqlite3
RUN apk add --no-cache python3 make g++

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances Node.js
RUN npm ci --only=production

# Copie du code source
COPY src/ ./src/

# Création du répertoire pour les tilesets
RUN mkdir -p /data/tilesets

# Variables d'environnement
ENV NODE_ENV=production
ENV PORT=3003
ENV TILES_DIRECTORY=/data/tilesets

# Exposition du port
EXPOSE 3003

# Utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cartonord -u 1001
RUN chown -R cartonord:nodejs /app /data
USER cartonord

# Commande de démarrage
CMD ["npm", "start"]
