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
  const [libraries, setLibraries] = useState([]);
  const [selectedLibrary, setSelectedLibrary] = useState(null);
  const [showEditLibraryModal, setShowEditLibraryModal] = useState(false);
  const [libraryFormData, setLibraryFormData] = useState({
    name: ''
  });
  const [showAddPictogramModal, setShowAddPictogramModal] = useState(false);
  const [pictogramFiles, setPictogramFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMaps();
  }, []);

  const fetchLibraries = async () => {
    try {
      const response = await apiService.get('/api/libraries');
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des bibliothèques');
      }
      const librariesData = await response.json();
      
      // Récupérer les pictogrammes pour chaque bibliothèque
      const librariesWithPictograms = await Promise.all(
        librariesData.map(async (library) => {
          try {
            const pictogramsResponse = await apiService.get(`/api/libraries/${library.id}/pictograms`);
            if (pictogramsResponse.ok) {
              const pictograms = await pictogramsResponse.json();
              return { ...library, pictograms };
            }
            return { ...library, pictograms: [] };
          } catch (err) {
            console.error(`Erreur lors du chargement des pictogrammes pour la bibliothèque ${library.id}:`, err);
            return { ...library, pictograms: [] };
          }
        })
      );
      
      setLibraries(librariesWithPictograms);
    } catch (err) {
      console.error('Erreur lors du chargement des bibliothèques:', err);
    }
  };

  const handleCreateLibrary = async () => {
    const libraryName = prompt('Nom de la nouvelle bibliothèque :');
    if (libraryName) {
      try {
        const response = await apiService.post('/api/libraries', {
          name: libraryName.trim()
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la création de la bibliothèque');
        }

        const newLibrary = await response.json();
        setLibraries([newLibrary, ...libraries]);
        alert('Bibliothèque créée avec succès !');
      } catch (err) {
        alert('Erreur lors de la création : ' + err.message);
      }
    }
  };

  const handleEditLibrary = (library) => {
    setLibraryFormData({ name: library.name });
    setShowEditLibraryModal(true);
  };

  const handleUpdateLibrary = async () => {
    if (!libraryFormData.name.trim()) {
      alert('Le nom de la bibliothèque est obligatoire');
      return;
    }

    try {
      const response = await apiService.put(`/api/libraries/${selectedLibrary.id}`, {
        name: libraryFormData.name.trim()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour de la bibliothèque');
      }

      const updatedLibrary = await response.json();
      setLibraries(libraries.map(lib => 
        lib.id === selectedLibrary.id ? updatedLibrary : lib
      ));
      setSelectedLibrary(updatedLibrary);
      setShowEditLibraryModal(false);
      alert('Bibliothèque mise à jour avec succès !');
    } catch (err) {
      alert('Erreur lors de la mise à jour : ' + err.message);
    }
  };

  const handleDeleteLibrary = async (libraryId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette bibliothèque ? Cette action est irréversible.')) {
      try {
        const response = await apiService.delete(`/api/libraries/${libraryId}`);
        if (!response.ok) {
          throw new Error('Erreur lors de la suppression');
        }
        
        setLibraries(libraries.filter(lib => lib.id !== libraryId));
        if (selectedLibrary && selectedLibrary.id === libraryId) {
          setSelectedLibrary(null);
        }
        alert('Bibliothèque supprimée avec succès !');
      } catch (err) {
        alert('Erreur lors de la suppression : ' + err.message);
      }
    }
  };

  const handleLibrarySelect = (library) => {
    setSelectedLibrary(library);
  };

  const handleCloseEditLibraryModal = () => {
    setShowEditLibraryModal(false);
    setLibraryFormData({ name: '' });
  };

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

  // Gestion des pictogrammes
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => 
      file.type.startsWith('image/') && 
      ['image/png', 'image/jpg', 'image/jpeg', 'image/svg+xml', 'image/gif'].includes(file.type)
    );
    
    if (imageFiles.length !== files.length) {
      alert('Seuls les fichiers image (PNG, JPG, JPEG, SVG, GIF) sont autorisés.');
    }
    
    setPictogramFiles(imageFiles);
  };

  const handleUploadPictograms = async () => {
    if (!pictogramFiles.length || !selectedLibrary) {
      alert('Veuillez sélectionner des fichiers et une bibliothèque.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Créer FormData pour l'upload des fichiers
      const formData = new FormData();
      
      // Ajouter l'ID de la bibliothèque
      formData.append('libraryId', selectedLibrary.id);
      
      // Ajouter tous les fichiers
      pictogramFiles.forEach((file) => {
        formData.append('pictograms', file);
      });

      // Simulation du progrès d'upload
      setUploadProgress(50);

      // Envoyer les fichiers à l'API via la nouvelle route d'upload
      const response = await apiService.uploadFiles('/api/pictograms/upload', formData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'upload des pictogrammes');
      }

      const result = await response.json();
      setUploadProgress(100);
      
      // Rafraîchir la bibliothèque sélectionnée
      const libraryResponse = await apiService.get(`/api/libraries/${selectedLibrary.id}/pictograms`);
      let updatedPictograms = [];
      if (libraryResponse.ok) {
        updatedPictograms = await libraryResponse.json();
        setSelectedLibrary(prev => ({
          ...prev,
          pictograms: updatedPictograms
        }));
      }

      // Mettre à jour les libraries dans la liste
      setLibraries(prev => prev.map(lib => 
        lib.id === selectedLibrary.id 
          ? { ...lib, pictograms: updatedPictograms }
          : lib
      ));

      alert(`${result.created || pictogramFiles.length} pictogrammes uploadés et ajoutés avec succès !`);
      setShowAddPictogramModal(false);
      setPictogramFiles([]);
      
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      alert('Erreur lors de l\'upload des pictogrammes : ' + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCloseAddPictogramModal = () => {
    setShowAddPictogramModal(false);
    setPictogramFiles([]);
    setUploadProgress(0);
  };

  // Charger les bibliothèques quand l'onglet pictogrammes est activé
  useEffect(() => {
    if (activeTab === 'pictograms' && libraries.length === 0) {
      fetchLibraries();
    }
  }, [activeTab, libraries.length]);

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
              <h2>Bibliothèques ({libraries.length})</h2>
              <button 
                className="create-map-btn"
                onClick={handleCreateLibrary}
              >
                + Nouvelle
              </button>
            </div>

            <div className="maps-list">
              {libraries.length === 0 ? (
                <div className="no-maps">
                  Aucune bibliothèque créée.
                  <br />
                  Créez votre première bibliothèque !
                </div>
              ) : (
                libraries.map(library => (
                  <div
                    key={library.id}
                    className={`map-item ${selectedLibrary?.id === library.id ? 'selected' : ''}`}
                    onClick={() => handleLibrarySelect(library)}
                  >
                    <div className="map-item-header">
                      <h3 className="map-name">{library.name}</h3>
                    </div>
                    
                    <div className="map-info">
                      <div>
                        Pictogrammes : {library.pictograms?.length || 0}
                      </div>
                      <div>
                        Créée le {new Date(library.createdAt).toLocaleDateString('fr-FR')}
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
          ) : activeTab === 'pictograms' && selectedLibrary ? (
            <div className="details-content">
              <div className="details-header">
                <h2>{selectedLibrary.name}</h2>
              </div>
              <div className="details-body">
                <div className="detail-section">
                  <h3>Actions</h3>
                  <div className="map-actions">
                    <button
                      className="edit-info-btn"
                      onClick={() => handleEditLibrary(selectedLibrary)}
                    >
                      Renommer
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteLibrary(selectedLibrary.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Informations générales</h3>
                  <div className="detail-item">
                    <label>Nom :</label>
                    <span>{selectedLibrary.name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Créée le :</label>
                    <span>{new Date(selectedLibrary.createdAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                  <div className="detail-item">
                    <label>Modifiée le :</label>
                    <span>{new Date(selectedLibrary.updatedAt).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3>Pictogrammes ({selectedLibrary.pictograms?.length || 0})</h3>
                    <button
                      className="create-map-btn"
                      onClick={() => setShowAddPictogramModal(true)}
                    >
                      + Nouveaux
                    </button>
                  </div>
                  {selectedLibrary.pictograms && selectedLibrary.pictograms.length > 0 ? (
                    <div className="pictograms-grid">
                      {selectedLibrary.pictograms.map((pictogram) => (
                        <div key={pictogram.id} className="pictogram-item">
                          <div className="pictogram-preview">
                            {pictogram.publicUrl ? (
                              <img 
                                src={`http://localhost:3001${pictogram.publicUrl}`}
                                alt={pictogram.name}
                                style={{ 
                                  maxWidth: '32px', 
                                  maxHeight: '32px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  padding: '4px'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                            ) : null}
                            <div style={{ display: 'none', fontSize: '12px', color: '#666' }}>
                              N/A
                            </div>
                          </div>
                          <div className="pictogram-info">
                            <div className="pictogram-name">{pictogram.name}</div>
                            <div className="pictogram-category">{pictogram.category}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-data">Aucun pictogramme dans cette bibliothèque</p>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'pictograms' && !selectedLibrary ? (
            <div className="no-selection">
              <p>Sélectionnez une bibliothèque pour voir ses détails</p>
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

      {/* Modal d'édition de bibliothèque */}
      {showEditLibraryModal && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>Modifier la bibliothèque</h3>
              <button className="close-modal-btn" onClick={handleCloseEditLibraryModal}>×</button>
            </div>
            
            <div className="edit-modal-body">
              <div className="form-group">
                <label htmlFor="edit-library-name">Nom de la bibliothèque *</label>
                <input
                  type="text"
                  id="edit-library-name"
                  value={libraryFormData.name}
                  onChange={(e) => setLibraryFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom de votre bibliothèque"
                  required
                />
              </div>
            </div>
            
            <div className="edit-modal-footer">
              <button 
                className="cancel-btn" 
                onClick={handleCloseEditLibraryModal}
              >
                Annuler
              </button>
              <button 
                className="save-btn" 
                onClick={handleUpdateLibrary}
                disabled={!libraryFormData.name.trim()}
              >
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'ajout de pictogrammes */}
      {showAddPictogramModal && (
        <div className="edit-modal-overlay">
          <div className="edit-modal" style={{ maxWidth: '600px' }}>
            <div className="edit-modal-header">
              <h3>Ajouter des pictogrammes à {selectedLibrary?.name}</h3>
              <button className="close-modal-btn" onClick={handleCloseAddPictogramModal}>×</button>
            </div>
            
            <div className="edit-modal-body">
              <div className="form-group">
                <label htmlFor="pictogram-files">Sélectionner des fichiers images *</label>
                <input
                  type="file"
                  id="pictogram-files"
                  multiple
                  accept="image/png,image/jpg,image/jpeg,image/svg+xml,image/gif"
                  onChange={handleFileSelect}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#444',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    color: 'white'
                  }}
                />
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                  Formats supportés : PNG, JPG, JPEG, SVG, GIF
                </div>
              </div>

              {pictogramFiles.length > 0 && (
                <div className="form-group">
                  <label>Fichiers sélectionnés ({pictogramFiles.length})</label>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    background: '#333', 
                    border: '1px solid #555', 
                    borderRadius: '4px',
                    padding: '10px'
                  }}>
                    {pictogramFiles.map((file, index) => (
                      <div key={index} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '5px 0',
                        borderBottom: index < pictogramFiles.length - 1 ? '1px solid #444' : 'none'
                      }}>
                        <span style={{ fontSize: '14px', color: '#ddd' }}>
                          {file.name}
                        </span>
                        <span style={{ fontSize: '12px', color: '#aaa' }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="form-group">
                  <label>Progression</label>
                  <div style={{
                    width: '100%',
                    height: '20px',
                    background: '#333',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${uploadProgress}%`,
                      height: '100%',
                      background: '#4caf50',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="edit-modal-footer">
              <button 
                className="cancel-btn" 
                onClick={handleCloseAddPictogramModal}
                disabled={isUploading}
              >
                Annuler
              </button>
              <button 
                className="save-btn" 
                onClick={handleUploadPictograms}
                disabled={pictogramFiles.length === 0 || isUploading}
              >
                {isUploading ? 'Upload en cours...' : `Ajouter ${pictogramFiles.length} pictogramme(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHomepage;
