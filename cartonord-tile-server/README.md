# Cartonord Tile Server

Serveur de tuiles vectorielles pour la distribution des tilesets générés par Cartonord.

## Architecture

Ce service utilise Express.js pour servir les tuiles vectorielles depuis des fichiers `.mbtiles` générés par Tippecanoe.

### Fonctionnalités

- **Distribution de tuiles** : Endpoint `/tiles/{project}/{z}/{x}/{y}.pbf`
- **Extraction SQLite** : Lit les tuiles directement depuis les fichiers `.mbtiles`
- **Cache HTTP** : Headers optimisés pour la mise en cache
- **Métadonnées** : Endpoint pour récupérer les informations des tilesets
- **Health check** : Monitoring de l'état du service

## API Endpoints

### Tuiles vectorielles

```http
GET /tiles/{project-id}/{z}/{x}/{y}.pbf
```

Retourne une tuile vectorielle au format Protocol Buffers (PBF).

**Paramètres :**

- `project-id` : Identifiant du projet
- `z` : Niveau de zoom
- `x` : Coordonnée X de la tuile
- `y` : Coordonnée Y de la tuile

**Headers de réponse :**

- `Content-Type: application/x-protobuf`
- `Content-Encoding: gzip`
- `Cache-Control: public, max-age=3600`

### Métadonnées

```http
GET /tiles/{project-id}/metadata
```

Retourne les métadonnées du tileset.

### Liste des projets

```http
GET /projects
```

Retourne la liste des projets disponibles.

### Health check

```http
GET /health
```

Vérification de l'état du service.

## Configuration

### Variables d'environnement

- `PORT` : Port d'écoute (défaut: 3003)
- `TILES_DIRECTORY` : Répertoire des fichiers .mbtiles (défaut: /data/tilesets)
- `NODE_ENV` : Environnement (production|development)

### Structure des fichiers

```
/data/tilesets/
├── project-1.mbtiles
├── project-2.mbtiles
└── project-n.mbtiles
```

## Installation

### Développement local

```bash
cd cartonord-tile-server
npm install
npm run dev
```

### Docker

```bash
docker build -t cartonord-tile-server .
docker run -p 3003:3003 -v /path/to/tilesets:/data/tilesets cartonord-tile-server
```

## Intégration avec MapLibre

### Configuration du style MapLibre

```javascript
const mapStyle = {
  version: 8,
  sources: {
    'cartonord-tiles': {
      type: 'vector',
      tiles: ['http://localhost:3003/tiles/{project-id}/{z}/{x}/{y}.pbf'],
      minzoom: 0,
      maxzoom: 14
    }
  },
  layers: [
    // Vos couches ici
  ]
};
```

### Exemple d'utilisation

```javascript
import maplibregl from 'maplibre-gl';

const map = new maplibregl.Map({
  container: 'map',
  style: mapStyle,
  center: [2.3522, 48.8566],
  zoom: 10
});
```

## Format MBTiles

Le service lit les fichiers `.mbtiles` générés par Tippecanoe. Ces fichiers sont des bases de données SQLite contenant :

- **Table `tiles`** : Données des tuiles (zoom_level, tile_column, tile_row, tile_data)
- **Table `metadata`** : Métadonnées du tileset (name, format, bounds, etc.)

### Conversion TMS ↔ XYZ

Les coordonnées Y sont automatiquement converties du système TMS (utilisé par MBTiles) vers XYZ (utilisé par les clients web).

## Performance

- **Cache HTTP** : Les tuiles sont mises en cache pendant 1 heure
- **Compression** : Les tuiles sont servies avec compression gzip
- **SQLite optimisé** : Lecture rapide des tuiles via index

## Monitoring

### Logs

Le service produit des logs pour :
- Requêtes de tuiles
- Erreurs d'accès aux fichiers
- Performance des requêtes SQLite

### Métriques recommandées

- Nombre de requêtes par seconde
- Temps de réponse moyen
- Taille des fichiers .mbtiles
- Utilisation du cache

## Évolutions futures

- **Cache Redis** : Mise en cache des tuiles fréquemment demandées
- **Compression Brotli** : Alternative à gzip pour une meilleure compression
- **CDN** : Distribution via CDN pour les gros volumes
- **PMTiles** : Support du format PMTiles pour de meilleures performances