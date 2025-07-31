const express = require('express');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const authMiddleware = require('../middlewares/auth');

const router = express.Router();

// Fonction pour générer les tokens
const generateTokens = (adminId) => {
  const accessToken = jwt.sign(
    { adminId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
  
  const refreshToken = jwt.sign(
    { adminId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  
  return { accessToken, refreshToken };
};

// POST /auth/login - Connexion
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Nom d\'utilisateur et mot de passe requis' 
      });
    }
    
    // Trouver l'admin par nom d'utilisateur
    const admin = await Admin.findOne({ where: { username } });
    
    if (!admin) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    
    // Vérifier le mot de passe
    const isValidPassword = await admin.validatePassword(password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }
    
    // Mettre à jour la dernière connexion
    await admin.update({ lastLogin: new Date() });
    
    // Générer les tokens
    const { accessToken, refreshToken } = generateTokens(admin.id);
    
    res.json({
      message: 'Connexion réussie',
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        username: admin.username,
        lastLogin: admin.lastLogin
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /auth/refresh - Rafraîchir le token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requis' });
    }
    
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      // Vérifier que l'admin existe
      const admin = await Admin.findByPk(decoded.adminId);
      if (!admin) {
        return res.status(401).json({ error: 'Administrateur non trouvé' });
      }
      
      // Générer de nouveaux tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(admin.id);
      
      res.json({
        accessToken,
        refreshToken: newRefreshToken
      });
      
    } catch (jwtError) {
      return res.status(401).json({ error: 'Refresh token invalide ou expiré' });
    }
    
  } catch (error) {
    console.error('Erreur lors du refresh:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /auth/me - Profil de l'admin connecté
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      admin: {
        id: req.admin.id,
        username: req.admin.username,
        lastLogin: req.admin.lastLogin
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /auth/logout - Déconnexion (côté client)
router.post('/logout', authMiddleware, (req, res) => {
  // Dans un vrai système, on pourrait blacklister le token
  res.json({ message: 'Déconnexion réussie' });
});

module.exports = router;