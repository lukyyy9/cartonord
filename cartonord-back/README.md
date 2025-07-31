# Cartonord Backend

Service backend pour la gestion de cartes stylisées et la génération de tilesets à partir de données GeoJSON.

## Vue d'ensemble

Ce projet permet de :

- Récupérer des données GeoJSON avec styles (couleurs, opacité, ordre de superposition, pictogrammes)
- Transformer ces données en tilesets via Tippecanoe
- Stocker et servir les tilesets aux clients

## Architecture Globale

### Services Containerisés

1. **Frontend IN PROGRESS** (React + Nginx) - Interface utilisateur
2. **Backend API IN PROGRESS** (Node + Express) - API REST
3. **Base de données IN PROGRESS** (PostgreSQL + PostGIS) - Stockage des données géospatiales
4. **Service de Tilesets IN PROGRESS** (Node + Tippecanoe) - Génération des tuiles
5. **Serveur de tuiles IN PROGRESS** (Node + Nginx) - Distribution des tuiles

### Architecture Backend

#### Structure des données

```txt
- Projets/Cartes
  ├── Métadonnées (nom, description, créateur)
  ├── Configuration de style global
  └── Couches (layers)
      ├── Données GeoJSON
      ├── Style (couleur, opacité, ordre)
      ├── Pictogrammes/symboles
      └── Métadonnées de couche
```

#### API Endpoints principaux

- `POST /api/projects` - Créer un nouveau projet
- `POST /api/projects/:id/layers` - Ajouter une couche
- `PUT /api/projects/:id/style` - Mettre à jour le style
- `POST /api/projects/:id/generate-tileset` - Déclencher la génération de tuiles
- `GET /api/projects/:id/tiles/{z}/{x}/{y}` - Servir les tuiles

#### Workflow de traitement

1. **Import** : Réception des données GeoJSON + style
2. **Validation** : Vérification de la géométrie et du style
3. **Stockage** : Sauvegarde en base (PostGIS pour les géométries)
4. **Génération** : Conversion en tileset via Tippecanoe
5. **Optimisation** : Compression et indexation des tuiles
6. **Distribution** : Mise à disposition via CDN/serveur de tuiles

## Solution Tippecanoe

### Container Custom

```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    build-essential \
    libsqlite3-dev \
    zlib1g-dev \
    git
RUN git clone https://github.com/felt/tippecanoe.git
RUN cd tippecanoe && make && make install
```

## Base de données

### Schema principal

```sql
-- Tables principales
projects (id, name, description, created_at, updated_at)
layers (id, project_id, name, geojson_data, style_config, z_index)
tilesets (id, project_id, path, version, status, created_at)
symbols (id, name, svg_data, category)
```

### Structure des fichiers

```txt
/data/
├── projects/
│   └── {project-id}/
│       ├── source/          # GeoJSON sources
│       ├── tilesets/        # Tuiles générées
│       └── metadata.json    # Configuration du projet
├── symbols/                 # Bibliothèque de pictogrammes
└── cache/                   # Cache temporaire
```

## Évolutions futures

### Itinéraires (release lointaine)

- **Service de routage** : Container OSRM ou GraphHopper
- **API unifiée** : Endpoints pour cartes ET itinéraires
- **Cache intelligent** : Optimisation des calculs d'itinéraires fréquents

#### Extensions prévues

```javascript
// API future pour itinéraires
GET /api/routing/route?start=lat,lng&end=lat,lng&profile=walking
GET /api/routing/isochrone?center=lat,lng&time=600&profile=cycling
```

## Monitoring et Performance

- **Métriques** : Temps de génération, taille des tilesets, usage
- **Logs** : Traçabilité des opérations sur les projets
- **Alertes** : Échecs de génération, espace disque
- **Backup** : Sauvegarde automatique des projets et tilesets

## Installation

```bash
# Cloner le repository
git clone <repository-url>
cd cartonord-back

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env

# Démarrer en mode développement
npm run dev
```

## Docker

```bash
# Build et lancement avec Docker Compose
docker-compose up --build

# Arrêt des services
docker-compose down
```

## Technologies

- **Backend** : Node.js, Express.js
- **Base de données** : PostgreSQL + PostGIS
- **Génération de tuiles** : Tippecanoe
- **Cache** : Redis
- **Conteneurisation** : Docker, Docker Compose
