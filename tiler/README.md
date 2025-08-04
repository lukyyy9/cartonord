# Cartonord Tiler

Microservice for generating vector tilesets from GeoJSON data using Tippecanoe, designed for seamless integration with the Cartonord backend API.

## Overview

The tiler service converts GeoJSON data into optimized MBTiles files using Tippecanoe. It receives tile generation requests from the backend service, processes the data efficiently, and stores the generated tilesets for serving by the tile server. The service is designed for reliability and integrates directly with the Cartonord map management workflow.

## Features

- **Tippecanoe Integration**: Leverages Tippecanoe for optimal vector tile generation
- **Backend Integration**: Direct API communication with Cartonord backend
- **GeoJSON Processing**: Handles complete map data including layers and POIs
- **File Upload Support**: Accepts both file uploads and direct data payloads
- **Error Handling**: Comprehensive error recovery and reporting
- **File Management**: Automatic temporary file cleanup and storage optimization
- **Health Monitoring**: Service health checks including Tippecanoe availability
- **Configurable Output**: Customizable zoom levels and tile properties

## Tech Stack

- **Runtime**: Node.js 21.11.0
- **Framework**: Express.js for API endpoints
- **Tile Generator**: Tippecanoe (compiled from source)
- **File System**: fs-extra for advanced file operations
- **Process Management**: Child process spawning for Tippecanoe
- **Logging**: Winston for structured logging
- **Container**: Ubuntu-based Docker with Tippecanoe

## Quick Start

### Development

```bash
cd tiler
npm install
npm run dev
```

**Prerequisites:**

- Tippecanoe must be installed and available in PATH
- Sufficient disk space for temporary file processing

### Docker

```bash
docker build -t tiler .
docker run -p 3002:3002 -v /data:/data tiler
```

## Configuration

### Environment Variables

```env
PORT=3002
NODE_ENV=production
LOG_LEVEL=info

# Processing
TEMP_DIRECTORY=/tmp
OUTPUT_DIRECTORY=/data/tilesets

# Tippecanoe Options
DEFAULT_MAX_ZOOM=14
DEFAULT_MIN_ZOOM=0
DEFAULT_BASE_ZOOM=14
SIMPLIFICATION_FACTOR=4
```

### Tippecanoe Installation

#### Docker (Recommended)

```dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    build-essential \
    libsqlite3-dev \
    zlib1g-dev \
    git \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/felt/tippecanoe.git /tmp/tippecanoe \
    && cd /tmp/tippecanoe \
    && make \
    && make install \
    && rm -rf /tmp/tippecanoe
```

#### Manual Installation

```bash
# Ubuntu/Debian
sudo apt-get install build-essential libsqlite3-dev zlib1g-dev
git clone https://github.com/felt/tippecanoe.git
cd tippecanoe
make
sudo make install

# macOS
brew install tippecanoe
```

## API Endpoints

### Tileset Generation from File Upload

```http
POST /api/tileset/generate
```

Generates a vector tileset from an uploaded GeoJSON file.

**Request:**
- `Content-Type: multipart/form-data`
- File: GeoJSON file
- Body parameters:
  - `projectId`: Map project identifier
  - `layerName`: Layer name (optional, defaults to 'default')
  - `minZoom`: Minimum zoom level (optional, default: 0)
  - `maxZoom`: Maximum zoom level (optional, default: 14)

**Response:**

```json
{
  "success": true,
  "tilesetId": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/data/tilesets/550e8400-e29b-41d4-a716-446655440000.mbtiles",
  "stats": {
    "size": 2048576,
    "created": "2024-01-15T10:30:00Z"
  }
}
```

### Tileset Generation from Data

```http
POST /api/tileset/generate-from-data
```

Generates a vector tileset from GeoJSON data in the request body (used by backend).

**Request Body:**

```json
{
  "geojson": {
    "type": "FeatureCollection",
    "features": [
      // Combined features from all layers and POIs
    ]
  },
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "layerName": "map-550e8400-e29b-41d4-a716-446655440000",
  "minZoom": 0,
  "maxZoom": 18
}
```

**Response:**

```json
{
  "success": true,
  "tilesetId": "550e8400-e29b-41d4-a716-446655440000",
  "path": "/data/tilesets/550e8400-e29b-41d4-a716-446655440000.mbtiles",
  "stats": {
    "size": 2048576,
    "created": "2024-01-15T10:30:00Z"
  }
}
```

### Health Monitoring

```http
GET /health                     # Basic health check
GET /health/detailed           # Detailed health with Tippecanoe status
```

