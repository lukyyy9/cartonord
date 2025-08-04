const { Library, Pictogram, sequelize } = require('../models');
const { Op } = require('sequelize');

class LibrariesService {
  /**
   * Récupère toutes les librairies
   */
  async getAllLibraries() {
    return await Library.findAll({
      include: [
        {
          model: Pictogram,
          as: 'pictograms',
          attributes: ['id', 'name', 'category', 'publicUrl']
        }
      ],
      order: [['name', 'ASC']]
    });
  }

  /**
   * Récupère une librairie par ID
   */
  async getLibraryById(id) {
    const library = await Library.findByPk(id, {
      include: [
        {
          model: Pictogram,
          as: 'pictograms',
          order: [['name', 'ASC']]
        }
      ]
    });

    if (!library) {
      return null;
    }

    return library;
  }

  /**
   * Crée une nouvelle librairie
   */
  async createLibrary(libraryData) {
    const { name } = libraryData;

    // Vérifier si une librairie avec ce nom existe déjà
    const existingLibrary = await Library.findOne({ where: { name } });
    if (existingLibrary) {
      throw new Error('Une librairie avec ce nom existe déjà');
    }

    const library = await Library.create({
      name
    });

    return library;
  }

  /**
   * Met à jour une librairie
   */
  async updateLibrary(id, libraryData) {
    const library = await Library.findByPk(id);
    
    if (!library) {
      return null;
    }

    const { name } = libraryData;

    // Vérifier si une autre librairie avec ce nom existe déjà
    if (name && name !== library.name) {
      const existingLibrary = await Library.findOne({ 
        where: { 
          name,
          id: { [Op.ne]: id }
        }
      });
      if (existingLibrary) {
        throw new Error('Une librairie avec ce nom existe déjà');
      }
    }

    await library.update({
      name: name || library.name
    });

    return await this.getLibraryById(id);
  }

  /**
   * Supprime une librairie
   */
  async deleteLibrary(id) {
    const library = await Library.findByPk(id);
    
    if (!library) {
      return null;
    }

    // Mettre à jour les pictogrammes pour enlever la référence à cette librairie
    await Pictogram.update(
      { libraryId: null },
      { where: { libraryId: id } }
    );

    await library.destroy();
    return { message: 'Librairie supprimée avec succès' };
  }

  /**
   * Récupère les pictogrammes d'une librairie
   */
  async getLibraryPictograms(libraryId) {
    const library = await Library.findByPk(libraryId);
    if (!library) {
      return null;
    }

    return await Pictogram.findAll({
      where: { libraryId },
      order: [['name', 'ASC']]
    });
  }
}

module.exports = new LibrariesService();
