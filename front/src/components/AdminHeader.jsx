import React from 'react';
import { useAuth } from '../contexts/AuthContext';

function AdminHeader() {
  const { admin, logout } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      await logout();
    }
  };

  return (
    <header className="admin-header">
      <div className="admin-header-content">
        <h1>Cartonord Admin</h1>
        <div className="admin-user-info">
          <span>Connecté en tant que: {admin?.username}</span>
          <button onClick={handleLogout} className="logout-btn">
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;