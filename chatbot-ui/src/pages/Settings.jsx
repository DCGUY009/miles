import React, { useState, useEffect } from 'react';
import { Server, Plus, CheckCircle, XCircle, Trash2, RefreshCw, Wrench } from 'lucide-react';

export default function Settings() {
  const [servers, setServers] = useState(() => {
    const saved = localStorage.getItem('mcp_servers');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: 1, name: 'Local FastApiMCP', url: 'http://localhost:8000/mcp', enabled: true, status: 'online', tools: [] },
    ];
  });
  
  useEffect(() => {
    localStorage.setItem('mcp_servers', JSON.stringify(servers));
  }, [servers]);
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

  const fetchServerTools = async (id, url) => {
    try {
      setServers(prev => prev.map(s => s.id === id ? { ...s, status: 'loading' } : s));
      const res = await fetch('http://localhost:8000/api/server-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.tools) {
        setServers(prev => prev.map(s => s.id === id ? { ...s, tools: data.tools, status: 'online' } : s));
      } else {
        setServers(prev => prev.map(s => s.id === id ? { ...s, status: 'error', tools: [] } : s));
      }
    } catch (err) {
      setServers(prev => prev.map(s => s.id === id ? { ...s, status: 'error', tools: [] } : s));
    }
  };

  // Fetch tools initially for servers that don't have them
  useEffect(() => {
    servers.forEach(server => {
      if (!server.tools || server.tools.length === 0) {
        if (server.status !== 'loading' && server.status !== 'error') {
          fetchServerTools(server.id, server.url);
        }
      }
    });
  }, []);

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
        status: 'unknown',
        tools: []
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
            
            {/* Tools Section for this specific server */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Wrench size={16} /> Server Capabilities
                </h4>
                <button 
                  onClick={() => fetchServerTools(server.id, server.url)}
                  disabled={server.status === 'loading'}
                  style={{
                    background: 'none', border: 'none', color: 'var(--accent-color)', 
                    cursor: server.status === 'loading' ? 'not-allowed' : 'pointer', 
                    display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem',
                    opacity: server.status === 'loading' ? 0.5 : 1
                  }}
                >
                  <RefreshCw size={14} className={server.status === 'loading' ? 'animate-spin' : ''} /> 
                  Refresh Tools
                </button>
              </div>
              
              {server.status === 'loading' && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Loading tools...</div>
              )}
              {server.status === 'error' && (
                <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>Failed to load tools. Ensure the server is running.</div>
              )}
              {server.tools && server.tools.length > 0 && (
                <div style={{ display: 'grid', gap: '8px' }}>
                  {server.tools.map((tool, idx) => (
                    <div key={idx} style={{ 
                      backgroundColor: 'rgba(0,0,0,0.2)', 
                      padding: '10px 12px', 
                      borderRadius: '6px',
                      borderLeft: '2px solid var(--accent-color)'
                    }}>
                      <div style={{ fontWeight: '600', fontSize: '0.85rem', marginBottom: '4px', color: 'var(--text-primary)' }}>
                        {tool.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {tool.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {server.status === 'online' && (!server.tools || server.tools.length === 0) && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No tools available on this server.</div>
              )}
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
