import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../style/user.css';
import { getMapBySlug } from '../services/publicApi';

function MapViewer() {
  const { slug } = useParams();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const pictogramMarkers = useRef([]);
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const TILE_SERVER_URL = 'http://localhost:3003';

  // Fonction utilitaire pour obtenir l'URL correcte d'un pictogramme
  const getPictogramUrl = (pictogram) => {
    if (!pictogram) return null;
    
    // Si c'est un objet pictogramme complet du backend avec publicUrl
    if (pictogram.publicUrl) {
      return `http://localhost:3001${pictogram.publicUrl}`;
    }
    
    // Si c'est un objet avec file ou filePath
    const file = pictogram.file || pictogram.filePath || pictogram.pictogramFile;
    if (file) {
      // Si l'URL commence déjà par /api/, ajouter le host
      if (file.startsWith('/api/')) {
        return `http://localhost:3001${file}`;
      }
      return `http://localhost:3001/api/uploads/pictograms/${file}`;
    }
    
    // Si c'est juste un nom de fichier (string)
    if (typeof pictogram === 'string') {
      if (pictogram.startsWith('/api/')) {
        return `http://localhost:3001${pictogram}`;
      }
      return `http://localhost:3001/api/uploads/pictograms/${pictogram}`;
    }
    
    return null;
  };

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
            'background-color': '#c8e4c4'
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
        }
        // Suppression de la couche des points par défaut - seuls les pictogrammes seront affichés
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

    // Ajouter les contrôles de navigation (position en bas à droite)
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    // Ajouter le contrôle de géolocalisation pour suivre l'utilisateur (position en bas à droite)
    map.current.addControl(new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    }), 'bottom-right');

  // Ajouter le contrôle d'échelle (scale bar) en bas à droite
  map.current.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    // Ajouter les pictogrammes comme markers
    const addPictogramMarkers = () => {
      // Supprimer les markers existants
      pictogramMarkers.current.forEach(marker => marker.remove());
      
      const newMarkers = [];
      
      if (mapData.pointsOfInterest && mapData.pointsOfInterest.length > 0) {
        mapData.pointsOfInterest.forEach(poi => {
          // Vérifier si le POI a un pictogramme
          if (poi.pictogramFile && poi.coordinates) {
            const el = document.createElement('div');
            el.className = 'pictogram-marker';
            el.style.cursor = 'pointer';
            
            const img = document.createElement('img');
            img.src = getPictogramUrl(poi);
            img.alt = poi.name || 'Point d\'intérêt';
            img.style.width = '32px';
            img.style.height = '32px';
            img.style.display = 'block';
            
            // Gérer les erreurs de chargement d'image
            img.onerror = () => {
              console.warn('Erreur de chargement du pictogramme pour:', poi.name);
              el.style.display = 'none';
            };
            
            el.appendChild(img);
            
            const marker = new maplibregl.Marker({
              element: el
            })
            .setLngLat(poi.coordinates)
            .addTo(map.current);
            
            // Ajouter un popup au clic sur le marker
            el.addEventListener('click', (e) => {
              e.stopPropagation();
              
              let popupContent = '<div class="popup-content">';
              if (poi.name) {
                popupContent += `<h3>${poi.name}</h3>`;
              }
              if (poi.description) {
                popupContent += `<p>${poi.description}</p>`;
              }
              popupContent += '</div>';
              
              new maplibregl.Popup()
                .setLngLat(poi.coordinates)
                .setHTML(popupContent)
                .addTo(map.current);
            });
            
            newMarkers.push(marker);
          }
        });
      }
      
      pictogramMarkers.current = newMarkers;
    };

    // Attendre que la carte soit complètement chargée avant d'ajouter les markers
    map.current.on('load', addPictogramMarkers);

    // Changer le curseur au survol des features
    map.current.on('mouseenter', ['polygon-fill', 'line'], () => {
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current.on('mouseleave', ['polygon-fill', 'line'], () => {
      map.current.getCanvas().style.cursor = '';
    });

  }, [mapData]);

  // Effet pour nettoyer les markers lors du démontage du composant
  useEffect(() => {
    return () => {
      pictogramMarkers.current.forEach(marker => marker.remove());
    };
  }, []);

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
      <div className="map-search">
        <input type="text" placeholder="Search for a place or address" />
      </div>
      <div ref={mapContainer} className="user-map" />
    </div>
  );
}

export default MapViewer;