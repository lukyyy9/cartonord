# Cartonord Tiler

Microservice for generating vector tilesets from GeoJSON data using Tippecanoe, optimized for high-performance tile generation and processing.

## Overview

The tiler service converts GeoJSON data into optimized MBTiles files using Tippecanoe. It handles tile generation requests from the backend, processes large datasets efficiently, and provides comprehensive monitoring of generation status. The service is designed for scalability and can handle multiple concurrent tile generation jobs.

## Features

- **Tippecanoe Integration**: Leverages Tippecanoe for optimal vector tile generation
- **Batch Processing**: Handles multiple tileset generation jobs concurrently
- **Progress Monitoring**: Real-time status updates for tile generation
- **Error Handling**: Comprehensive error recovery and reporting
- **File Management**: Temporary file cleanup and storage optimization
- **Health Monitoring**: Service health checks including Tippecanoe availability
- **Configurable Output**: Customizable zoom levels, compression, and tile properties

## Tech Stack

- **Runtime**: Node.js 18+
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
MAX_CONCURRENT_JOBS=3
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

### Tileset Generation

```http
POST /generate
```

Generates a vector tileset from GeoJSON data.

**Request Body:**

```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "layers": [
    {
      "name": "layer1",
      "geojson": { /* GeoJSON FeatureCollection */ },
      "style": {
        "color": "#3388ff",
        "opacity": 0.7,
        "zIndex": 1
      }
    }
  ],
  "options": {
    "maxZoom": 14,
    "minZoom": 0,
    "simplification": 4,
    "attribution": "© Cartonord"
  }
}
```

**Response:**

```json
{
  "jobId": "job-uuid",
  "status": "started",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "outputPath": "/data/tilesets/550e8400-e29b-41d4-a716-446655440000.mbtiles",
  "startedAt": "2024-01-15T10:30:00Z"
}
```

### Job Status

```http
GET /status/{jobId}
```

Returns the current status of a tile generation job.

**Response:**

```json
{
  "jobId": "job-uuid",
  "status": "processing",
  "progress": 65,
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "startedAt": "2024-01-15T10:30:00Z",
  "estimatedCompletion": "2024-01-15T10:35:00Z",
  "processedFeatures": 1300,
  "totalFeatures": 2000
}
```

**Status Values:**

- `queued`: Job is waiting to start
- `processing`: Tile generation in progress
- `completed`: Successfully completed
- `failed`: Generation failed
- `cancelled`: Job was cancelled

### Job Management

```http
GET    /jobs                    # List all jobs
DELETE /jobs/{jobId}            # Cancel job
POST   /jobs/{jobId}/retry      # Retry failed job
```

### Health Monitoring

```http
GET /health                     # Basic health check
GET /health/detailed           # Detailed health with Tippecanoe status
```

## Tile Generation Process

### Processing Pipeline

1. **Input Validation**: Validate GeoJSON data structure and properties
2. **Temporary File Creation**: Create temporary GeoJSON files for processing
3. **Tippecanoe Execution**: Run Tippecanoe with optimized parameters
4. **Progress Monitoring**: Track generation progress and resource usage
5. **Output Validation**: Verify generated MBTiles file integrity
6. **File Management**: Move to final location and cleanup temporary files
7. **Metadata Generation**: Create tileset metadata and statistics

### Tippecanoe Command Generation

```javascript
const generateCommand = (layers, options) => {
  const cmd = [
    'tippecanoe',
    '--output', options.outputPath,
    '--maximum-zoom', options.maxZoom,
    '--minimum-zoom', options.minZoom,
    '--base-zoom', options.baseZoom,
    '--simplification', options.simplification,
    '--force',
    '--quiet'
  ];

  // Add layer-specific options
  layers.forEach((layer, index) => {
    cmd.push('--layer', layer.name);
    cmd.push(layer.tempFile);
  });

  return cmd;
};
```

### Error Recovery

```javascript
const handleTippecanoeError = (error, jobId) => {
  const errorTypes = {
    'out of memory': 'INSUFFICIENT_MEMORY',
    'disk full': 'INSUFFICIENT_DISK_SPACE',
    'invalid geometry': 'INVALID_GEOMETRY',
    'timeout': 'PROCESSING_TIMEOUT'
  };

  const errorType = detectErrorType(error.message);
  
  logger.error('Tippecanoe generation failed', {
    jobId,
    errorType,
    message: error.message,
    stack: error.stack
  });

  return {
    error: errorType,
    message: error.message,
    recoverable: errorType !== 'INVALID_GEOMETRY'
  };
};
```

