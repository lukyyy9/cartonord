# Cartonord Frontend

React-based frontend application for creating and editing custom styled vector tile maps with MapLibre GL JS.

## Overview

The frontend provides an intuitive interface for importing GeoJSON data, applying custom styles, and visualizing maps with interactive editing capabilities. It communicates with the backend API for data management and receives vector tiles from the tile server for real-time map rendering.

## Features

- **GeoJSON Import**: Drag-and-drop or file upload interface for GeoJSON layers
- **Interactive Map Editor**: Built on MapLibre GL JS for smooth map interactions
- **Style Management**: Color picker, opacity controls, and z-index ordering for layers
- **Point of Interest Management**: Add, edit, and delete POIs with custom symbols
- **Real-time Preview**: Live map updates as styles are modified
- **Project Management**: Create, save, and load map projects

## Tech Stack

- **Framework**: React 18 with Vite for fast development
- **Mapping Library**: MapLibre GL JS for vector tile rendering
- **Styling**: CSS Modules with modern CSS features
- **HTTP Client**: Fetch API for backend communication
- **Build Tool**: Vite with optimized production builds
- **Container**: Nginx for production serving

## Quick Start

### Development

```bash
cd front
npm install
npm run dev
```

Access the application at [http://localhost:5173](http://localhost:5173)

### Docker

```bash
docker build -t front .
docker run -p 5173:80 front
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_TILE_SERVER_URL=http://localhost:3003
VITE_DEFAULT_MAP_CENTER=[2.3522, 48.8566]
VITE_DEFAULT_MAP_ZOOM=10
```

### MapLibre Configuration

The application automatically configures MapLibre to consume vector tiles from the tile server:

```javascript
const mapStyle = {
  version: 8,
  sources: {
    'cartonord-tiles': {
      type: 'vector',
      tiles: [`${TILE_SERVER_URL}/tiles/{project-id}/{z}/{x}/{y}.pbf`],
      minzoom: 0,
      maxzoom: 14
    }
  },
  layers: [
    // Dynamic layers based on project configuration
  ]
};
```

## Project Structure

```txt
src/
├── components/         # Reusable UI components
│   ├── Map/           # Map-related components
│   ├── LayerPanel/    # Layer management UI
│   ├── StyleEditor/   # Style configuration UI
│   └── ProjectPanel/ # Project management UI
├── hooks/             # Custom React hooks
├── services/          # API communication
├── utils/             # Helper functions
├── styles/            # Global CSS and themes
└── assets/            # Static assets
```

## API Integration

### Backend Communication

The frontend communicates with the backend API for:

- Project CRUD operations
- Layer management and styling
- Tileset generation triggers
- Symbol library access

### Tile Server Integration

Vector tiles are consumed directly from the tile server with automatic cache management and error handling.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

### Code Style

The project uses ESLint with React hooks plugin for consistent code formatting and best practices.

## Deployment

### Production Build

```bash
npm run build
```

The build artifacts are optimized and ready for deployment with:

- Code splitting for optimal loading
- Asset optimization and compression
- Source maps for debugging

### Nginx Configuration

The included `nginx.conf` provides:

- Single Page Application routing
- Static asset caching
- Gzip compression
- Security headers

## Performance

- **Bundle Splitting**: Automatic code splitting for optimal loading
- **Tile Caching**: Aggressive caching of vector tiles
- **Lazy Loading**: Components loaded on demand
- **Optimized Rendering**: Efficient React rendering patterns

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

WebGL support required for MapLibre GL JS functionality.
