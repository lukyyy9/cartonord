import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import AdminHeader from '../components/AdminHeader';

const AdminHomepage = () => {
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    slug: ''
  });
  const [activeTab, setActiveTab] = useState('maps');
  const [pictograms, setPictograms] = useState([]);
  const [selectedPictogram, setSelectedPictogram] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchMaps = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/api/maps');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des cartes');
      }
      const mapsData = await response.json();
      setMaps(mapsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMap = async () => {
    const mapName = prompt('Nom de la nouvelle carte :');
    if (mapName) {
      try {
        const response = await apiService.post('/api/maps', {
          name: mapName,
          description: '',
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la création de la carte');
        }

        const newMap = await response.json();
        setMaps([newMap, ...maps]);
        // Rediriger vers l'éditeur de carte
        navigate(`/admin/editor/${newMap.id}`);
      } catch (err) {
        alert('Erreur lors de la création : ' + err.message);
      }
    }
  };

  const handleMapSelect = (map) => {
    setSelectedMap(map);
  };

  const handleEditMap = (mapId) => {
    navigate(`/admin/editor/${mapId}`);
  };

  const handleDeleteMap = async (mapId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette carte ? Cette action est irréversible.')) {
      try {
        const response = await apiService.delete(`/api/maps/${mapId}`);
        if (!response.ok) {
          throw new Error('Erreur lors de la suppression');
        }
        // Retirer la carte de la liste
        setMaps(maps.filter(map => map.id !== mapId));
        // Désélectionner si c'était la carte sélectionnée
        if (selectedMap && selectedMap.id === mapId) {
          setSelectedMap(null);
        }
      } catch (err) {
        alert('Erreur lors de la suppression : ' + err.message);
      }
    }
  };

  const handleEditMapInfo = (map) => {
    setEditFormData({
      name: map.name || '',
      description: map.description || '',
      slug: map.slug || ''
    });
    setShowEditModal(true);
  };

  const handleSaveMapInfo = async () => {
    if (!selectedMap || !editFormData.name.trim()) {
      alert('Le nom de la carte est obligatoire');
      return;
    }

    try {
      const response = await apiService.patch(`/api/maps/${selectedMap.id}/metadata`, {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        slug: editFormData.slug.trim()
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour');
      }

      const updatedMap = await response.json();
      
      // Mettre à jour la liste des cartes
      setMaps(maps.map(map => 
        map.id === selectedMap.id ? updatedMap : map
      ));
      
      // Mettre à jour la carte sélectionnée
      setSelectedMap(updatedMap);
      
      // Fermer la modal
      setShowEditModal(false);
      
      alert('Informations mises à jour avec succès !');
    } catch (err) {
      alert('Erreur lors de la mise à jour : ' + err.message);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditFormData({ name: '', description: '', slug: '' });
  };

  const handlePublishMap = async (mapId) => {
    try {
      const response = await apiService.post(`/api/maps/${mapId}/publish`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la publication');
      }
      
      const publishedMap = await response.json();
      
      // Mettre à jour la liste des cartes
      setMaps(maps.map(map => 
        map.id === mapId ? publishedMap : map
      ));
      
      // Mettre à jour la carte sélectionnée si c'est celle-ci
      if (selectedMap && selectedMap.id === mapId) {
        setSelectedMap(publishedMap);
      }
      
      alert('Carte publiée avec succès !');
    } catch (err) {
      alert('Erreur lors de la publication : ' + err.message);
    }
  };

  const handleUnpublishMap = async (mapId) => {
    if (window.confirm('Êtes-vous sûr de vouloir dépublier cette carte ? Elle ne sera plus accessible publiquement.')) {
      try {
        const response = await apiService.post(`/api/maps/${mapId}/unpublish`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la dépublication');
        }
        
        const unpublishedMap = await response.json();
        
        // Mettre à jour la liste des cartes
        setMaps(maps.map(map => 
          map.id === mapId ? unpublishedMap : map
        ));
        
        // Mettre à jour la carte sélectionnée si c'est celle-ci
        if (selectedMap && selectedMap.id === mapId) {
          setSelectedMap(unpublishedMap);
        }
        
        alert('Carte dépubliée avec succès !');
      } catch (err) {
        alert('Erreur lors de la dépublication : ' + err.message);
      }
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      draft: '#ffa500',
      processing: '#2196f3',
      ready: '#757575',
      tileset_error: '#f44336',
      error: '#f44336',
      published: '#4caf50'
    };
    return statusColors[status] || '#757575';
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      draft: 'Brouillon',
      processing: 'En cours',
      ready: 'Prêt',
      tileset_error: 'Erreur tileset',
      error: 'Erreur',
      published: 'Publié'
    };
    return statusLabels[status] || status;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePictogramSelect = (pictogram) => {
    setSelectedPictogram(pictogram);
  };

  const handleDeletePictogram = async (pictogramId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce pictogramme ? Cette action est irréversible.')) {
      try {
        // TODO: Remplacer par un vrai appel API
        setPictograms(pictograms.filter(pictogram => pictogram.id !== pictogramId));
        if (selectedPictogram && selectedPictogram.id === pictogramId) {
          setSelectedPictogram(null);
        }
        alert('Pictogramme supprimé avec succès !');
      } catch (err) {
        alert('Erreur lors de la suppression : ' + err.message);
      }
    }
  };

  // Charger les pictogrammes quand l'onglet pictogrammes est activé
  useEffect(() => {
    if (activeTab === 'pictograms' && pictograms.length === 0) {
      //fetchPictograms();
    }
  }, [activeTab, pictograms.length]);

  if (loading) {
    return (
      <div className="admin-homepage">
        <div className="loading">Chargement des cartes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-homepage">
        <div className="error">Erreur : {error}</div>
      </div>
    );
  }

  return (
    <div className="admin-homepage">
      <AdminHeader />
      
      <div className="admin-content">
        {/* Panneau latéral avec onglets */}
        <div className="admin-sidebar">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'maps' ? 'active' : ''}`}
              onClick={() => setActiveTab('maps')}
            >
              Cartes
            </button>
            <button 
              className={`tab ${activeTab === 'pictograms' ? 'active' : ''}`}
              onClick={() => setActiveTab('pictograms')}
            >
              Pictogrammes
            </button>
          </div>

          {/* Contenu de l'onglet Cartes */}
          <div className={`tab-content ${activeTab === 'maps' ? 'active' : ''}`}>
            <div className="sidebar-header">
              <h2>Cartes ({maps.length})</h2>
              <button 
                className="create-map-btn"
                onClick={handleCreateMap}
              >
                + Nouvelle
              </button>
            </div>

            <div className="maps-list">
              {maps.length === 0 ? (
                <div className="no-maps">
                  Aucune carte créée.
                  <br />
                  Créez votre première carte !
                </div>
              ) : (
                maps.map(map => (
                  <div
                    key={map.id}
                    className={`map-item ${selectedMap?.id === map.id ? 'selected' : ''}`}
                    onClick={() => handleMapSelect(map)}
                  >
                    <div className="map-item-header">
                      <h3 className="map-name">{map.name}</h3>
                      <div 
                        className="map-status"
                        style={{ backgroundColor: getStatusColor(map.status) }}
                      >
                        {getStatusLabel(map.status)}
                      </div>
                    </div>
                    
                    <div className="map-info">
                      <div>
                        MàJ le {formatDate(map.updatedAt)}
                      </div>
                      <div>
                        {map.slug && map.status === 'published' ? (
                          <a 
                            href={`/${map.slug}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="slug-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            /{map.slug}
                          </a>
                        ) : (
                          `/${map.slug || ''}`
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Contenu de l'onglet Pictogrammes */}
          <div className={`tab-content ${activeTab === 'pictograms' ? 'active' : ''}`}>
            <div className="sidebar-header">
              <h2>Bibliothèques ({pictograms.length})</h2>
              <button 
                className="create-map-btn"
                //onClick={handleCreatePictogram}
              >
                + Nouvelle
              </button>
            </div>

            <div className="maps-list">
              {pictograms.length === 0 ? (
                <div className="no-maps">
                  Aucune bibliothèque créée.
                  <br />
                  Créez votre première bibliothèque !
                </div>
              ) : (
                pictograms.map(pictogram => (
                  <div
                    key={pictogram.id}
                    className={`map-item ${selectedPictogram?.id === pictogram.id ? 'selected' : ''}`}
                    onClick={() => handlePictogramSelect(pictogram)}
                  >
                    <div className="map-item-header">
                      <h3 className="map-name">{pictogram.name}</h3>
                    </div>
                    
                    <div className="map-info">
                      <div>
                        Nombre de pictogrammes :
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Zone principale de contenu */}
        <div className="main-content">
          {activeTab === 'maps' && selectedMap ? (
            <div className="details-content">
              <div className="details-header">
                <h2>{selectedMap.name}</h2>
              </div>
              <div className="details-body">
                <div className="detail-section">
                  <h3>Actions</h3>
                  <div className="map-actions">
                    <button
                      className="edit-info-btn"
                      onClick={() => handleEditMapInfo(selectedMap)}
                    >
                      Modifier informations
                    </button>
                  <button
                    className="edit-btn"
                    onClick={() => handleEditMap(selectedMap.id)}
                  >
                    Lancer l'éditeur
                  </button>
                  {selectedMap.status === 'published' ? (
                    <button
                      className="unpublish-btn"
                      onClick={() => handleUnpublishMap(selectedMap.id)}
                    >
                      Dépublier
                    </button>
                  ) : selectedMap.status === 'ready' ? (
                    <button
                      className="publish-btn"
                      onClick={() => handlePublishMap(selectedMap.id)}
                    >
                      Publier
                    </button>
                  ) : null}
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteMap(selectedMap.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
                <div className="detail-section">
                  <h3>Informations générales</h3>
                  <div className="detail-item">
                    <label>Statut :</label>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(selectedMap.status) }}
                    >
                      {getStatusLabel(selectedMap.status)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Slug :</label>
                    <span>
                      {selectedMap.slug ? (
                        selectedMap.status === 'published' ? (
                          <a 
                            href={`/${selectedMap.slug}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="slug-link"
                          >
                            /{selectedMap.slug}
                          </a>
                        ) : (
                          `/${selectedMap.slug}`
                        )
                      ) : (
                        'non-défini'
                      )}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Créée le :</label>
                    <span>{formatDate(selectedMap.createdAt)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Modifiée le :</label>
                    <span>{formatDate(selectedMap.updatedAt)}</span>
                  </div>
                  {selectedMap.description && (
                    <div className="detail-item">
                      <label>Description :</label>
                      <span>{selectedMap.description}</span>
                    </div>
                  )}
                </div>

                <div className="detail-section">
                  <h3>Configuration de la carte</h3>
                  {selectedMap.config ? (
                    <>
                      <div className="detail-item">
                        <label>Centre :</label>
                        <span>
                          [{selectedMap.config.center?.[0]?.toFixed(5)}, {selectedMap.config.center?.[1]?.toFixed(5)}]
                        </span>
                      </div>
                      <div className="detail-item">
                        <label>Zoom :</label>
                        <span>{selectedMap.config.zoom}</span>
                      </div>
                      <div className="detail-item">
                        <label>Zoom min/max :</label>
                        <span>{selectedMap.config.minZoom} - {selectedMap.config.maxZoom}</span>
                      </div>
                    </>
                  ) : (
                    <p className="no-data">Aucune configuration disponible</p>
                  )}
                </div>

                <div className="detail-section">
                  <h3>Couches ({selectedMap.layers?.length || 0})</h3>
                  {selectedMap.layers && selectedMap.layers.length > 0 ? (
                    <div className="layers-summary">
                      {selectedMap.layers.map((layer, index) => (
                        <div key={layer.id || index} className="layer-summary">
                          <div className="layer-summary-header">
                            <span className="layer-summary-name">{layer.name || layer.fileName || `Couche ${index + 1}`}</span>
                            <span className="layer-type">{layer.layerType || 'mixed'}</span>
                          </div>
                          <div className="layer-summary-details">
                            <span>Z-index: {layer.z_index || index}</span>
                            {layer.style && (
                              <span style={{ 
                                backgroundColor: layer.style.color || '#ccc',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '0.8em'
                              }}>
                                Couleur
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">Aucune couche définie</p>
                  )}
                </div>

                <div className="detail-section">
                  <h3>Points d'intérêt ({selectedMap.pointsOfInterest?.length || 0})</h3>
                  {selectedMap.pointsOfInterest && selectedMap.pointsOfInterest.length > 0 ? (
                    <div className="poi-summary">
                      {selectedMap.pointsOfInterest.slice(0, 5).map((poi, index) => (
                        <div key={poi.id || index} className="poi-summary-item">
                          <span className="poi-name">{poi.name || `Point ${index + 1}`}</span>
                          <span className="poi-coords">
                            [{poi.coordinates?.[0]?.toFixed(3)}, {poi.coordinates?.[1]?.toFixed(3)}]
                          </span>
                        </div>
                      ))}
                      {selectedMap.pointsOfInterest.length > 5 && (
                        <div className="poi-more">
                          Et {selectedMap.pointsOfInterest.length - 5} autre(s)...
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="no-data">Aucun point d'intérêt défini</p>
                  )}
                </div>

                {selectedMap.tilesetPath && (
                  <div className="detail-section">
                    <h3>Tileset</h3>
                    <div className="detail-item">
                      <label>Fichier :</label>
                      <span className="tileset-path">{selectedMap.tilesetPath}</span>
                    </div>
                    {selectedMap.tilesetId && (
                      <div className="detail-item">
                        <label>ID :</label>
                        <span>{selectedMap.tilesetId}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'maps' && !selectedMap ? (
            <div className="no-selection">
              <p>Sélectionnez une carte pour voir ses détails</p>
            </div>
          ) : activeTab === 'pictograms' && selectedPictogram ? (
            <div className="details-content">
              <div className="details-header">
                <h2>{selectedPictogram.name}</h2>
              </div>
              <div className="details-body">
                <div className="detail-section">
                  <h3>Actions</h3>
                  <div className="map-actions">
                    <button
                      className="edit-btn"
                      onClick={() => alert('Fonctionnalité d\'édition à venir...')}
                    >
                      Modifier
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeletePictogram(selectedPictogram.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Informations générales</h3>
                  <div className="detail-item">
                    <label>Type :</label>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: '#4caf50' }}
                    >
                      {selectedPictogram.type}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Nom du fichier :</label>
                    <span>{selectedPictogram.fileName}</span>
                  </div>
                  <div className="detail-item">
                    <label>Chemin complet :</label>
                    <span>/pictogrammes/{selectedPictogram.fileName}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Aperçu</h3>
                  <div className="pictogram-preview">
                    <img 
                      src={`/pictogrammes/${selectedPictogram.fileName}`}
                      alt={selectedPictogram.name}
                      style={{ 
                        maxWidth: '64px', 
                        maxHeight: '64px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '8px'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div style={{ display: 'none', color: '#666', fontStyle: 'italic' }}>
                      Image non disponible
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'pictograms' && !selectedPictogram ? (
            <div className="no-selection">
              <p>Sélectionnez un pictogramme pour voir ses détails</p>
            </div>
          ) : activeTab === 'pictograms' ? (
            <div className="pictograms-main-content">
              <div className="pictograms-header">
                <h2>Gestion des Pictogrammes</h2>
              </div>
              <div className="pictograms-content">
                <p>Interface de gestion des pictogrammes à venir...</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal d'édition des métadonnées */}
      {showEditModal && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Modifier les informations de la carte</h3>
              <button className="close-modal-btn" onClick={handleCloseEditModal}>×</button>
            </div>
            
            <div className="edit-modal-body">
              <div className="form-group">
                <label htmlFor="map-name">Nom de la carte *</label>
                <input
                  type="text"
                  id="map-name"
                  value={editFormData.name}
                  onChange={(e) => {
                    setEditFormData(prev => ({ ...prev, name: e.target.value }));
                  }}
                  placeholder="Nom de votre carte"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="map-description">Description</label>
                <textarea
                  id="map-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description de votre carte"
                  rows="4"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="map-slug">Slug (URL)</label>
                <input
                  type="text"
                  id="map-slug"
                  value={editFormData.slug}
                  onChange={(e) => {
                    const slugValue = e.target.value.replace(/\s+/g, '-');
                    setEditFormData(prev => ({ ...prev, slug: slugValue }));
                  }}
                  placeholder="slug-de-votre-carte"
                />
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button 
                className="cancel-btn" 
                onClick={handleCloseEditModal}
              >
                Annuler
              </button>
              <button 
                className="save-btn" 
                onClick={handleSaveMapInfo}
                disabled={!editFormData.name.trim()}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHomepage;
