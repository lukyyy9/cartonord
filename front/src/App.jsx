import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './admin/Login';
import MapEditor from './admin/MapEditor';
import RoquefortLesPins from './user/RoquefortLesPins';
import ProtectedRoute from './components/ProtectedRoute';
import './style/App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <MapEditor />
            </ProtectedRoute>
          } />
          <Route path="/roquefort-les-pins" element={<RoquefortLesPins />} />
          <Route path="/" element={<RoquefortLesPins />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;