**Detailed Health Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "cartonord-tiler",
  "version": "1.0.0",
  "checks": {
    "tippecanoe": {
      "status": "ok",
      "version": "2.17.0",
      "available": true
    },
    "directories": {
      "temp": "ok",
      "working": "ok"
    },
    "environment": {
      "port": "ok"
    }
  }
}
```

## Tile Generation Process

### Processing Pipeline

1. **Input Validation**: Validate GeoJSON data structure and properties
2. **Temporary File Creation**: Create temporary GeoJSON files for processing
3. **Tippecanoe Execution**: Run Tippecanoe with optimized parameters
4. **Output Validation**: Verify generated MBTiles file integrity
5. **File Management**: Move to final location and cleanup temporary files
6. **Statistics Collection**: Gather file size and creation metadata

### Backend Integration

The tiler service is primarily used by the backend when maps are saved:

```javascript
// Backend calls tiler when updating a map
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
```

### Tippecanoe Command Generation

```javascript
const generateCommand = (inputPath, outputPath, options) => {
  return [
    'tippecanoe',
    '--output', outputPath,
    '--maximum-zoom', options.maxZoom,
    '--minimum-zoom', options.minZoom,
    '--base-zoom', options.baseZoom || options.maxZoom,
    '--simplification', options.simplification || 4,
    '--force',
    '--quiet',
    '--layer', options.layerName,
    inputPath
  ];
};
```

### Error Recovery

The service provides detailed error information for debugging:

```javascript
const handleTippecanoeError = (error, code, stderr) => {
  logger.error('Tippecanoe generation failed', {
    exitCode: code,
    stderr,
    error: error.message
  });

  return {
    success: false,
    error: 'Tileset generation failed',
    details: stderr,
    exitCode: code
  };
};
```

## File Structure

```
src/
├── index.js                 # Express application entry point
├── routes/
│   ├── tileset.js          # Tileset generation endpoints
│   └── health.js           # Health check endpoints
├── services/
│   ├── TilesetService.js   # Core tileset generation logic
│   └── HealthService.js    # Health monitoring service
├── middlewares/
│   ├── logging.js          # Request logging
│   └── errorHandler.js     # Error handling
└── utils/
    └── logger.js           # Winston logger configuration
```

## Service Integration

### Health Monitoring

The [`HealthService`](src/services/HealthService.js) provides comprehensive monitoring:

- Tippecanoe availability and version checking
- Directory permissions and existence verification
- Environment configuration validation

### Logging

Structured logging with Winston provides detailed operation tracking:

```javascript
logger.info('Tileset generation started', {
  projectId,
  layerName,
  dataSize: JSON.stringify(geojson).length
});
```

## Performance

- **Efficient Processing**: Optimized Tippecanoe parameters for fast generation
- **Memory Management**: Careful handling of large GeoJSON datasets
- **Temp File Cleanup**: Automatic cleanup of temporary files
- **Error Handling**: Robust error recovery with detailed logging

## Security

- **Input Validation**: Comprehensive GeoJSON validation
- **File System Security**: Secure temporary file handling
- **Resource Limits**: Protection against resource exhaustion
- **Path Security**: Prevention of path traversal attacks

## Monitoring

- **Structured Logging**: JSON logs with correlation IDs
- **Health Endpoints**: Service dependency monitoring
- **Error Tracking**: Detailed error reporting with context
- **Performance Metrics**: Generation time and file size tracking

## Development

### Running Tests

```bash
npm test                    # Run test suite
npm run test:integration   # Integration tests with Tippecanoe
```

### Debugging

```bash
DEBUG=tiler:* npm run dev
```

### Mock Development

For development without Tippecanoe:

```javascript
// Set environment variable to use mock
TIPPECANOE_MOCK=true npm run dev
```

## Production Deployment

### Environment Setup

1. Ensure Tippecanoe is properly installed
2. Configure data directory permissions
3. Set appropriate resource limits
4. Enable log aggregation
5. Set up monitoring and alerting

### Health Checks

The service provides health endpoints for container orchestration:

- `/health` - Basic liveness check
- `/health/detailed` - Readiness check with dependencies

## Future Enhancements

- **Parallel Processing**: Multi-core Tippecanoe processing
- **Cloud Storage**: S3/GCS integration for large datasets
- **Progress Streaming**: WebSocket progress updates
- **Custom Plugins**: Support for custom Tippecanoe plugins
- **Distributed Processing**: Cluster support for large jobs