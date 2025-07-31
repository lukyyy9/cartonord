const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class TileService {
  constructor() {
    // Répertoire où sont stockés les fichiers .mbtiles
    this.tilesDirectory = process.env.TILES_DIRECTORY || '/data/tilesets';
  }

  /**
   * Récupère une tuile depuis un fichier .mbtiles
   */
  async getTile(projectId, z, x, y) {
    return new Promise((resolve, reject) => {
      const mbtilesPath = path.join(this.tilesDirectory, `${projectId}.mbtiles`);
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(mbtilesPath)) {
        console.warn(`MBTiles file not found: ${mbtilesPath}`);
        return resolve(null);
      }
      
      const db = new sqlite3.Database(mbtilesPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          return reject(err);
        }
      });
      
      // Requête SQL pour extraire la tuile
      // Les coordonnées Y sont inversées dans MBTiles (TMS vs XYZ)
      const tmsY = Math.pow(2, z) - 1 - y;
      
      const query = `
        SELECT tile_data 
        FROM tiles 
        WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?
      `;
      
      db.get(query, [z, x, tmsY], (err, row) => {
        db.close();
        
        if (err) {
          console.error('Database query error:', err);
          return reject(err);
        }
        
        if (!row) {
          return resolve(null);
        }
        
        resolve(row.tile_data);
      });
    });
  }

  /**
   * Récupère les métadonnées d'un tileset
   */
  async getMetadata(projectId) {
    return new Promise((resolve, reject) => {
      const mbtilesPath = path.join(this.tilesDirectory, `${projectId}.mbtiles`);
      
      if (!fs.existsSync(mbtilesPath)) {
        return resolve(null);
      }
      
      const db = new sqlite3.Database(mbtilesPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
          return reject(err);
        }
      });
      
      const query = 'SELECT name, value FROM metadata';
      
      db.all(query, [], (err, rows) => {
        db.close();
        
        if (err) {
          return reject(err);
        }
        
        const metadata = {};
        rows.forEach(row => {
          metadata[row.name] = row.value;
        });
        
        resolve(metadata);
      });
    });
  }

  /**
   * Liste tous les projets disponibles
   */
  async listProjects() {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.tilesDirectory)) {
        return resolve([]);
      }
      
      fs.readdir(this.tilesDirectory, (err, files) => {
        if (err) {
          return reject(err);
        }
        
        const projects = files
          .filter(file => file.endsWith('.mbtiles'))
          .map(file => ({
            id: path.basename(file, '.mbtiles'),
            filename: file,
            path: path.join(this.tilesDirectory, file)
          }));
        
        resolve(projects);
      });
    });
  }

  /**
   * Vérifie qu'un projet existe
   */
  async projectExists(projectId) {
    const mbtilesPath = path.join(this.tilesDirectory, `${projectId}.mbtiles`);
    return fs.existsSync(mbtilesPath);
  }
}

module.exports = new TileService();
