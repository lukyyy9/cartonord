const { Map, Layer, PointOfInterest, sequelize } = require('../models');

class MapsService {
  /**
   * Récupère toutes les cartes avec leurs couches (métadonnées uniquement)
   */
  async getAllMaps() {
    return await Map.findAll({
      include: [
        {
          model: Layer,
          as: 'layers',
          attributes: { 
            exclude: ['geojsonData'] // Exclure les données GeoJSON pour optimiser la performance
          }
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Récupère une carte par ID avec toutes ses données
   */
  async getMapById(id) {
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
      return null;
    }

    // Transformer les données pour le frontend
    return {
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
  }

  /**
   * Crée une nouvelle carte
   */
  async createMap(data) {
    const { name, description, config } = data;

    if (!name) {
      throw new Error('Le nom est requis');
    }

    return await Map.create({
      name,
      description,
      config: config || {
        center: [0, 0],
        zoom: 15,
        minZoom: 0,
        maxZoom: 18
      }
    });
  }

  /**
   * Met à jour les métadonnées d'une carte (nom, description, slug)
   */
  async updateMapMetadata(id, data) {
    const { name, description, slug } = data;

    const map = await Map.findByPk(id);
    if (!map) {
      throw new Error('Carte non trouvée');
    }

    // Valider que le nom est fourni s'il est inclus
    if (name !== undefined && (!name || name.trim().length === 0)) {
      throw new Error('Le nom ne peut pas être vide');
    }

    // Préparer les données à mettre à jour
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (slug !== undefined) updateData.slug = slug ? slug.trim() : null;

    // Mettre à jour la carte
    await map.update(updateData);

    return map;
  }

  /**
   * Met à jour une carte avec couches et POIs
   */
  async updateMap(id, data) {
    const transaction = await sequelize.transaction();
    
    try {
      const { 
        config, 
        status,
        layers = [],
        pointsOfInterest = []
      } = data;

      const map = await Map.findByPk(id);
      if (!map) {
        await transaction.rollback();
        throw new Error('Carte non trouvée');
      }

      // Mettre à jour les données de base de la carte
      await map.update({
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

      // Générer le tileset
      await this.generateTileset(map, layers, pointsOfInterest, config);

      // Récupérer la carte mise à jour avec toutes les relations
      return await Map.findByPk(id, {
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
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Supprime une carte
   */
  async deleteMap(id) {
    const map = await Map.findByPk(id);
    if (!map) {
      throw new Error('Carte non trouvée');
    }

    // Supprimer la carte (les couches associées seront supprimées en cascade)
    await map.destroy();
    return { message: 'Carte supprimée avec succès' };
  }

  /**
   * Génère le tileset pour une carte
   */
  async generateTileset(map, layers, pointsOfInterest, config) {
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
        console.log(`Génération du tileset pour la carte ${map.id} avec ${combinedGeoJSON.features.length} features`);
        
        const tilerUrl = process.env.TILER_SERVICE_URL;
        const tilerResponse = await fetch(`${tilerUrl}/api/tileset/generate-from-data`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            geojson: combinedGeoJSON,
            projectId: map.id,
            layerName: `map-${map.id}`,
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
  }
}

module.exports = new MapsService();
