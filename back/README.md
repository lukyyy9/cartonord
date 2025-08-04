# Cartonord Backend

Node.js/Express API server for managing geospatial maps, processing GeoJSON layers, and orchestrating tileset generation.

## Overview

The backend service provides a comprehensive REST API for managing map projects, processing GeoJSON layers, and coordinating with the tiler service for vector tile generation. It uses PostgreSQL with PostGIS for robust geospatial data storage and includes authentication, health monitoring, and map publishing capabilities.

## Features

- **Map Management**: CRUD operations for map projects with publication workflow
- **Layer Processing**: GeoJSON import, validation, and storage with styling
- **Point of Interest Management**: Custom POI management with pictogram support
- **Tileset Orchestration**: Coordination with tiler service for vector tile generation
- **Authentication**: JWT-based admin authentication system
- **Public Access**: Slug-based public map access for published maps
- **Geospatial Storage**: PostgreSQL + PostGIS for spatial data
- **Health Monitoring**: Comprehensive service health checks
- **API Documentation**: RESTful endpoints with consistent responses

## Tech Stack

- **Runtime**: Node.js 21.11.0
- **Framework**: Express.js with middleware ecosystem
- **Database**: PostgreSQL 14+ with PostGIS extension
- **ORM**: Sequelize with spatial data support
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: JSON schema validation for GeoJSON
- **Logging**: Structured logging with Winston
- **Container**: Docker with multi-stage builds

## Quick Start

### Development

```bash
cd back
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
DATABASE_URL=postgresql://cartonord_user:cartonord_password@postgres:5432/cartonord
DB_HOST=postgres
DB_PORT=5432
DB_NAME=cartonord
DB_USER=cartonord_user
DB_PASSWORD=cartonord_password

# Services
TILER_SERVICE_URL=http://host.docker.internal:3002
TILE_SERVER_URL=http://host.docker.internal:3003
PORT=3001

# Storage
DATA_DIRECTORY=/data
CACHE_DIRECTORY=/data/cache

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Environment
NODE_ENV=development
LOG_LEVEL=info

# CORS
CORS_ORIGIN=*
```

## API Endpoints

### Authentication

```http
POST   /auth/login               # Admin login
GET    /auth/me                  # Get current admin profile
POST   /auth/logout              # Admin logout
```

### Maps Management

```http
POST   /api/maps                 # Create new map
GET    /api/maps                 # List all maps
GET    /api/maps/:id             # Get map details with layers and POIs
PUT    /api/maps/:id             # Update map with layers and POIs
PATCH  /api/maps/:id/metadata    # Update map metadata (name, description, slug)
DELETE /api/maps/:id             # Delete map
POST   /api/maps/:id/publish     # Publish map (make public)
POST   /api/maps/:id/unpublish   # Unpublish map
```

### Public Access

```http
GET    /:slug                    # Get published map by slug (public)
```

### Pictograms

```http
GET    /api/pictograms           # List available pictograms
POST   /api/pictograms           # Upload new pictogram
DELETE /api/pictograms/:id       # Delete pictogram
```

### Health & Monitoring

```http
GET    /health                   # Basic health check
GET    /health/detailed          # Detailed health with dependencies
```

## Database Schema

### Core Tables

