import React, { useRef, useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

function RoquefortLesPins() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  
  // ID de la carte en dur pour le moment
  const PROJECT_ID = 'ad386d03-509f-457d-b764-bfd63e7a503b';
  const TILE_SERVER_URL = 'http://localhost:3003';

  useEffect(() => {
    if (map.current) return; // Initialiser la carte une seule fois

    // Configuration du style MapLibre avec les tuiles vectorielles Cartonord
    const mapStyle = {
      version: 8,
      sources: {
        'cartonord-tiles': {
          type: 'vector',
          tiles: [`${TILE_SERVER_URL}/tiles/${PROJECT_ID}/{z}/{x}/{y}.pbf`],
          minzoom: 0,
          maxzoom: 18
        }
      },
      layers: [
        // Couche de fond blanc
        {
          id: 'background',
          type: 'background',
          paint: {
            'background-color': '#ffffff'
          }
        },
        // Couches pour les polygones
        {
          id: 'polygon-fill',
          type: 'fill',
          source: 'cartonord-tiles',
          'source-layer': `map-${PROJECT_ID}`,
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['get', 'opacity']
          }
        },
        {
          id: 'polygon-stroke',
          type: 'line',
          source: 'cartonord-tiles',
          'source-layer': `map-${PROJECT_ID}`,
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1,
            'line-opacity': ['get', 'opacity']
          }
        },
        // Couches pour les lignes
        {
          id: 'line',
          type: 'line',
          source: 'cartonord-tiles',
          'source-layer': `map-${PROJECT_ID}`,
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': ['get', 'opacity']
          }
        },
        // Couches pour les points
        {
          id: 'point',
          type: 'circle',
          source: 'cartonord-tiles',
          'source-layer': `map-${PROJECT_ID}`,
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 5,
            'circle-opacity': ['get', 'opacity']
          }
        }
      ]
    };

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [7.048, 43.667], // Roquefort-les-Pins
      zoom: 15
    });

    // Ajouter les contrôles de navigation
    map.current.addControl(new maplibregl.NavigationControl());

    // Gestionnaire d'événements pour afficher les propriétés des features au clic
    map.current.on('click', (e) => {
      const features = map.current.queryRenderedFeatures(e.point);
      
      if (features.length > 0) {
        const feature = features[0];
        
        // Créer le contenu du popup
        let popupContent = '<div class="popup-content">';
        
        if (feature.properties.name) {
          popupContent += `<h3>${feature.properties.name}</h3>`;
        }
        
        if (feature.properties.description) {
          popupContent += `<p>${feature.properties.description}</p>`;
        }
        
        if (feature.properties.layerName) {
          popupContent += `<p><strong>Couche:</strong> ${feature.properties.layerName}</p>`;
        }
        
        popupContent += '</div>';
        
        // Afficher le popup
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(popupContent)
          .addTo(map.current);
      }
    });

    // Changer le curseur au survol des features
    map.current.on('mouseenter', ['polygon-fill', 'line', 'point'], () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', ['polygon-fill', 'line', 'point'], () => {
      map.current.getCanvas().style.cursor = '';
    });

  }, []);

  return (
    <div className="user-map-container">
      <div className="map-header">
        <h1>Roquefort-les-Pins</h1>
        <p>Carte interactive de la commune</p>
      </div>
      <div ref={mapContainer} className="user-map" />
    </div>
  );
}

export default RoquefortLesPins;