const jwt = require('jsonwebtoken');
const { Admin } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant ou invalide' });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Vérifier que l'admin existe toujours
      const admin = await Admin.findByPk(decoded.adminId);
      if (!admin) {
        return res.status(401).json({ error: 'Administrateur non trouvé' });
      }
      
      req.admin = admin;
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
  } catch (error) {
    console.error('Erreur dans le middleware d\'authentification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = authMiddleware;