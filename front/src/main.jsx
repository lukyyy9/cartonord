import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MapEditor from './admin/MapEditor.jsx'
import RoquefortLesPins from './user/RoquefortLesPins.jsx'
import './style/App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapEditor />} />
        <Route path="/roquefort-les-pins" element={<RoquefortLesPins />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)