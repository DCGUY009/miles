import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { MessageSquare, Settings as SettingsIcon, PlusCircle, MessageCircle } from 'lucide-react';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import './index.css';

function AppContent() {
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);

  const loadChats = () => {
    const saved = localStorage.getItem('chat_sessions');
    if (saved) {
      setChats(JSON.parse(saved).sort((a, b) => b.updatedAt - a.updatedAt));
    }
  };

  useEffect(() => {
    loadChats();
    window.addEventListener('chatsUpdated', loadChats);
    return () => window.removeEventListener('chatsUpdated', loadChats);
  }, []);

  const handleNewChat = () => {
    navigate('/chat');
  };

  return (
    <>
      <div className="sidebar">
        <h2>System Helper</h2>
        <div className="nav-links">
          <NavLink to="/chat" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <MessageSquare size={20} />
            New Chatbot
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <SettingsIcon size={20} />
            MCP Servers
          </NavLink>
        </div>
        
        <div style={{ marginTop: '30px' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '12px' }}>
            Recent Chats
          </h3>
          <div className="nav-links" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
            {chats.map(chat => (
              <NavLink key={chat.id} to={`/chat/${chat.id}`} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ padding: '8px 12px', fontSize: '0.9rem' }}>
                <MessageCircle size={16} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {chat.title || 'New Chat'}
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:id" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
