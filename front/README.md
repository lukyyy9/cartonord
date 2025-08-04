# Cartonord Frontend

React-based frontend application for creating and editing custom styled vector tile maps with MapLibre GL JS.

## Overview

The frontend provides an intuitive interface for importing GeoJSON data, applying custom styles, and visualizing maps with interactive editing capabilities. It communicates with the backend API for data management and receives vector tiles from the tile server for real-time map rendering.

## Features

- **GeoJSON Import**: Drag-and-drop or file upload interface for GeoJSON layers
- **Interactive Map Editor**: Built on MapLibre GL JS for smooth map interactions
- **Style Management**: Color picker, opacity controls, and z-index ordering for layers
- **Point of Interest Management**: Add, edit, and delete POIs with custom pictograms
- **Real-time Preview**: Live map updates as styles are modified
- **Map Management**: Create, save, load, publish, and unpublish maps
- **Admin Interface**: Comprehensive admin dashboard for map management
- **Public Map Viewing**: Slug-based public access to published maps
- **Authentication**: JWT-based admin authentication system

## Tech Stack

- **Framework**: React 18 with Vite for fast development
- **Mapping Library**: MapLibre GL JS for vector tile rendering
- **Routing**: React Router for navigation
- **Styling**: Modular CSS with organized structure
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
VITE_DEFAULT_MAP_CENTER=[7.048, 43.667]
VITE_DEFAULT_MAP_ZOOM=15
```

### MapLibre Configuration

The application automatically configures MapLibre to consume vector tiles from the tile server:

```javascript
const mapStyle = {
  version: 8,
  sources: {
    'cartonord-tiles': {
      type: 'vector',
      tiles: [`${TILE_SERVER_URL}/tiles/{map-id}/{z}/{x}/{y}.pbf`],
      minzoom: 0,
      maxzoom: 18
    }
  },
  layers: [
    // Dynamic layers based on map configuration
  ]
};
```

## Application Routes

### Admin Routes

- `/admin` - Admin dashboard with map list and management
- `/admin/editor/:mapId` - Map editor interface
- `/login` - Admin authentication

### Public Routes

- `/:slug` - Public map viewer for published maps

## Project Structure

```txt
src/
├── admin/             # Admin interface components
│   ├── AdminHomepage.jsx  # Main admin dashboard
│   ├── MapEditor.jsx      # Interactive map editor
│   └── LoginPage.jsx      # Authentication page
├── user/              # Public user interface
│   └── MapViewer.jsx      # Public map display
├── components/        # Reusable UI components
│   └── AdminHeader.jsx    # Admin navigation header
├── services/          # API communication services
│   ├── api.js            # Authenticated API client
│   └── publicApi.js      # Public API client
├── style/             # Organized CSS modules
│   ├── index.css         # Main CSS entry point
│   ├── global.css        # Global styles and variables
│   ├── admin.css         # Admin interface styles
│   ├── map.css          # Map-related styles
│   ├── layers.css       # Layer management styles
│   ├── poi.css          # Point of interest styles
│   ├── forms.css        # Form styles
│   └── user.css         # Public interface styles
└── utils/             # Helper functions
```

## API Integration

### Backend Communication

The frontend communicates with the backend API for:

- **Map CRUD operations**: Create, read, update, delete maps
- **Layer management**: Import and style GeoJSON layers
- **POI management**: Create and edit points of interest
- **Pictogram library**: Access to available pictograms
- **Authentication**: Admin login and session management
- **Publishing workflow**: Publish/unpublish maps

### Tile Server Integration

Vector tiles are consumed directly from the tile server with automatic cache management and error handling for published maps.

## Key Features

### Admin Dashboard

The [`AdminHomepage`](src/admin/AdminHomepage.jsx) provides:

- **Map List**: Overview of all maps with status indicators
- **Map Details**: Comprehensive information about selected maps
- **Quick Actions**: Edit, publish, unpublish, and delete operations
- **Metadata Editing**: Update map name, description, and slug

### Map Editor

The [`MapEditor`](src/admin/MapEditor.jsx) offers:

- **Layer Import**: Multiple GeoJSON file upload with validation
- **Style Controls**: Color picker and opacity adjustment for each layer
- **Layer Ordering**: Drag-and-drop reordering with visual feedback
- **POI Management**: Extract and edit points from imported data
- **Pictogram Selection**: Assign custom pictograms to points of interest
- **Real-time Preview**: Live map updates during editing
- **Save Functionality**: Persist changes and trigger tileset generation

### Public Map Viewer

The [`MapViewer`](src/user/MapViewer.jsx) provides:

- **Published Map Display**: Clean interface for public map viewing
- **Interactive Features**: Click to view feature properties
- **Custom Markers**: Display POIs with assigned pictograms
- **Responsive Design**: Mobile-friendly map interface

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build optimized production bundle
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint for code quality

### Code Style

The project uses ESLint with React hooks plugin for consistent code formatting and best practices.

### CSS Organization

Styles are organized by component and functionality:

- **Global styles**: Variables, base styles, and utilities
- **Component styles**: Specific styling for each major component
- **Layout styles**: Application structure and responsive design
- **Theme consistency**: Centralized color and spacing variables

## Authentication Flow

1. **Admin Access**: Navigate to `/admin` (redirects to login if not authenticated)
2. **Login**: Enter credentials at `/login`
3. **JWT Storage**: Token stored in localStorage for session persistence
4. **Protected Routes**: Automatic authentication check for admin routes
5. **Logout**: Clear session and redirect to login

## Map Management Workflow

1. **Create Map**: Define basic map information (name, description, slug)
2. **Edit Map**: Import GeoJSON layers and configure styling
3. **Add POIs**: Extract or manually add points of interest
4. **Save Changes**: Persist data and trigger tileset generation
5. **Publish Map**: Make map publicly accessible via slug
6. **Public Access**: Users can view published maps without authentication

## Deployment

### Production Build

```bash
npm run build
```

The build artifacts are optimized and ready for deployment with:

- **Code Splitting**: Automatic route-based splitting for optimal loading
- **Asset Optimization**: Minification and compression of assets
- **Source Maps**: Debug information for production troubleshooting

### Nginx Configuration

The included [`nginx.conf`](nginx.conf) provides:

- **SPA Routing**: Proper handling of client-side routes
- **Static Asset Caching**: Aggressive caching for performance
- **Gzip Compression**: Reduced bandwidth usage
- **Security Headers**: Basic security configurations

## Performance Optimizations

- **Bundle Splitting**: Automatic code splitting for optimal loading
- **Tile Caching**: Aggressive caching of vector tiles
- **Lazy Loading**: Components loaded on demand
- **Efficient Rendering**: Optimized React rendering patterns
- **Memory Management**: Proper cleanup of map instances and event listeners

## Error Handling

- **Network Errors**: Graceful handling of API communication failures
- **Authentication Errors**: Automatic redirect to login on token expiration
- **Validation Errors**: User-friendly form validation messages
- **Map Errors**: Fallback handling for map loading issues

## Browser Support

- **Chrome 88+**: Full feature support
- **Firefox 85+**: Full feature support  
- **Safari 14+**: Full feature support
- **Edge 88+**: Full feature support

**Requirements**: WebGL support required for MapLibre GL JS functionality.

## Future Enhancements

- **Collaborative Editing**: Multi-user map editing capabilities
- **Advanced Styling**: More sophisticated layer styling options
- **Export Functionality**: Export maps in various formats
- **Template System**: Predefined map templates and themes
- **Analytics**: Usage tracking and map performance metrics