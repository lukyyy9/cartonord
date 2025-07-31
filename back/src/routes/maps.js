const express = require('express');
const { Map, Layer, PointOfInterest, sequelize } = require('../models');
const router = express.Router();

// GET /api/maps - Lister toutes les cartes
router.get('/', async (req, res) => {
  try {
    const maps = await Map.findAll({
      include: [
        {
          model: Layer,
          as: 'layers'
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(maps);
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des cartes',
      message: error.message 
    });
  }
});

// GET /api/maps/:id - Récupérer une carte par ID avec toutes ses données
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const map = await Map.findByPk(id, {
      include: [
        {
          model: Layer,
          as: 'layers',
          order: [['z_index', 'ASC']]
        },
        {
          model: PointOfInterest,
          as: 'pointsOfInterest'
        }
      ]
    });

    if (!map) {
      return res.status(404).json({ error: 'Carte non trouvée' });
    }

    // Transformer les données pour le frontend
    const formattedMap = {
      ...map.toJSON(),
      layers: map.layers.map(layer => ({
        ...layer.toJSON(),
        // Reconstituer les données nécessaires pour l'éditeur
        fileName: layer.sourceFile,
        sourceId: `source-${layer.id}`,
        layerIds: [
          `polygon-${layer.id}`,
          `line-${layer.id}`,
          `point-${layer.id}`
        ]
      })),
      pointsOfInterest: map.pointsOfInterest.map(poi => ({
        ...poi.toJSON(),
        // Transformer les coordonnées PostGIS en format GeoJSON
        coordinates: poi.coordinates.coordinates,
        id: poi.id,
        sourceId: poi.layerId ? `source-${poi.layerId}` : null
      }))
    };

    res.json(formattedMap);
  } catch (error) {
    console.error('Erreur lors de la récupération de la carte:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération de la carte',
      message: error.message 
    });
  }
});

// POST /api/maps - Créer une nouvelle carte
router.post('/', async (req, res) => {
  try {
    const { name, description, config } = req.body;

    if (!name) {
      return res.status(400).json({ 
        error: 'Le nom est requis' 
      });
    }

    const map = await Map.create({
      name,
      description,
      config: config || {
        center: [0, 0],
        zoom: 15,
        minZoom: 0,
        maxZoom: 18
      }
    });

    res.status(201).json(map);
  } catch (error) {
    console.error('Erreur lors de la création de la carte:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la création de la carte',
      message: error.message 
    });
  }
});

