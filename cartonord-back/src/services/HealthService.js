const fs = require('fs-extra');

class HealthService {
  constructor() {
    this.serviceName = 'cartonord-back';
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
      // Vérification des répertoires de données
      health.checks.directories = await this.checkDirectories();
      
      // Vérification des variables d'environnement
      health.checks.environment = this.checkEnvironment();
      
      // Vérification de la connectivité au service tiler
      health.checks.tiler = await this.checkTilerService();

      // Détermination du statut global
      health.status = this.determineOverallStatus(health.checks);

    } catch (error) {
      health.status = 'error';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Vérifie l'existence des répertoires de données
   */
  async checkDirectories() {
    try {
      const dataDir = await fs.pathExists('/data');
      const projectsDir = await fs.pathExists('/data/projects');
      const cacheDir = await fs.pathExists('/data/cache');

      return {
        data: dataDir ? 'ok' : 'error',
        projects: projectsDir ? 'ok' : 'error',
        cache: cacheDir ? 'ok' : 'error'
      };
    } catch (error) {
      return {
        data: 'error',
        projects: 'error',
        cache: 'error'
      };
    }
  }

  /**
   * Vérifie les variables d'environnement requises
   */
  checkEnvironment() {
    const requiredVars = [
      'DATABASE_URL',
      'TILER_SERVICE_URL',
      'PORT'
    ];

    const checks = {};
    
    requiredVars.forEach(varName => {
      checks[varName.toLowerCase()] = process.env[varName] ? 'ok' : 'error';
    });

    return checks;
  }

  /**
   * Vérifie la connectivité au service tiler
   */
  async checkTilerService() {
    try {
      const tilerUrl = process.env.TILER_SERVICE_URL;
      if (!tilerUrl) {
        return 'error';
      }

      const response = await fetch(`${tilerUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });

      return response.ok ? 'ok' : 'error';
    } catch (error) {
      return 'error';
    }
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
        result.push(...this.flattenChecks(check));
      }
    });
    
    return result;
  }
}

module.exports = HealthService;