```sql
-- Maps table
CREATE TABLE maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE,
    config JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'processing', 'ready', 'published', 'tileset_error', 'error'
    )),
    tileset_path VARCHAR(255),
    tileset_id VARCHAR(255),
    tileset_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Layers table
CREATE TABLE layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID REFERENCES maps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    geojson_data JSONB NOT NULL,
    layer_type VARCHAR(50) DEFAULT 'mixed',
    style JSONB DEFAULT '{}',
    z_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Points of Interest table
CREATE TABLE points_of_interest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id UUID REFERENCES maps(id) ON DELETE CASCADE,
    layer_id UUID REFERENCES layers(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    coordinates POINT NOT NULL,
    pictogram VARCHAR(255),
    properties JSONB DEFAULT '{}',
    source_file VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Pictograms library
CREATE TABLE pictograms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100),
    svg_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Admins table
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Spatial Indexes

```sql
-- Add spatial indexes
CREATE INDEX idx_points_of_interest_coordinates ON points_of_interest USING GIST(coordinates);
CREATE INDEX idx_layers_map_id ON layers(map_id);
CREATE INDEX idx_points_of_interest_map_id ON points_of_interest(map_id);
CREATE INDEX idx_maps_slug ON maps(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_maps_status ON maps(status);
```

## Data Processing

### GeoJSON Validation

The service validates incoming GeoJSON data for:

- Valid geometry types (Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon)
- Proper coordinate systems
- Feature property consistency
- Size limitations

### Map Status Workflow

Maps follow a status workflow:

1. **draft** - Initial state when created
2. **processing** - While tileset is being generated
3. **ready** - Tileset generated successfully, ready for publication
4. **published** - Publicly accessible via slug
5. **tileset_error** - Error during tileset generation
6. **error** - General error state

### Tileset Generation

When a map is saved with layers and POIs:

1. Combined GeoJSON is generated from all layers
2. POIs are converted to Point features
3. Data is sent to the tiler service
4. Generated tileset path is stored in the map record

## Service Integration

### Tiler Service Communication

```javascript
// Example tileset generation request
const generateTileset = async (map, layers, pointsOfInterest, config) => {
  const response = await fetch(`${TILER_SERVICE_URL}/api/tileset/generate-from-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      geojson: combinedGeoJSON,
      projectId: map.id,
      layerName: `map-${map.id}`,
      minZoom: config?.minZoom || 0,
      maxZoom: config?.maxZoom || 18
    })
  });
  
  return response.json();
};
```

### Health Monitoring

The [`HealthService`](src/services/HealthService.js) provides comprehensive monitoring:

- Database connectivity via Sequelize
- Tiler service availability
- Environment configuration validation
- Directory permissions and existence

## Authentication

### JWT-based Authentication

- Admin login with username/password
- JWT tokens with configurable expiration
- Protected routes require valid JWT token
- Automatic admin creation on first startup

### Default Admin Account

```javascript
// Default admin created if no admins exist
{
  username: 'admin',
  password: 'admin123' // Change immediately in production
}
```

## Development

### Running Tests

```bash
npm test                 # Run test suite
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Database Operations

```bash
npm run db:sync         # Sync database schema
npm run db:seed         # Seed with sample data
npm run db:reset        # Reset database
```

### Debugging

```bash
DEBUG=cartonord:* npm run dev  # Enable debug logging
```

## Performance

- **Connection Pooling**: Optimized PostgreSQL connections via Sequelize
- **Query Optimization**: Spatial indexes and optimized queries
- **Async Processing**: Non-blocking tileset generation
- **JSON Storage**: Efficient JSONB storage for configurations

## Security

- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries via Sequelize
- **Password Security**: bcrypt hashing with salt rounds
- **CORS Configuration**: Controlled cross-origin access
- **JWT Security**: Secure token generation and validation

## Monitoring

- **Structured Logging**: JSON logs with correlation IDs
- **Health Endpoints**: Service dependency monitoring
- **Error Tracking**: Centralized error reporting
- **Performance Metrics**: Response time and throughput tracking

## File Structure

```txt
src/
├── config/             # Database and environment configuration
├── middlewares/        # Express middlewares (auth, logging, etc.)
├── models/            # Sequelize models and associations
├── routes/            # API route definitions
├── services/          # Business logic services
└── index.js           # Application entry point
```

## Production Deployment

### Environment Setup

1. Set strong JWT secret
2. Configure production database
3. Set appropriate CORS origins
4. Enable SSL/TLS termination
5. Configure log aggregation
6. Set up monitoring and alerting

### Health Checks

The service provides health endpoints for container orchestration:

- `/health` - Basic liveness check
- `/health/detailed` - Readiness check with dependencies