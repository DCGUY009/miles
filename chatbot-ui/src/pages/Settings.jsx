import React, { useState } from 'react';
import { Server, Plus, CheckCircle, XCircle, Trash2 } from 'lucide-react';

export default function Settings() {
  const [servers, setServers] = useState([
    { id: 1, name: 'Local FastApiMCP', url: 'http://localhost:8000/mcp', enabled: true, status: 'online' },
  ]);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [newServerName, setNewServerName] = useState('');

  const handleToggle = (id) => {
    setServers(servers.map(server => 
      server.id === id ? { ...server, enabled: !server.enabled } : server
    ));
  };

  const handleRemove = (id) => {
    setServers(servers.filter(server => server.id !== id));
  };

  const handleAddServer = (e) => {
    e.preventDefault();
    if (!newServerUrl.trim() || !newServerName.trim()) return;

    setServers([
      ...servers, 
      { 
        id: Date.now(), 
        name: newServerName, 
        url: newServerUrl, 
        enabled: true, 
        status: 'unknown' 
      }
    ]);
    setNewServerName('');
    setNewServerUrl('');
  };

  return (
    <div className="page-container">
      <h1 className="page-title">MCP Servers</h1>
      <p className="page-subtitle">Manage Model Context Protocol servers connected to your assistant.</p>

      <div className="card">
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={20} /> Add New Server
        </h3>
        <form onSubmit={handleAddServer}>
          <input 
            type="text" 
            className="input-text" 
            placeholder="Server Name (e.g. My Custom Server)" 
            value={newServerName}
            onChange={(e) => setNewServerName(e.target.value)}
          />
          <input 
            type="url" 
            className="input-text" 
            placeholder="Server URL (e.g. http://localhost:8000/mcp)" 
            value={newServerUrl}
            onChange={(e) => setNewServerUrl(e.target.value)}
          />
          <button type="submit" className="button-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Add Server
          </button>
        </form>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {servers.map(server => (
          <div key={server.id} className="card" style={{ marginBottom: 0 }}>
            <div className="toggle-container">
              <div>
                <h3 style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {server.name}
                  {server.enabled ? 
                    <CheckCircle size={16} color="#10b981" /> : 
                    <XCircle size={16} color="#ef4444" />
                  }
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '12px' }}>
                  {server.url}
                </p>
                <button 
                  onClick={() => handleRemove(server.id)}
                  style={{ 
                    background: 'none', border: 'none', color: '#ef4444', 
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '0.85rem'
                  }}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
              
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={server.enabled} 
                  onChange={() => handleToggle(server.id)} 
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        ))}
        {servers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No MCP servers configured. Add one above to get started.
          </div>
        )}
      </div>
    </div>
  );
}
