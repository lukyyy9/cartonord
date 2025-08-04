import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapBySlug } from '../services/publicApi';

function MapViewer() {
  const { slug } = useParams();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const TILE_SERVER_URL = 'http://localhost:3003';

  // Récupérer les données de la carte via le slug
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true);
        const data = await getMapBySlug(slug);
        setMapData(data);
      } catch (err) {
        console.error('Erreur lors de la récupération de la carte:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchMapData();
    }
  }, [slug]);

  useEffect(() => {
    if (!mapData || map.current) return; // Attendre les données et initialiser la carte une seule fois

    // Configuration du style MapLibre avec les tuiles vectorielles Cartonord
    const mapStyle = {
      version: 8,
      sources: {
        'cartonord-tiles': {
          type: 'vector',
          tiles: [`${TILE_SERVER_URL}/tiles/${mapData.id}/{z}/{x}/{y}.pbf`],
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
            'background-color': '#242424'
          }
        },
        // Couches pour les polygones
        {
          id: 'polygon-fill',
          type: 'fill',
          source: 'cartonord-tiles',
          'source-layer': `map-${mapData.id}`,
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
          'source-layer': `map-${mapData.id}`,
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
          'source-layer': `map-${mapData.id}`,
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
          'source-layer': `map-${mapData.id}`,
          filter: ['==', '$type', 'Point'],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': 5,
            'circle-opacity': ['get', 'opacity']
          }
        }
      ]
    };

    // Utiliser la configuration de la carte ou des valeurs par défaut
    const center = mapData.config?.center || [7.048, 43.667];
    const zoom = mapData.config?.zoom || 15;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: center,
      zoom: zoom
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

  }, [mapData]);

  // Affichage des états de chargement et d'erreur
  if (loading) {
    return (
      <div className="user-map-container">
        <div className="map-header">
          <h1>Chargement...</h1>
          <p>Récupération des données de la carte</p>
        </div>
        <div className="loading-placeholder" style={{ height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-map-container">
        <div className="map-header">
          <h1>Erreur</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="user-map-container">
        <div className="map-header">
          <h1>Carte non trouvée</h1>
          <p>La carte demandée n'existe pas ou n'est pas publiée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-map-container">
      <div className="map-header">
        <h1>{mapData.name}</h1>
        {mapData.description && <p>{mapData.description}</p>}
      </div>
      <div ref={mapContainer} className="user-map" />
    </div>
  );
}

export default MapViewer;