## Performance Optimization

### Concurrent Processing

```javascript
class JobQueue {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.running = new Map();
    this.queue = [];
  }

  async add(job) {
    if (this.running.size < this.maxConcurrent) {
      return this.execute(job);
    } else {
      return new Promise((resolve, reject) => {
        this.queue.push({ job, resolve, reject });
      });
    }
  }

  async execute(job) {
    const jobId = uuidv4();
    this.running.set(jobId, job);
    
    try {
      const result = await this.processJob(job);
      this.running.delete(jobId);
      this.processQueue();
      return result;
    } catch (error) {
      this.running.delete(jobId);
      this.processQueue();
      throw error;
    }
  }
}
```

### Memory Management

```javascript
// Monitor memory usage during processing
const monitorMemory = (jobId) => {
  const interval = setInterval(() => {
    const usage = process.memoryUsage();
    
    if (usage.heapUsed > MEMORY_THRESHOLD) {
      logger.warn('High memory usage detected', {
        jobId,
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal
      });
    }
  }, 1000);

  return interval;
};
```

### Disk Space Management

```javascript
// Check available disk space before processing
const checkDiskSpace = async (requiredSpace) => {
  const stats = await fs.statfs(TEMP_DIRECTORY);
  const availableSpace = stats.bavail * stats.bsize;
  
  if (availableSpace < requiredSpace * 2) { // 2x safety margin
    throw new Error('Insufficient disk space');
  }
};
```

## Monitoring & Logging

### Structured Logging

```javascript
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'tiler' },
  transports: [
    new winston.transports.File({ filename: 'tiler.log' }),
    new winston.transports.Console()
  ]
});
```

### Metrics Collection

```javascript
const metrics = {
  jobsCompleted: 0,
  jobsFailed: 0,
  averageProcessingTime: 0,
  totalFeaturesProcessed: 0,
  averageFileSize: 0
};

// Update metrics after job completion
const updateMetrics = (job, result) => {
  metrics.jobsCompleted++;
  metrics.totalFeaturesProcessed += result.featureCount;
  metrics.averageProcessingTime = 
    (metrics.averageProcessingTime * (metrics.jobsCompleted - 1) + result.processingTime) 
    / metrics.jobsCompleted;
};
```

## Error Handling

### Common Error Scenarios

```javascript
const errorHandlers = {
  TIPPECANOE_NOT_FOUND: (error) => ({
    status: 'failed',
    error: 'Tippecanoe not installed or not in PATH',
    resolution: 'Install Tippecanoe and ensure it\'s available in PATH'
  }),

  INSUFFICIENT_MEMORY: (error) => ({
    status: 'failed',
    error: 'Insufficient memory for processing',
    resolution: 'Reduce dataset size or increase available memory'
  }),

  INVALID_GEOJSON: (error) => ({
    status: 'failed',
    error: 'Invalid GeoJSON data provided',
    resolution: 'Validate GeoJSON structure and geometry'
  }),

  DISK_FULL: (error) => ({
    status: 'failed',
    error: 'Insufficient disk space',
    resolution: 'Free disk space or use external storage'
  })
};
```

## Development

### Running Tests

```bash
npm test                    # Run test suite
npm run test:integration   # Integration tests with Tippecanoe
npm run test:performance   # Performance benchmarks
```

### Debugging

```bash
DEBUG=tiler:* npm run dev
```

### Local Development without Tippecanoe

```javascript
// Mock Tippecanoe for development
if (process.env.NODE_ENV === 'development' && !process.env.TIPPECANOE_AVAILABLE) {
  const mockTippecanoe = require('./mocks/tippecanoe');
  // Use mock implementation
}
```

## Security

- **Input Sanitization**: Validate all GeoJSON inputs
- **File System Security**: Prevent path traversal attacks
- **Resource Limits**: CPU and memory usage constraints
- **Temp File Cleanup**: Secure cleanup of temporary files

## Future Enhancements

- **Parallel Processing**: Multi-core Tippecanoe processing
- **Cloud Storage**: S3/GCS integration for large datasets
- **Progress Streaming**: WebSocket progress updates
- **Custom Plugins**: Support for custom Tippecanoe plugins
- **Distributed Processing**: Cluster support for large jobs
