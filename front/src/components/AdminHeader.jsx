import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

function AdminHeader({ mapName = null }) {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isEditorPage = location.pathname.includes('/admin/editor');

  const handleLogout = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await logout();
    }
  };

  const handleBackToHome = () => {
    navigate('/admin');
  };

  return (
    <header className="admin-header">
      <div className="admin-header-content">
        <div className="admin-header-left">
          <h1>Cartonord Admin</h1>
          {isEditorPage && (
            <div className="breadcrumb">
              <button 
                className="back-btn"
                onClick={handleBackToHome}
                title="Retour à l'accueil"
              >
                ← Retour
              </button>
              {mapName && (
                <span className="current-map">
                  / Édition de: {mapName}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="admin-user-info">
          <button onClick={handleLogout} className="logout-btn">
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;