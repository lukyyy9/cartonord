# Cartonord

![Cartonord Banner](./assets/banner.png)

A full-stack geospatial application for creating and serving custom styled vector tile maps from GeoJSON data.

## Architecture

This project consists of 4 microservices:

- **cartonord-front** - React frontend with MapLibre GL JS for map editing and visualization
- **cartonord-back** - Node.js/Express API server for data management
- **cartonord-tile-server** - Express server for serving vector tiles from MBTiles files
- **cartonord-tiler** - Microservice for generating tilesets using Tippecanoe

## Features

- Import GeoJSON layers with custom styling (colors, opacity, z-index)
- Interactive map editor with point of interest management
- Vector tile generation and serving
- PostgreSQL + PostGIS for geospatial data storage
- Docker containerized deployment

## Quick Start

1. **Clone and setup**

   ```bash
   git clone <repository-url>
   cd cartonord
   ```

2. **Run with Docker**

   ```bash
   docker-compose up --build
   ```

3. **Access the application**

   - Frontend: <http://localhost:5173>
   - Backend API: <http://localhost:3001>
   - Tile Server: <http://localhost:3003>

## Development

### Frontend

```bash
cd cartonord-front
npm install
npm run dev
```

### Backend

```bash
cd cartonord-back
npm install
npm run dev
```

### Tile Server

```bash
cd cartonord-tile-server
npm install
npm run dev
```

## API Endpoints

### Backend API (Port 3001)

- `POST /api/projects` - Create new map project
- `POST /api/projects/:id/layers` - Add GeoJSON layer
- `PUT /api/projects/:id/style` - Update styling
- `POST /api/projects/:id/generate-tileset` - Generate vector tiles

### Tile Server (Port 3003)

- `GET /tiles/{project-id}/{z}/{x}/{y}.pbf` - Serve vector tiles
- `GET /tiles/{project-id}/metadata` - Get tileset metadata
- `GET /projects` - List available projects

## Tech Stack

- **Frontend**: React, MapLibre GL JS, Vite
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL + PostGIS
- **Tile Generation**: Tippecanoe
- **Containerization**: Docker, Docker Compose

## Environment Variables

Check individual service README files for specific configuration options.

## Data Flow

1. Import GeoJSON data via frontend
2. Backend processes and stores data in PostgreSQL
3. Tiler service generates MBTiles using Tippecanoe
4. Tile server serves vector tiles to map clients
5. Frontend displays styled maps using