// PUT /api/maps/:id - Mettre à jour une carte avec couches et POIs
router.put('/:id', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      config, 
      status,
      layers = [],
      pointsOfInterest = []
    } = req.body;

    const map = await Map.findByPk(id);
    if (!map) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Carte non trouvée' });
    }

    // Mettre à jour les données de base de la carte
    await map.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(config && { config }),
      ...(status && { status })
    }, { transaction });

    // Supprimer les anciennes couches et POIs
    await Layer.destroy({ 
      where: { mapId: id }, 
      transaction 
    });
    await PointOfInterest.destroy({ 
      where: { mapId: id }, 
      transaction 
    });

    // Créer les nouvelles couches
    const createdLayers = [];
    for (const layerData of layers) {
      const layer = await Layer.create({
        mapId: id,
        name: layerData.name || layerData.fileName,
        geojsonData: layerData.geojsonData,
        style: {
          color: layerData.color,
          opacity: layerData.opacity,
          ...layerData.style
        },
        zIndex: layerData.zIndex || 0,
        color: layerData.color,
        opacity: layerData.opacity,
        sourceFile: layerData.fileName,
        layerType: layerData.layerType || 'mixed'
      }, { transaction });
      
      createdLayers.push(layer);
    }

    // Créer les nouveaux POIs
    for (const poiData of pointsOfInterest) {
      await PointOfInterest.create({
        mapId: id,
        name: poiData.name,
        description: poiData.description,
        coordinates: {
          type: 'Point',
          coordinates: poiData.coordinates
        },
        pictogramId: poiData.pictogram,
        pictogramFile: poiData.pictogramFile,
        properties: poiData.properties || {},
        sourceFile: poiData.sourceFile
      }, { transaction });
    }

    await transaction.commit();

    // **NOUVELLE PARTIE : Génération du tileset**
    try {
      // Combiner toutes les couches en un seul GeoJSON
      const combinedGeoJSON = {
        type: "FeatureCollection",
        features: []
      };

      // Ajouter les features de toutes les couches
      layers.forEach(layer => {
        if (layer.geojsonData && layer.geojsonData.features) {
          // Ajouter des propriétés de style aux features
          const styledFeatures = layer.geojsonData.features.map(feature => ({
            ...feature,
            properties: {
              ...feature.properties,
              // Propriétés de style pour le rendu
              color: layer.color,
              opacity: layer.opacity,
              zIndex: layer.zIndex,
              layerName: layer.fileName
            }
          }));
          combinedGeoJSON.features.push(...styledFeatures);
        }
      });

      // Ajouter les POIs au GeoJSON combiné
      pointsOfInterest.forEach(poi => {
        combinedGeoJSON.features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: poi.coordinates
          },
          properties: {
            ...poi.properties,
            name: poi.name,
            description: poi.description,
            pictogram: poi.pictogram,
            pictogramFile: poi.pictogramFile,
            type: 'poi'
          }
        });
      });

      // Appeler le service tiler si on a des données géographiques
      if (combinedGeoJSON.features.length > 0) {
        console.log(`Génération du tileset pour la carte ${id} avec ${combinedGeoJSON.features.length} features`);
        
        const tilerUrl = process.env.TILER_SERVICE_URL;
        const tilerResponse = await fetch(`${tilerUrl}/api/tileset/generate-from-data`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            geojson: combinedGeoJSON,
            projectId: id,
            layerName: `map-${id}`,
            minZoom: config?.minZoom || 0,
            maxZoom: config?.maxZoom || 18
          })
        });

        if (tilerResponse.ok) {
          const tilerResult = await tilerResponse.json();
          console.log('Tileset généré avec succès:', tilerResult);
          
          // Mettre à jour la carte avec les infos du tileset
          await map.update({
            tilesetPath: tilerResult.path,
            tilesetId: tilerResult.tilesetId,
            tilesetMetadata: tilerResult.stats || {},
            status: 'ready'
          });
        } else {
          const errorText = await tilerResponse.text();
          console.error('Erreur lors de la génération du tileset:', errorText);
          
          // Marquer la carte comme ayant échoué la génération
          await map.update({ 
            status: 'tileset_error',
            tilesetMetadata: { error: errorText }
          });
        }
      }

    } catch (tilerError) {
      console.error('Erreur lors de l\'appel au service tiler:', tilerError);
      
      // Ne pas faire échouer la sauvegarde si le tileset échoue
      // Mais marquer la carte avec un statut d'erreur
      await map.update({ 
        status: 'tileset_error',
        tilesetMetadata: { error: tilerError.message }
      });
    }

    // Récupérer la carte mise à jour avec toutes les relations
    const updatedMap = await Map.findByPk(id, {
      include: [
        {
          model: Layer,
          as: 'layers',
          order: [['z_index', 'ASC']]
        },
        {
          model: PointOfInterest,
          as: 'pointsOfInterest'
        }
      ]
    });

    res.json(updatedMap);
  } catch (error) {
    await transaction.rollback();
    console.error('Erreur lors de la mise à jour de la carte:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour de la carte',
      message: error.message 
    });
  }
});

// DELETE /api/maps/:id - Supprimer une carte
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const map = await Map.findByPk(id);
    if (!map) {
      return res.status(404).json({ error: 'Carte non trouvée' });
    }

    // Supprimer la carte (les couches associées seront supprimées en cascade)
    await map.destroy();

    res.json({ message: 'Carte supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la carte:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de la carte',
      message: error.message 
    });
  }
});

module.exports = router;