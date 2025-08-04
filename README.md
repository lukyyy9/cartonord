# Cartonord

![Cartonord Banner](./assets/banner.png)

A full-stack geospatial application for creating and serving custom styled vector tile maps from GeoJSON data.

## Architecture

This project consists of 4 microservices:

- **front** - React frontend with MapLibre GL JS for map editing (admin) and visualization (user)
- **back** - Node.js/Express microservice for maps management and authentication
- **tile-server** - Node.js/Express microservice for serving vector tiles from MBTiles files
- **tiler** - Node.js/Express microservice for generating tilesets using Tippecanoe

## Features

- **Interactive Map Editor**: Import GeoJSON layers with custom styling (colors, opacity, z-index)
- **Point of Interest Management**: Add, edit, and manage POIs with custom pictograms
- **Map Publishing Workflow**: Draft → Ready → Published status management
- **Vector Tile Generation**: Automatic tileset generation using Tippecanoe
- **Public Map Access**: Slug-based public access to published maps
- **Admin Authentication**: JWT-based authentication system
- **Geospatial Storage**: PostgreSQL + PostGIS for robust spatial data management
- **Docker Containerized**: Complete containerized deployment

## Quick Start

To run the application:

```bash
docker-compose up -d
```

## API Endpoints

### Backend API (Port 3001)

#### Authentication

- `POST /auth/login` - Admin login
- `GET /auth/me` - Get current admin profile
- `POST /auth/logout` - Admin logout

#### Maps Management

- `POST /api/maps` - Create new map
- `GET /api/maps` - List all maps
- `GET /api/maps/:id` - Get map details with layers and POIs
- `PUT /api/maps/:id` - Update map with layers and POIs
- `PATCH /api/maps/:id/metadata` - Update map metadata (name, description, slug)
- `DELETE /api/maps/:id` - Delete map
- `POST /api/maps/:id/publish` - Publish map (make public)
- `POST /api/maps/:id/unpublish` - Unpublish map

#### Public Access

- `GET /:slug` - Get published map by slug (public)

#### Pictograms

- `GET /api/pictograms` - List available pictograms
- `POST /api/pictograms` - Upload new pictogram
- `DELETE /api/pictograms/:id` - Delete pictogram

### Tiler Service (Port 3002)

- `POST /api/tileset/generate` - Generate tileset from uploaded GeoJSON file
- `POST /api/tileset/generate-from-data` - Generate tileset from GeoJSON data (used by backend)
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with Tippecanoe status

### Tile Server (Port 3003)

- `GET /tiles/{project-id}/{z}/{x}/{y}.pbf` - Serve vector tiles
- `GET /tiles/{project-id}/metadata` - Get tileset metadata
- `GET /projects` - List available projects
- `GET /health` - Health check

## Tech Stack

- **Frontend**: React 18, MapLibre GL JS, Vite, Nginx
- **Backend**: Node.js, Express.js, Sequelize ORM
- **Database**: PostgreSQL 14+ with PostGIS extension
- **Tile Generation**: Node.js, Tippecanoe
- **Authentication**: JWT tokens with bcrypt password hashing
- **Containerization**: Docker with multi-stage builds

## Data Flow

1. **Import**: Admin imports GeoJSON data via the frontend map editor
2. **Processing**: Backend validates and stores data in PostgreSQL with PostGIS
3. **Styling**: Admin applies custom colors, opacity, and manages layer ordering
4. **POI Management**: Points of interest are extracted and can be assigned pictograms
5. **Tileset Generation**: Tiler service generates MBTiles using Tippecanoe when map is saved
6. **Publishing**: Maps can be published with custom slugs for public access
7. **Serving**: Tile server serves vector tiles to MapLibre GL JS clients
8. **Visualization**: Published maps are publicly accessible via clean URLs

## Map Status Workflow

Maps follow a status workflow:

1. **draft** - Initial state when created
2. **processing** - While tileset is being generated
3. **ready** - Tileset generated successfully, ready for publication
4. **published** - Publicly accessible via slug
5. **tileset_error** - Error during tileset generation
6. **error** - General error state

## Environment Variables

Each service has its own configuration. Check individual service README files:

- [Backend Configuration](back/README.md#configuration)
- [Frontend Configuration](front/README.md#configuration)
- [Tiler Configuration](tiler/README.md#configuration)
- [Tile Server Configuration](tile-server/README.md#configuration)

## Development

### Service Architecture

```txt
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │────────▶│   Backend   │────────▶│  PostgreSQL │
│   (React)   │         │  (Express)  │         │  + PostGIS  │
│     :80     │         │    :3001    │         │    :5432    │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌─────────────┐          ┌─────────────┐
│ Tile Server │◀──serve──│    Tiler    │
│  (Express)  │          │  (Express)  │
│    :3003    │          │    :3002    │
└─────────────┘          └─────────────┘
```

### Development Setup

1. **Clone the repository**
2. **Start services**: `docker-compose up -d`
3. **Access admin interface**: <http://localhost:80/admin>
4. **Default credentials**: admin / admin123

## Health Monitoring

All services provide health endpoints:

- Backend: `/health` and `/health/detailed`
- Tiler: `/health` and `/health/detailed` (includes Tippecanoe status)
- Tile Server: `/health`

## Security

- **JWT Authentication**: Secure admin access with configurable token expiration
- **Input Validation**: Comprehensive GeoJSON and request validation
- **SQL Injection Prevention**: Parameterized queries via Sequelize ORM
- **Password Security**: bcrypt hashing with salt rounds
- **CORS Configuration**: Controlled cross-origin access

## Performance

- **Vector Tiles**: Efficient tile serving with HTTP caching
- **Database Optimization**: Spatial indexes and optimized queries
- **Async Processing**: Non-blocking tileset generation
- **Connection Pooling**: Optimized database connections

## Deployment

### Production Considerations

1. **Environment Variables**: Set strong JWT secrets and production database credentials
2. **SSL/TLS**: Configure SSL termination at load balancer or reverse proxy
3. **Resource Limits**: Set appropriate memory and CPU limits for containers
4. **Monitoring**: Configure log aggregation and health check monitoring
5. **Backup**: Set up regular PostgreSQL backups including spatial data

### Docker Compose

The included `docker-compose.yml` provides a complete production-ready setup with:
- All services properly networked
- Volume mounts for data persistence
- Environment variable configuration
- Health checks for service dependencies

## Contributing

1. **Code Style**: Follow existing patterns and use provided linting configurations
2. **Testing**: Add tests for new features
3. **Documentation**: Update relevant README files for changes
4. **Database Changes**: Include migration scripts for schema changes

## Licenses

[LICENSE.md](./LICENSE.md) contains the full license information for this project, including third-party components like Tippecanoe.