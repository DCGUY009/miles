import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { MessageSquare, Settings as SettingsIcon } from 'lucide-react';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import './index.css';

function App() {
  return (
    <Router>
      <div className="sidebar">
        <h2>System Helper</h2>
        <div className="nav-links">
          <NavLink to="/chat" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <MessageSquare size={20} />
            Chatbot
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <SettingsIcon size={20} />
            MCP Servers
          </NavLink>
        </div>
      </div>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
