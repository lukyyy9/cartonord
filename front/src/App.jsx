import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './admin/Login';
import AdminHomepage from './admin/AdminHomepage';
import MapEditor from './admin/MapEditor';
import MapViewer from './user/MapViewer';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminHomepage />
            </ProtectedRoute>
          } />
          <Route path="/admin/editor/:mapId" element={
            <ProtectedRoute>
              <MapEditor />
            </ProtectedRoute>
          } />
          {/* Route dynamique pour les cartes publiées via slug */}
          <Route path="/:slug" element={<MapViewer />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;