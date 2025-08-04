const { Pictogram, Library } = require('../models');
const { Op } = require('sequelize');

class PictogramsService {
  
  /**
   * Récupère tous les pictogrammes avec filtres optionnels
   */
  async getAllPictograms(filters = {}) {
    try {
      const whereClause = {};
      
      if (filters.category) {
        whereClause.category = filters.category;
      }
      
      if (filters.libraryId) {
        whereClause.libraryId = filters.libraryId;
      }

      const pictograms = await Pictogram.findAll({
        where: whereClause,
        include: [
          {
            model: Library,
            as: 'library',
            attributes: ['id', 'name']
          }
        ],
        order: [['category', 'ASC'], ['name', 'ASC']]
      });

      return pictograms;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des pictogrammes: ${error.message}`);
    }
  }

  /**
   * Récupère un pictogramme par son ID
   */
  async getPictogramById(id) {
    try {
      const pictogram = await Pictogram.findByPk(id, {
        include: [
          {
            model: Library,
            as: 'library',
            attributes: ['id', 'name']
          }
        ]
      });

      return pictogram;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du pictogramme: ${error.message}`);
    }
  }

  /**
   * Crée un nouveau pictogramme
   */
  async createPictogram(data) {
    try {
      const { name, category, filePath, publicUrl, libraryId, svgData, metadata } = data;

      // Validation des champs obligatoires
      if (!name || !filePath || !publicUrl || !libraryId) {
        throw new Error('Le nom, le chemin du fichier, l\'URL publique et l\'ID de la librairie sont requis');
      }

      // Vérifier que la librairie existe
      const library = await Library.findByPk(libraryId);
      if (!library) {
        throw new Error('La librairie spécifiée n\'existe pas');
      }

      // Vérifier si un pictogramme avec ce nom existe déjà
      const existingPictogram = await Pictogram.findOne({ where: { name } });
      if (existingPictogram) {
        throw new Error('Un pictogramme avec ce nom existe déjà');
      }

      const pictogram = await Pictogram.create({
        name,
        category: category || null,
        filePath,
        publicUrl,
        libraryId,
        svgData,
        metadata: metadata || {}
      });

      // Récupérer le pictogramme avec ses relations
      return await this.getPictogramById(pictogram.id);
    } catch (error) {
      throw new Error(`Erreur lors de la création du pictogramme: ${error.message}`);
    }
  }

  /**
   * Crée plusieurs pictogrammes en une seule opération
   */
  async createMultiplePictograms(pictogramsData) {
    try {
      if (!Array.isArray(pictogramsData) || pictogramsData.length === 0) {
        throw new Error('Un tableau de pictogrammes est requis');
      }

      const results = [];
      const errors = [];

      // Traiter chaque pictogramme individuellement
      for (let i = 0; i < pictogramsData.length; i++) {
        try {
          const pictogramData = pictogramsData[i];
          
          // Validation des champs obligatoires pour chaque pictogramme
          if (!pictogramData.name || !pictogramData.filePath || !pictogramData.publicUrl || !pictogramData.libraryId) {
            throw new Error(`Pictogramme ${i + 1}: Le nom, le chemin du fichier, l'URL publique et l'ID de la librairie sont requis`);
          }

          // Vérifier que la librairie existe
          const library = await Library.findByPk(pictogramData.libraryId);
          if (!library) {
            throw new Error(`Pictogramme ${i + 1}: La librairie spécifiée n'existe pas`);
          }

          // Vérifier si un pictogramme avec ce nom existe déjà
          const existingPictogram = await Pictogram.findOne({ where: { name: pictogramData.name } });
          if (existingPictogram) {
            throw new Error(`Pictogramme ${i + 1}: Un pictogramme avec ce nom existe déjà`);
          }

          const pictogram = await Pictogram.create({
            name: pictogramData.name,
            category: pictogramData.category || null,
            filePath: pictogramData.filePath,
            publicUrl: pictogramData.publicUrl,
            libraryId: pictogramData.libraryId,
            svgData: pictogramData.svgData,
            metadata: pictogramData.metadata || {}
          });

          // Récupérer le pictogramme avec ses relations
          const createdPictogram = await this.getPictogramById(pictogram.id);
          results.push(createdPictogram);

        } catch (error) {
          errors.push({
            index: i,
            pictogram: pictogramsData[i],
            error: error.message
          });
        }
      }

      return {
        success: results,
        errors: errors,
        total: pictogramsData.length,
        created: results.length,
        failed: errors.length
      };

    } catch (error) {
      throw new Error(`Erreur lors de la création des pictogrammes: ${error.message}`);
    }
  }

  /**
   * Met à jour un pictogramme
   */
  async updatePictogram(id, data) {
    try {
      const pictogram = await Pictogram.findByPk(id);
      if (!pictogram) {
        throw new Error('Pictogramme non trouvé');
      }

      const { name, category, filePath, publicUrl, libraryId, svgData, metadata } = data;

      // Vérifier que la librairie existe si elle est fournie
      if (libraryId) {
        const library = await Library.findByPk(libraryId);
        if (!library) {
          throw new Error('La librairie spécifiée n\'existe pas');
        }
      }

      // Vérifier si un autre pictogramme avec ce nom existe déjà
      if (name && name !== pictogram.name) {
        const existingPictogram = await Pictogram.findOne({ 
          where: { 
            name,
            id: { [Op.ne]: id }
          }
        });
        if (existingPictogram) {
          throw new Error('Un pictogramme avec ce nom existe déjà');
        }
      }

      await pictogram.update({
        ...(name && { name }),
        ...(category && { category }),
        ...(filePath && { filePath }),
        ...(publicUrl && { publicUrl }),
        ...(libraryId && { libraryId }),
        ...(svgData !== undefined && { svgData }),
        ...(metadata && { metadata })
      });

      // Récupérer le pictogramme mis à jour avec ses relations
      return await this.getPictogramById(id);
    } catch (error) {
      throw new Error(`Erreur lors de la mise à jour du pictogramme: ${error.message}`);
    }
  }

  /**
   * Supprime un pictogramme
   */
  async deletePictogram(id) {
    try {
      const pictogram = await Pictogram.findByPk(id);
      if (!pictogram) {
        throw new Error('Pictogramme non trouvé');
      }

      await pictogram.destroy();
      return true;
    } catch (error) {
      throw new Error(`Erreur lors de la suppression du pictogramme: ${error.message}`);
    }
  }

  /**
   * Récupère toutes les catégories de pictogrammes
   */
  async getCategories(libraryId = null) {
    try {
      const whereClause = {};
      if (libraryId) {
        whereClause.libraryId = libraryId;
      }

      const categories = await Pictogram.findAll({
        attributes: ['category'],
        where: whereClause,
        group: ['category'],
        order: [['category', 'ASC']]
      });

      return categories.map(item => item.category);
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des catégories: ${error.message}`);
    }
  }
}

module.exports = new PictogramsService();
