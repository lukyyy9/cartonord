import { useRef, useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { reorder } from '@atlaskit/pragmatic-drag-and-drop/reorder'
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { apiService } from '../services/api';
import AdminHeader from '../components/AdminHeader';

function MapEditor() {
  const { mapId } = useParams();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [loadedLayers, setLoadedLayers] = useState([]);
  const defaultColor = '#fff';
  const defaultOpacity = 0.8;
  const layerRefs = useRef(new Map());
  const [instanceId] = useState(() => Symbol('map-layers-instance'));
  const [draggedLayer, setDraggedLayer] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState({ layerId: null, edge: null });
  const [opacityInputs, setOpacityInputs] = useState({});
  const [activeTab, setActiveTab] = useState('layers');
  const [pointsOfInterest, setPointsOfInterest] = useState([]);
  const [showPictoMenu, setShowPictoMenu] = useState(false);
  const [currentEditingPOI, setCurrentEditingPOI] = useState(null);
  const [availablePictograms, setAvailablePictograms] = useState([]);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editedPOIData, setEditedPOIData] = useState(null);
  const [currentMap, setCurrentMap] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Ajoutez un compteur pour garantir l'unicité
  let idCounter = 0;
  
  // Fonction pour générer un ID unique pour chaque couche
  const generateUniqueId = (baseName, fileName) => {
    const timestamp = new Date().getTime();
    const cleanFileName = fileName.replace(/\s+/g, '-').replace(/\.[^/.]+$/, "");
    return `${baseName}-${cleanFileName}-${timestamp}-${idCounter++}`;
  };

  // Fonction pour charger une carte existante
  const loadExistingMap = async (id) => {
    try {
      setIsLoading(true);
      console.log(`Chargement de la carte avec l'ID: ${id}`);
      
      const response = await apiService.get(`/api/maps/${id}`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const mapData = await response.json();
      
      console.log('Données de la carte chargées:', mapData);
      setCurrentMap(mapData);

      // Charger les couches dans l'éditeur
      if (mapData.layers && mapData.layers.length > 0) {
        const layersToLoad = [];
        
        for (const layer of mapData.layers) {
          if (layer.geojsonData && map.current) {
            // Utiliser les IDs de la DB ou générer de nouveaux
            const sourceId = layer.sourceId || `source-${layer.id}`;
            const polygonLayerId = layer.layerIds?.[0] || `polygon-${layer.id}`;
            const lineLayerId = layer.layerIds?.[1] || `line-${layer.id}`;
            const pointLayerId = layer.layerIds?.[2] || `point-${layer.id}`;
            
            // Ajouter la source GeoJSON à la carte
            map.current.addSource(sourceId, {
              type: 'geojson',
              data: layer.geojsonData
            });
            
            // Ajouter les couches pour visualiser les données
            map.current.addLayer({
              id: polygonLayerId,
              type: 'fill',
              source: sourceId,
              paint: {
                'fill-color': layer.color || defaultColor,
                'fill-opacity': layer.opacity || defaultOpacity,
                'fill-outline-color': layer.color || defaultColor
              },
              filter: ['==', '$type', 'Polygon']
            });

            map.current.addLayer({
              id: lineLayerId,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': layer.color || defaultColor,
                'line-width': 2,
                'line-opacity': layer.opacity || defaultOpacity
              },
              filter: ['==', '$type', 'LineString']
            });

            map.current.addLayer({
              id: pointLayerId,
              type: 'circle',
              source: sourceId,
              paint: {
                'circle-radius': 5,
                'circle-color': layer.color || defaultColor,
                'circle-opacity': layer.opacity || defaultOpacity
              },
              filter: ['==', '$type', 'Point']
            });
            
            // Créer l'objet couche pour l'état local
            const layerObject = {
              fileName: layer.fileName || layer.name,
              sourceId,
              layerIds: [polygonLayerId, lineLayerId, pointLayerId],
              color: layer.color || defaultColor,
              opacity: layer.opacity || defaultOpacity,
              geojsonData: layer.geojsonData,
              id: layer.id
            };
            
            layersToLoad.push(layerObject);
          }
        }
        
        setLoadedLayers(layersToLoad);
      }

      // Charger les points d'intérêt
      if (mapData.pointsOfInterest && mapData.pointsOfInterest.length > 0) {
        const poisWithMarkers = mapData.pointsOfInterest.map(poi => {
          // Créer un marker si le POI a un pictogramme
          let marker = null;
          if (poi.pictogramFile && map.current) {
            const el = document.createElement('div');
            el.className = 'marker';
            
            const img = document.createElement('img');
            img.src = `/pictogrammes/${poi.pictogramFile}`;
            img.alt = poi.name;
            img.width = 32;
            img.height = 32;
            el.appendChild(img);
            
            marker = new maplibregl.Marker({
              element: el
            })
            .setLngLat(poi.coordinates)
            .addTo(map.current);
          }
          
          return {
            ...poi,
            marker
          };
        });
        
        setPointsOfInterest(poisWithMarkers);
      }

      // Ajuster la vue de la carte selon la configuration
      if (mapData.config && mapData.config.center && map.current) {
        map.current.setCenter(mapData.config.center);
        if (mapData.config.zoom) {
          map.current.setZoom(mapData.config.zoom);
        }
      }

    } catch (error) {
      console.error('Erreur lors du chargement de la carte:', error);
      alert('Erreur lors du chargement de la carte: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Effet pour l'ordre des couches à l'upload
  useEffect(() => {
    if (map.current && loadedLayers.length > 0) {
      reorderMapLayers(loadedLayers);
    }
  }, [loadedLayers]);

  // Effet pour charger une carte existante si un mapId est fourni
  useEffect(() => {
    if (mapId && map.current && !currentMap) {
      loadExistingMap(mapId);
    }
  }, [mapId, currentMap]);

  // Fonction pour gérer l'édition d'un point d'intérêt
  const handleEditPOI = (point) => {
    console.log("Édition du point:", point);
    setCurrentEditingPOI(point);
    setEditedPOIData({
      name: point.name || point.properties?.name || "Point sans nom",
      description: point.properties?.description || ""
    });
    setShowEditForm(true);
  };

  // Fonction pour soumettre les modifications du point d'intérêt
  const closeEditForm = () => {
    setShowEditForm(false);
    setCurrentEditingPOI(null);
    setEditedPOIData(null);
  };

  // Fonction pour ouvrir le menu des pictogrammes
  const openPictogramMenu = () => {
    setShowPictoMenu(true);
  };

  // Fonction pour gérer la soumission du formulaire d'édition
  const handleSavePOI = () => {
    if (!currentEditingPOI || !editedPOIData) return;
    
    // Mettre à jour les données du POI
    setPointsOfInterest(prevPoints => 
      prevPoints.map(point => {
        if (point.id === currentEditingPOI.id) {
          return {
            ...point,
            name: editedPOIData.name,
            properties: {
              ...point.properties,
              name: editedPOIData.name,
              description: editedPOIData.description
            }
          };
        }
        return point;
      })
    );
    
    closeEditForm();
  };

  // Fonction pour fermer le menu des pictogrammes
  const closePictoMenu = () => {
    setShowPictoMenu(false);
    setCurrentEditingPOI(null);
  };

  // Fonction pour gérer la sélection d'un pictogramme
  const handlePictogramSelect = (pictogram) => {
    if (!currentEditingPOI || !map.current) {
      setShowPictoMenu(false);
      return;
    }
    
    // Si le point a déjà un marker sur la carte, le supprimer
    if (currentEditingPOI.marker) {
      currentEditingPOI.marker.remove();
    }
    
    // Créer un élément DOM pour le marqueur
    const el = document.createElement('div');
    el.className = 'marker';
    
    // Utilisation d'une image réelle au lieu de background-image
    const img = document.createElement('img');
    img.src = `/pictogrammes/${pictogram.file}`;
    img.alt = pictogram.name;
    img.width = 32;
    img.height = 32;
    el.appendChild(img);
    
    // Ajouter le marker à la carte avec l'élément personnalisé
    const marker = new maplibregl.Marker({
      element: el
    })
    .setLngLat(currentEditingPOI.coordinates)
    .addTo(map.current);
    
    // Stocker une référence au marker
    const updatedPOI = {
      ...currentEditingPOI,
      pictogram: pictogram.id,
      pictogramFile: pictogram.file,
      marker: marker
    };
    
    setPointsOfInterest(prevPoints => 
      prevPoints.map(point => 
        point.id === currentEditingPOI.id ? updatedPOI : point
      )
    );
    
    // Fermer le menu des pictogrammes mais garder le formulaire d'édition ouvert
    setCurrentEditingPOI(updatedPOI);
    setShowPictoMenu(false);
  };
  
  // Fonction pour gérer l'upload de fichier GeoJSON
  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const geojson = JSON.parse(e.target.result);
          
          // Vérifier si c'est un GeoJSON valide
          if (!geojson.type || !geojson.features) {
            alert(`Format GeoJSON invalide pour le fichier ${file.name}`);
            return;
          }
          
          // Créer des identifiants uniques pour cette couche
          const sourceId = generateUniqueId('source', file.name);
          const polygonLayerId = generateUniqueId('polygon', file.name);
          const lineLayerId = generateUniqueId('line', file.name);
          const pointLayerId = generateUniqueId('point', file.name);
          
          // Ajouter la source GeoJSON
          map.current.addSource(sourceId, {
            type: 'geojson',
            data: geojson
          });
          
          // Ajouter des couches pour visualiser les données GeoJSON
          map.current.addLayer({
            id: polygonLayerId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': defaultColor,
              'fill-opacity': defaultOpacity,
              'fill-outline-color': defaultColor
            },
            filter: ['==', '$type', 'Polygon']
          });

          map.current.addLayer({
            id: lineLayerId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': defaultColor,
              'line-width': 2,
              'line-opacity': defaultOpacity
            },
            filter: ['==', '$type', 'LineString']
          });

          map.current.addLayer({
            id: pointLayerId,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': 5,
              'circle-color': defaultColor,
              'circle-opacity': defaultOpacity
            },
            filter: ['==', '$type', 'Point']
          });
          
          // Ajouter les informations de la couche à l'état
          const newLayer = {
            fileName: file.name,
            sourceId,
            layerIds: [polygonLayerId, lineLayerId, pointLayerId],
            color: defaultColor,
            opacity: defaultOpacity
          };
          
          setLoadedLayers(prevLayers => [...prevLayers, newLayer]);

          // Extraire les points du GeoJSON pour l'onglet Points d'intérêt
          const points = geojson.features.filter(feature => 
            feature.geometry && feature.geometry.type === 'Point'
          ).map(point => ({
            id: generateUniqueId('poi', point.properties?.name || file.name),
            name: point.properties?.nom || point.properties["#Name"] || "Unnamed Point",
            coordinates: point.geometry.coordinates,
            properties: point.properties || {},
            sourceFile: file.name,
            sourceId: sourceId
          }));

          // Ajouter les points à l'état des points d'intérêt
          if (points.length > 0) {
            setPointsOfInterest(prev => [...prev, ...points]);
          }
          
          // Ajuster la vue de la carte aux limites du GeoJSON
          const bounds = new maplibregl.LngLatBounds();
          
          geojson.features.forEach(feature => {
            if (feature.geometry && feature.geometry.coordinates) {
              if (feature.geometry.type === 'Point') {
                bounds.extend(feature.geometry.coordinates);
              } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiPoint') {
                feature.geometry.coordinates.forEach(coord => bounds.extend(coord));
              } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiLineString') {
                feature.geometry.coordinates.forEach(ring => {
                  ring.forEach(coord => bounds.extend(coord));
                });
              } else if (feature.geometry.type === 'MultiPolygon') {
                feature.geometry.coordinates.forEach(polygon => {
                  polygon.forEach(ring => {
                    ring.forEach(coord => bounds.extend(coord));
                  });
                });
              }
            }
          });
          
          if (!bounds.isEmpty()) {
            map.current.fitBounds(bounds, {
              padding: 50,
              maxZoom: 15
            });
          }
          
        } catch (error) {
          console.error(`Erreur lors du traitement du fichier ${file.name}:`, error);
          alert(`Erreur lors du traitement du fichier ${file.name}: ${error.message}`);
        }
      };
      
      reader.readAsText(file);
    });
    
    // Réinitialiser l'input de fichier pour permettre de sélectionner les mêmes fichiers
    event.target.value = '';
  };

  // Fonction pour supprimer une couche chargée
  const removeLayer = (layerInfo) => {
    if (!map.current) return;
    
    // Supprimer les couches
    layerInfo.layerIds.forEach(layerId => {
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
    });
    
    // Supprimer la source
    if (map.current.getSource(layerInfo.sourceId)) {
      map.current.removeSource(layerInfo.sourceId);
    }
    
    // Mettre à jour l'état
    setLoadedLayers(prevLayers => 
      prevLayers.filter(layer => layer.sourceId !== layerInfo.sourceId)
    );

    // Supprimer les points d'intérêt associés à cette source
    setPointsOfInterest(prevPoints => 
      prevPoints.filter(point => point.sourceId !== layerInfo.sourceId)
    );
  };

  // Fonction pour changer la couleur d'une couche
  const changeLayerColor = (layerInfo, newColor) => {
    if (!map.current) return;
    
    // Mettre à jour les styles des couches
    layerInfo.layerIds.forEach(layerId => {
      if (map.current.getLayer(layerId)) {
        const layerType = layerId.split('-')[0];
        
        if (layerType === 'polygon') {
          map.current.setPaintProperty(layerId, 'fill-color', newColor);
          map.current.setPaintProperty(layerId, 'fill-outline-color', newColor);
        } else if (layerType === 'line') {
          map.current.setPaintProperty(layerId, 'line-color', newColor);
        } else if (layerType === 'point') {
          map.current.setPaintProperty(layerId, 'circle-color', newColor);
        }
      }
    });
    
    // Mettre à jour l'état
    setLoadedLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.sourceId === layerInfo.sourceId 
          ? { ...layer, color: newColor } 
          : layer
      )
    );
  };

  // Fonction pour changer l'opacité d'une couche
  const changeLayerOpacity = (layerInfo, newOpacity) => {
    if (!map.current) return;
    
    // Mettre à jour les styles des couches
    layerInfo.layerIds.forEach(layerId => {
      if (map.current.getLayer(layerId)) {
        const layerType = layerId.split('-')[0];
        
        if (layerType === 'polygon') {
          map.current.setPaintProperty(layerId, 'fill-opacity', newOpacity);
        } else if (layerType === 'line') {
          map.current.setPaintProperty(layerId, 'line-opacity', newOpacity);
        } else if (layerType === 'point') {
          map.current.setPaintProperty(layerId, 'circle-opacity', newOpacity);
        }
      }
    });
    
    // Mettre à jour l'état
    setLoadedLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.sourceId === layerInfo.sourceId 
          ? { ...layer, opacity: newOpacity } 
          : layer
      )
    );
  };

  // Fonction pour réorganiser les couches sur la carte
  const reorderMapLayers = useCallback((newOrderedLayers) => {
    if (!map.current) return;

    // Les couches les plus hautes dans la liste doivent être affichées au-dessus
    // Parcourir les couches de bas en haut (dernière à première)
    for (let i = newOrderedLayers.length - 1; i >= 0; i--) {
      const layer = newOrderedLayers[i];
      // Pour chaque type de couche (polygon, line, point)
      layer.layerIds.forEach(layerId => {
        if (map.current.getLayer(layerId)) {
          map.current.moveLayer(layerId); // déplace la couche au sommet
        }
      });
    }
  }, []);

  // Initialiser le drag-and-drop pour chaque élément
  const initDragElement = (element, layer, index) => {
    if (!element) return null;

    return draggable({
      element,
      getInitialData: () => ({
        layer,
        index,
        instanceId
      })
    });
  };

  // Fonction pour réordonner les couches
  const handleReorder = useCallback((startIndex, finishIndex) => {
    if (startIndex === finishIndex) return;

    const newLayers = reorder({
      list: loadedLayers,
      startIndex,
      finishIndex
    });

    setLoadedLayers(newLayers);
    reorderMapLayers(newLayers);
  }, [loadedLayers, reorderMapLayers]);

  // Fonction modifiée pour gérer les changements d'opacité
  const handleOpacityInputChange = (layer, value) => {
    // Mettre à jour l'état local de l'input
    setOpacityInputs(prev => ({
      ...prev,
      [layer.sourceId]: value
    }));
    
    // Ne mettre à jour l'opacité que si la valeur est un nombre valide
    if (value !== '') {
      // Limiter à 100 si la valeur est supérieure
      const numValue = Math.min(parseInt(value, 10), 100);
      if (!isNaN(numValue)) {
        changeLayerOpacity(layer, numValue / 100);
        setOpacityInputs(prev => ({
          ...prev,
          [layer.sourceId]: numValue.toString()
        }));
      }
    }
  };

  // Fonction pour gérer la perte de focus
  const handleOpacityInputBlur = (layer) => {
    // Si vide à la perte de focus, réinitialiser à la valeur par défaut
    if (opacityInputs[layer.sourceId] === '') {
      const defaultValue = Math.round(defaultOpacity * 100);
      setOpacityInputs(prev => ({
        ...prev,
        [layer.sourceId]: defaultValue.toString()
      }));
      changeLayerOpacity(layer, defaultOpacity);
    }
  };

  const handleSave = async () => {
    console.log('Sauvegarde en cours...');
    
    try {
      // Récupérer les données GeoJSON de chaque couche depuis la carte
      const layersData = await Promise.all(
        loadedLayers.map(async (layer, index) => {
          const source = map.current.getSource(layer.sourceId);
          const geojsonData = source._data;
          
          return {
            name: layer.fileName.replace(/\.[^/.]+$/, ""),
            fileName: layer.fileName,
            geojsonData: geojsonData,
            color: layer.color,
            opacity: layer.opacity,
            zIndex: index,
            layerType: 'mixed',
            style: {
              color: layer.color,
              opacity: layer.opacity
            }
          };
        })
      );
  
      const poisData = pointsOfInterest.map(poi => ({
        name: poi.name,
        description: poi.properties?.description || '',
        coordinates: poi.coordinates,
        pictogram: poi.pictogram || null,
        pictogramFile: poi.pictogramFile || null,
        properties: poi.properties || {},
        sourceFile: poi.sourceFile
      }));
  
      const payload = {
        config: {
          center: map.current.getCenter().toArray(),
          zoom: map.current.getZoom(),
          minZoom: 0,
          maxZoom: 18
        },
        status: 'draft',
        layers: layersData,
        pointsOfInterest: poisData
      };
  
      console.log('Données à sauvegarder:', payload);
  
      // Utiliser l'ID de la carte actuelle (soit depuis l'URL, soit depuis la carte chargée)
      const currentMapId = mapId || currentMap?.id;
      
      if (!currentMapId) {
        throw new Error('Aucun ID de carte disponible pour la sauvegarde');
      }
  
      const response = await apiService.put(`/api/maps/${currentMapId}`, payload);
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la sauvegarde');
      }
  
      const result = await response.json();
      console.log('Sauvegarde réussie:', result);
      
      if (result.status === 'ready') {
        alert('Carte sauvegardée avec succès ! Tileset généré.');
      } else if (result.status === 'tileset_error') {
        alert('Carte sauvegardée mais erreur lors de la génération du tileset. Veuillez réessayer.');
      } else {
        alert('Carte sauvegardée avec succès !');
      }

    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert(`Erreur lors de la sauvegarde: ${error.message}`);
    }
  };

  // useEffect pour charger les pictogrammes depuis le JSON
  useEffect(() => {
    fetch('/pictograms.json')
      .then(response => response.json())
      .then(data => {
        setAvailablePictograms(data.pictograms);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des pictogrammes:', error);
      });
  }, []);

  // Effet pour initialiser la carte
  useEffect(() => {
    if (map.current) return; // initialiser la carte une seule fois
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          // Aucune source de tuiles OSM
        },
        layers: [
          // Aucune couche de tuiles
        ]
      },
      center: [7.048, 43.667], // Roquefort-les-Pins, France TODO : focus sur l'upload
      zoom: 15,
      background: '#ffffff'
    });
    
    // Ajouter les contrôles de navigation
    map.current.addControl(new maplibregl.NavigationControl());
  }, []);

  // Effet pour configurer le monitoring du drag-and-drop
  useEffect(() => {
    const cleanup = monitorForElements({
      canMonitor: ({ source }) => source.data?.instanceId === instanceId,
      onDrop: ({ location, source }) => {
        const dropTargets = location.current.dropTargets;
        if (!dropTargets.length) return;

        const sourceData = source.data;
        const targetData = dropTargets[0].data;
        
        if (targetData) {
          const startIndex = sourceData.index;
          const targetIndex = targetData.index;
          const edge = extractClosestEdge(targetData);
          
          const finishIndex = getReorderDestinationIndex({
            startIndex,
            indexOfTarget: targetIndex,
            closestEdgeOfTarget: edge,
            axis: 'vertical'
          });

          handleReorder(startIndex, finishIndex);
        }
        
        setDraggedLayer(null);
        setHoveredEdge({ layerId: null, edge: null });
      }
    });

    return cleanup;
  }, [loadedLayers]);

  // Effet pour configurer les zones de drop pour la liste
  useEffect(() => {
    const layerList = document.querySelector('.layer-list ul');
    if (!layerList) return;

    const cleanup = dropTargetForElements({
      element: layerList,
      canDrop: ({ source }) => source.data?.instanceId === instanceId,
      getData: () => ({ isContainer: true, instanceId }),
    });

    return cleanup;
  }, []);

  return (
    <div className="admin-layout">
      <AdminHeader mapName={currentMap?.name} />
      
      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-message">
            Chargement de la carte...
          </div>
        </div>
      )}
      
      <div className="app">
        {/* Panneau latéral avec onglets */}
        <div className="layer-list">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
            >
              Couches
            </button>
            <button 
              className={`tab ${activeTab === 'poi' ? 'active' : ''}`}
              onClick={() => setActiveTab('poi')}
            >
              Points d'intérêt
            </button>
            <button 
              className={`tab ${activeTab === 'save' ? 'active' : ''}`}
              onClick={() => setActiveTab('save')}
            >
              Sauvegarder
            </button>
          </div>
          
          <div className={`tab-content ${activeTab === 'layers' ? 'active' : ''}`}>
            <div className="upload-container-sidebar">
              <input 
                type="file" 
                id="geojson-upload" 
                className="file-input" 
                accept=".geojson,.json" 
                onChange={handleFileUpload} 
                multiple
              />
            </div>
            
            {loadedLayers.length > 0 && (
              <>
                <ul>
              {loadedLayers.map((layer, index) => (
                <li 
                  key={layer.sourceId} 
                  className={`layer-item ${draggedLayer === layer.sourceId ? 'dragging' : ''}`}
                  ref={element => {
                    if (element) {
                      layerRefs.current.set(layer.sourceId, element);
                      
                      // Configurer le drag-and-drop pour cet élément
                      const dragCleanup = initDragElement(element, layer, index);
                      
                      // Configurer la zone de drop pour cet élément
                      const dropCleanup = dropTargetForElements({
                        element,
                        canDrop: ({ source }) => source.data?.instanceId === instanceId,
                        getData: ({ input }) => {
                          return attachClosestEdge(
                            { layer, index, instanceId },
                            {
                              element,
                              input,
                              allowedEdges: ['top', 'bottom']
                            }
                          );
                        },
                        onDragStart: () => setDraggedLayer(layer.sourceId),
                        onDragEnter: ({ self }) => {
                          const edge = extractClosestEdge(self.data);
                          setHoveredEdge({ layerId: layer.sourceId, edge });
                        },
                        onDrag: ({ self }) => {
                          const edge = extractClosestEdge(self.data);
                          setHoveredEdge({ layerId: layer.sourceId, edge });
                        },
                        onDragLeave: () => {
                          setHoveredEdge({ layerId: null, edge: null });
                        }
                      });

                      // Enregistrer les fonctions de nettoyage
                      element.cleanup = combine(dragCleanup, dropCleanup);
                      
                      return () => {
                        if (element.cleanup) {
                          element.cleanup();
                        }
                      };
                    }
                  }}
                >
                  <div className="layer-info">
                    <span className="layer-name">
                      <span className="drag-handle" title="Glisser pour réordonner">☰</span>
                      {layer.fileName}
                    </span>
                    <div className="layer-controls">
                      <input 
                        type="color" 
                        value={layer.color}
                        onChange={(e) => changeLayerColor(layer, e.target.value)}
                        className="color-picker"
                        title="Changer la couleur"
                      />
                      <div className="opacity-control">
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          value={opacityInputs[layer.sourceId] !== undefined 
                            ? opacityInputs[layer.sourceId] 
                            : Math.round((layer.opacity || defaultOpacity) * 100)}
                          onChange={(e) => handleOpacityInputChange(layer, e.target.value)}
                          onBlur={() => handleOpacityInputBlur(layer)}
                          className="opacity-input"
                          title="Ajuster l'opacité (0-100)"
                        />
                        <span className="opacity-label">%</span>
                      </div>
                      <button 
                        onClick={() => removeLayer(layer)} 
                        className="remove-layer"
                        title="Supprimer la couche"
                      >
                        X
                      </button>
                    </div>
                  </div>
                  {hoveredEdge.layerId === layer.sourceId && (
                    <div className={`drop-indicator ${hoveredEdge.edge}`}></div>
                  )}
                </li>
              ))}
                </ul>
              </>
            )}
          </div>
          <div className={`tab-content ${activeTab === 'poi' ? 'active' : ''}`}>
            {pointsOfInterest.length > 0 ? (
              <div className="poi-groups">
                {/* Regrouper les points par fichier source */}
                {Object.entries(
                  pointsOfInterest.reduce((groups, point) => {
                    const source = point.sourceFile;
                    if (!groups[source]) groups[source] = [];
                    groups[source].push(point);
                    return groups;
                  }, {})
                ).map(([sourceFile, points]) => (
                  <div key={sourceFile} className="poi-source-group">
                    <h4 className="poi-source-title">{sourceFile}</h4>
                    <ul className="poi-list">
                      {points.map(point => (
                        <li key={point.id} className="poi-item">
                          <div className="poi-header">
                            <span className="poi-name">
                              {point.name || point.properties?.name || "Point sans nom"}
                            </span>
                            <button 
                              className="edit-poi-btn" 
                              title="Éditer ce point"
                              onClick={() => handleEditPOI(point)}
                            >
                              ✏️
                            </button>
                          </div>
                          <div className="poi-coords">
                            <div>
                              Lg: {point.coordinates[0].toFixed(5)}
                            </div>
                            <div>
                              Lt: {point.coordinates[1].toFixed(5)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p>Aucun point d'intérêt trouvé. Importez des fichiers GeoJSON contenant des points.</p>
            )}
          </div>
          <div className={`tab-content ${activeTab === 'save' ? 'active' : ''}`}>
            <div className="save-section">
              <button 
                className="save-main-btn" 
                onClick={handleSave}
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire d'édition de POI */}
        {showEditForm && (
          <div className="edit-overlay">
            <div className="edit-form">
              <div className="edit-header">
                <h3>Éditer le point d'intérêt</h3>
                <button className="close-edit-form" onClick={closeEditForm}>x</button>
              </div>
              <div className="edit-content">
                <div className="form-group">
                  <label>Nom</label>
                  <input 
                    type="text" 
                    value={editedPOIData.name} 
                    onChange={(e) => setEditedPOIData({...editedPOIData, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea 
                    value={editedPOIData.description} 
                    onChange={(e) => setEditedPOIData({...editedPOIData, description: e.target.value})}
                    rows="3"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label>Pictogramme</label>
                  <div 
                    className="pictogram-preview" 
                    onClick={openPictogramMenu}
                    title="Cliquez pour changer de pictogramme"
                  >
                    {currentEditingPOI.pictogramFile ? (
                      <img 
                        src={`/pictogrammes/${currentEditingPOI.pictogramFile}`} 
                        alt="Pictogramme" 
                      />
                    ) : (
                      <div className="no-pictogram">Aucun pictogramme sélectionné</div>
                    )}
                  </div>
                </div>
                <div className="form-actions">
                  <button className="cancel-btn" onClick={closeEditForm}>Annuler</button>
                  <button className="save-btn" onClick={handleSavePOI}>Enregistrer</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu de pictogrammes */}
        {showPictoMenu && (
          <div className="pictogram-overlay">
            <div className="pictogram-menu">
              <div className="pictogram-header">
                <h3>Choisir un pictogramme</h3>
                <button className="close-picto-menu" onClick={closePictoMenu}>x</button>
              </div>
              <div className="pictogram-grid">
                {availablePictograms.map(pictogram => (
                  <div 
                    key={pictogram.id} 
                    className="pictogram-item" 
                    onClick={() => handlePictogramSelect(pictogram)}
                    title={pictogram.name}
                  >
                    <img 
                      src={`/pictogrammes/${pictogram.file}`} 
                      alt={pictogram.name} 
                    />
                    <div className="pictogram-name">{pictogram.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={mapContainer} className="map-container" />
      </div>
    </div>
  )
}

export default MapEditor