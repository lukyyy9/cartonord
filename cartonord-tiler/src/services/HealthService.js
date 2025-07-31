const { spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

class HealthService {
  constructor() {
    this.serviceName = 'cartonord-tiler';
  }

  /**
   * Retourne un check de santé basique
   */
  getBasicHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  /**
   * Retourne un check de santé détaillé avec vérifications
   */
  async getDetailedHealth() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      version: process.env.npm_package_version || '1.0.0',
      checks: {}
    };

    try {
      // Vérification de Tippecanoe
      health.checks.tippecanoe = await this.checkTippecanoe();
      
      // Vérification des répertoires de travail
      health.checks.directories = await this.checkDirectories();
      
      // Vérification des variables d'environnement
      health.checks.environment = this.checkEnvironment();

      // Détermination du statut global
      health.status = this.determineOverallStatus(health.checks);

    } catch (error) {
      health.status = 'error';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Vérifie la disponibilité et la version de Tippecanoe
   */
  async checkTippecanoe() {
    return new Promise((resolve) => {
      const tippecanoe = spawn('tippecanoe', ['--version']);
      let stdout = '';
      let stderr = '';

      tippecanoe.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      tippecanoe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      tippecanoe.on('close', (code) => {
        if (code === 0) {
          const version = stdout.trim() || stderr.trim();
          resolve({
            status: 'ok',
            version: version || 'unknown',
            available: true
          });
        } else {
          resolve({
            status: 'error',
            available: false,
            error: 'Tippecanoe non disponible'
          });
        }
      });

      tippecanoe.on('error', () => {
        resolve({
          status: 'error',
          available: false,
          error: 'Impossible de lancer Tippecanoe'
        });
      });

      // Timeout après 5 secondes
      setTimeout(() => {
        tippecanoe.kill();
        resolve({
          status: 'error',
          available: false,
          error: 'Timeout lors de la vérification de Tippecanoe'
        });
      }, 5000);
    });
  }

  /**
   * Vérifie l'existence des répertoires de travail
   */
  async checkDirectories() {
    try {
      const tempDir = await fs.pathExists('/tmp');
      const workDir = process.cwd();
      const workDirExists = await fs.pathExists(workDir);
      
      // Vérifier les permissions d'écriture dans /tmp
      let tempWritable = false;
      try {
        const testFile = '/tmp/tiler-health-check';
        await fs.writeFile(testFile, 'test');
        await fs.remove(testFile);
        tempWritable = true;
      } catch (error) {
        tempWritable = false;
      }

      return {
        temp: tempDir && tempWritable ? 'ok' : 'error',
        working: workDirExists ? 'ok' : 'error'
      };
    } catch (error) {
      return {
        temp: 'error',
        working: 'error'
      };
    }
  }

  /**
   * Vérifie les variables d'environnement requises
   */
  checkEnvironment() {
    const requiredVars = [
      'PORT'
    ];

    const checks = {};
    
    requiredVars.forEach(varName => {
      checks[varName.toLowerCase()] = process.env[varName] ? 'ok' : 'warning';
    });

    return checks;
  }

  /**
   * Détermine le statut global basé sur les checks
   */
  determineOverallStatus(checks) {
    const flatChecks = this.flattenChecks(checks);
    
    if (flatChecks.some(check => check === 'error')) {
      return 'error';
    }
    
    if (flatChecks.some(check => check === 'warning')) {
      return 'degraded';
    }
    
    return 'ok';
  }

  /**
   * Aplatit les checks imbriqués pour l'analyse
   */
  flattenChecks(checks) {
    const result = [];
    
    Object.values(checks).forEach(check => {
      if (typeof check === 'string') {
        result.push(check);
      } else if (typeof check === 'object') {
        if (check.status) {
          result.push(check.status);
        } else {
          result.push(...this.flattenChecks(check));
        }
      }
    });
    
    return result;
  }
}

module.exports = HealthService;