# Cartonord Backend

Node.js/Express API server for managing geospatial data, projects, and orchestrating tileset generation.

## Overview

The backend service provides a comprehensive REST API for managing map projects, processing GeoJSON layers, and coordinating with the tiler service for vector tile generation. It uses PostgreSQL with PostGIS for robust geospatial data storage and includes health monitoring capabilities.

## Features

- **Project Management**: CRUD operations for map projects
- **Layer Processing**: GeoJSON import, validation, and storage
- **Style Management**: Custom styling configuration for layers
- **Tileset Orchestration**: Coordination with tiler service for tile generation
- **Geospatial Storage**: PostgreSQL + PostGIS for spatial data
- **Health Monitoring**: Comprehensive service health checks
- **API Documentation**: RESTful endpoints with consistent responses

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with middleware ecosystem
- **Database**: PostgreSQL 14+ with PostGIS extension
- **ORM**: Native SQL queries with pg library
- **Validation**: JSON schema validation for GeoJSON
- **Logging**: Structured logging with Winston
- **Container**: Docker with multi-stage builds

## Quick Start

### Development

```bash
cd cartonord-back
npm install
cp .env.example .env
npm run dev
```

### Database Setup

```bash
# Using Docker Compose (recommended)
docker-compose up postgres

# Manual PostgreSQL setup
createdb cartonord
psql cartonord -c "CREATE EXTENSION postgis;"
```

## Configuration

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cartonord
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cartonord
DB_USER=cartonord
DB_PASSWORD=password

# Services
TILER_SERVICE_URL=http://localhost:3002
TILE_SERVER_URL=http://localhost:3003
PORT=3001

# Storage
DATA_DIRECTORY=/data
CACHE_DIRECTORY=/data/cache

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

## API Endpoints

### Projects

```http
POST   /api/projects              # Create new project
GET    /api/projects              # List all projects
GET    /api/projects/:id          # Get project details
PUT    /api/projects/:id          # Update project
DELETE /api/projects/:id          # Delete project
```

### Layers

```http
POST   /api/projects/:id/layers   # Add layer to project
GET    /api/projects/:id/layers   # Get project layers
PUT    /api/layers/:layerId       # Update layer
DELETE /api/layers/:layerId       # Delete layer
```

### Styling

```http
PUT    /api/projects/:id/style    # Update project style
GET    /api/projects/:id/style    # Get project style
PUT    /api/layers/:id/style      # Update layer style
```

### Tileset Management

```http
POST   /api/projects/:id/generate-tileset  # Generate tileset
GET    /api/projects/:id/tileset-status    # Check generation status
DELETE /api/projects/:id/tileset           # Delete tileset
```

### Health & Monitoring

```http
GET    /health                    # Basic health check
GET    /health/detailed          # Detailed health with dependencies
```

## Database Schema

### Core Tables

```sql
-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    style_config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Layers table
CREATE TABLE layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    geojson_data JSONB NOT NULL,
    style_config JSONB DEFAULT '{}',
    z_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tilesets table
CREATE TABLE tilesets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    file_path VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Symbols library
CREATE TABLE symbols (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    svg_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Spatial Indexes

```sql
-- Add spatial columns and indexes for layers
ALTER TABLE layers ADD COLUMN geom GEOMETRY;
CREATE INDEX idx_layers_geom ON layers USING GIST(geom);
CREATE INDEX idx_layers_project_id ON layers(project_id);
CREATE INDEX idx_projects_created_at ON projects(created_at);
```

## Data Processing

### GeoJSON Validation

The service validates incoming GeoJSON data for:

- Valid geometry types
- Proper coordinate systems
- Feature property consistency
- Size limitations

### Spatial Operations

PostGIS functions used for:

- Geometry validation and repair
- Coordinate transformation
- Spatial indexing
- Bounding box calculation

## Service Integration

### Tiler Service Communication

```javascript
// Example tileset generation request
const generateTileset = async (projectId) => {
  const response = await fetch(`${TILER_SERVICE_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      outputPath: `/data/tilesets/${projectId}.mbtiles`,
      maxZoom: 14,
      minZoom: 0
    })
  });
  
  return response.json();
};
```

### Health Monitoring

The [`HealthService`](src/services/HealthService.js) provides comprehensive monitoring:

- Database connectivity
- Tiler service availability
- File system permissions
- Environment configuration

## Development

### Running Tests

```bash
npm test                 # Run test suite
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Database Migrations

```bash
npm run migrate:up      # Apply migrations
npm run migrate:down    # Rollback migrations
npm run migrate:create  # Create new migration
```

### Debugging

```bash
DEBUG=cartonord:* npm run dev  # Enable debug logging
```

## Performance

- **Connection Pooling**: Optimized PostgreSQL connections
- **Query Optimization**: Spatial indexes and optimized queries
- **Caching**: Redis for frequently accessed data
- **Async Processing**: Non-blocking tileset generation

## Security

- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Controlled cross-origin access
- **Rate Limiting**: API endpoint protection

## Monitoring

- **Structured Logging**: JSON logs with correlation IDs
- **Health Endpoints**: Service dependency monitoring
- **Metrics**: Performance and usage tracking
- **Error Tracking**: Centralized error reporting
