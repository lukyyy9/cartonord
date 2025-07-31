FROM node:22.11.0-alpine

# Installation des dépendances système pour PostGIS
RUN apk add --no-cache postgresql-client

# Création du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du code source
COPY . .

# Création des répertoires de données
RUN mkdir -p /data/projects /data/cache

# Exposition du port
EXPOSE 3001

# Commande de démarrage
CMD ["node", "--max-old-space-size=4096", "src/index.js"]