const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class TilesetService {
  constructor() {
    this.baseDataPath = '/data';
    this.tilesetsPath = path.join(this.baseDataPath, 'tilesets');
    this.tempPath = path.join(this.baseDataPath, 'temp');
  }

  /**
   * Génère un tileset à partir d'un fichier GeoJSON
   */
  async generateFromFile({ filePath, projectId, layerName, minZoom, maxZoom }) {
    const tilesetId = uuidv4();
    const outputDir = this.tilesetsPath;
    const outputPath = path.join(outputDir, `${projectId}.mbtiles`); // Nom simplifié

    // Créer le répertoire de sortie
    await fs.ensureDir(outputDir);

    // Générer le tileset avec Tippecanoe
    const stats = await this.runTippecanoe({
      inputPath: filePath,
      outputPath,
      minZoom,
      maxZoom,
      layerName: layerName || `map-${projectId}` // Nom de couche cohérent
    });

    return {
      tilesetId,
      outputPath,
      stats
    };
  }

  /**
   * Génère un tileset à partir de données GeoJSON en mémoire
   */
  async generateFromData({ geojson, projectId, layerName, minZoom, maxZoom }) {
    const tempFile = path.join(this.tempPath, `${uuidv4()}.geojson`);
    
    try {
      // Écrire les données dans un fichier temporaire
      await fs.writeJSON(tempFile, geojson);

      // Générer le tileset
      const result = await this.generateFromFile({
        filePath: tempFile,
        projectId,
        layerName,
        minZoom,
        maxZoom
      });

      return result;
    } finally {
      // Nettoyer le fichier temporaire
      await fs.remove(tempFile).catch(() => {});
    }
  }

  /**
   * Exécute Tippecanoe pour générer un tileset
   */
  async runTippecanoe({ inputPath, outputPath, minZoom, maxZoom, layerName }) {
    return new Promise((resolve, reject) => {
      const args = [
        '--output', outputPath,
        '--minimum-zoom', minZoom.toString(),
        '--maximum-zoom', maxZoom.toString(),
        '--layer', layerName,
        '--force',
        '--drop-densest-as-needed',
        '--extend-zooms-if-still-dropping',
        inputPath
      ];

      logger.info('Démarrage de Tippecanoe', { args });

      const tippecanoe = spawn('tippecanoe', args);
      let stderr = '';

      tippecanoe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      tippecanoe.on('close', async (code) => {
        if (code === 0) {
          try {
            // Récupérer les statistiques du fichier généré
            const stats = await fs.stat(outputPath);
            
            logger.info('Tileset généré avec succès', {
              outputPath,
              size: stats.size
            });

            resolve({
              size: stats.size,
              created: stats.birthtime
            });
          } catch (error) {
            reject(new Error(`Erreur lors de la récupération des stats: ${error.message}`));
          }
        } else {
          logger.error('Erreur Tippecanoe', { code, stderr });
          reject(new Error(`Tippecanoe a échoué avec le code ${code}: ${stderr}`));
        }
      });

      tippecanoe.on('error', (error) => {
        logger.error('Erreur lors du lancement de Tippecanoe', error);
        reject(new Error(`Impossible de lancer Tippecanoe: ${error.message}`));
      });
    });
  }

  /**
   * Liste les tilesets d'un projet
   */
  async listTilesets(projectId) {
    try {
      const tilePath = path.join(this.tilesetsPath, `${projectId}.mbtiles`);
      
      if (await fs.pathExists(tilePath)) {
        const stats = await fs.stat(tilePath);
        return [{
          filename: `${projectId}.mbtiles`,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        }];
      }
      
      return [];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprime un tileset
   */
  async deleteTileset(projectId) {
    const filePath = path.join(this.tilesetsPath, `${projectId}.mbtiles`);
    
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      logger.info('Tileset supprimé', { projectId, filePath });
    } else {
      throw new Error(`Tileset ${projectId} non trouvé`);
    }
  }
}

module.exports = TilesetService;