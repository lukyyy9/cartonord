import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import AdminHeader from '../components/AdminHeader';
import '../style/AdminHomepage.css';

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
                      Créée le {formatDate(map.created_at)}
                    </div>
                  </div>

                  {map.description && (
                    <div className="map-description">
                      {map.description}
                    </div>
                  )}

                  <div className="map-actions">
                    <button
                      className="edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditMap(map.id);
                      }}
                    >
                      Éditer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="map-details">
          {selectedMap ? (
            <div className="details-content">
              <h2>{selectedMap.name}</h2>
              <p>Détails de la carte</p>
              {/* TODO: Implémenter les détails de la carte */}
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
