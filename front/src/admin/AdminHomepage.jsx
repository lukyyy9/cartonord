import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import AdminHeader from '../components/AdminHeader';

const AdminHomepage = () => {
  const [maps, setMaps] = useState([]);
  const [selectedMap, setSelectedMap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const getStatusColor = (status) => {
    const statusColors = {
      draft: '#ffa500',
      processing: '#2196f3',
      ready: '#4caf50',
      tileset_error: '#f44336',
      error: '#f44336'
    };
    return statusColors[status] || '#757575';
  };

  const getStatusLabel = (status) => {
    const statusLabels = {
      draft: 'Brouillon',
      processing: 'En cours',
      ready: 'Prêt',
      tileset_error: 'Erreur tileset',
      error: 'Erreur'
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
        <div className="maps-sidebar">
          <div className="sidebar-header">
            <h2>Cartes ({maps.length})</h2>
            <button 
              className="create-map-btn"
              onClick={handleCreateMap}
            >
              + Nouvelle carte
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
                    <div className="map-layers">
                      {map.layers?.length || 0} couche(s)
                    </div>
                    <div className="map-date">
                      MàJ le {formatDate(map.updatedAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="map-details">
          {selectedMap ? (
            <div className="details-content">
              <div className="details-header">
                <h2>{selectedMap.name}</h2>
                <div className="map-actions">
                  <button
                    className="edit-btn"
                    onClick={() => handleEditMap(selectedMap.id)}
                  >
                    Lancer l'éditeur
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteMap(selectedMap.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div className="details-body">
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
          ) : (
            <div className="no-selection">
              <p>Sélectionnez une carte pour voir ses détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHomepage;
