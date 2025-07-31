FROM ubuntu:22.04

# Installation des dépendances système
RUN apt-get update && apt-get install -y \
    build-essential \
    libsqlite3-dev \
    zlib1g-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Installation de Node.js 22.11.0
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs

# Vérification de la version Node.js installée
RUN node -v && npm -v

# Installation de Tippecanoe
RUN git clone https://github.com/felt/tippecanoe.git \
    && cd tippecanoe \
    && make \
    && make install \
    && cd .. \
    && rm -rf tippecanoe

# Création du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration
COPY package*.json ./

# Installation des dépendances Node.js
RUN npm install

# Copie du code source
COPY . .

# Création des répertoires de données
RUN mkdir -p /data/tilesets /data/temp /data/logs

# Exposition du port
EXPOSE 3002

# Commande de démarrage
CMD ["npm", "start"]