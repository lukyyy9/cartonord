// Configuration de l'API
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : `${window.location.protocol}//${window.location.hostname}:3001`;

// Service pour récupérer une carte publiée par son slug
export const getMapBySlug = async (slug) => {
  const response = await fetch(`${API_BASE_URL}/${slug}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Carte non trouvée');
    }
    throw new Error('Erreur lors du chargement de la carte');
  }
  
  return response.json();
};

export default {
  getMapBySlug
};
