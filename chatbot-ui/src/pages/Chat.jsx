import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Bot, User, Activity } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const INITIAL_MESSAGES = [
  { 
    id: 1, 
    role: 'assistant', 
    content: 'Hello! I am Miles, your friendly and approachable System Operations and Security AI assistant. I am here to go the extra mile to diagnose your system, monitor realtime metrics, check for updates, and review security settings. What would you like to check today?',
    traces: []
  }
];

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Load chat on mount or when id changes
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem('chat_sessions');
      if (saved) {
        const sessions = JSON.parse(saved);
        const session = sessions.find(s => s.id === id);
        if (session) {
          setMessages(session.messages);
        } else {
          // invalid id, reset
          navigate('/chat', { replace: true });
        }
      }
    } else {
      setMessages(INITIAL_MESSAGES);
    }
  }, [id, navigate]);

  // Save chat on messages update
  useEffect(() => {
    if (messages === INITIAL_MESSAGES) return;
    
    // We only save if there's actually a user message
    if (messages.length <= 1) return;

    let currentId = id;
    const saved = localStorage.getItem('chat_sessions');
    let sessions = saved ? JSON.parse(saved) : [];

    if (!currentId) {
      currentId = Date.now().toString();
      const title = messages[1]?.content?.slice(0, 30) + '...' || 'New Chat';
      const newSession = { id: currentId, title, messages, updatedAt: Date.now() };
      sessions.push(newSession);
      localStorage.setItem('chat_sessions', JSON.stringify(sessions));
      window.dispatchEvent(new Event('chatsUpdated'));
      // Silently update URL without unmounting
      navigate(`/chat/${currentId}`, { replace: true });
    } else {
      sessions = sessions.map(s => 
        s.id === currentId ? { ...s, messages, updatedAt: Date.now() } : s
      );
      localStorage.setItem('chat_sessions', JSON.stringify(sessions));
      window.dispatchEvent(new Event('chatsUpdated'));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const userMsgObj = { id: Date.now(), role: 'user', content: userMessage };
    
    // Add User message and placeholder AI message
    const aiMessageId = Date.now() + 1;
    const initialAiMsgObj = { 
      id: aiMessageId, 
      role: 'assistant', 
      content: '', 
      traces: [] 
    };

    const updatedMessages = [...messages, userMsgObj, initialAiMsgObj];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const saved = localStorage.getItem('mcp_servers');
      let enabledServers = ['http://localhost:8000/mcp'];
      if (saved) {
        const serversList = JSON.parse(saved);
        enabledServers = serversList.filter(s => s.enabled).map(s => s.url);
      }

      // We send the history EXCLUDING the empty placeholder AI message
      const historyToSend = updatedMessages.slice(0, -1).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyToSend, enabled_servers: enabledServers })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          setMessages(prev => prev.map(msg => 
            msg.id === aiMessageId ? { ...msg, traces: [] } : msg
          ));
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process chunks split by double newline
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() || ''; // Keep the incomplete chunk in the buffer

        for (const chunk of chunks) {
          if (chunk.startsWith('data: ')) {
            const dataStr = chunk.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              
              setMessages(prev => prev.map(msg => {
                if (msg.id === aiMessageId) {
                  if (data.type === 'trace') {
                    // Ignore tool results from traces and only keep the latest trace
                    if (data.content.toLowerCase().includes('tool result') || data.content.toLowerCase().includes('tool output') || data.content.includes('result') || data.content.includes('Finished tool')) {
                      return msg;
                    }
                    return { ...msg, traces: [data.content] };
                  } else if (data.type === 'token') {
                    return { ...msg, content: msg.content + data.content };
                  } else if (data.type === 'error') {
                    return { ...msg, content: msg.content + `\n\n❌ ${data.content}` };
                  }
                }
                return msg;
              }));

            } catch (err) {
              console.error('Failed to parse SSE JSON:', err, dataStr);
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: msg.content + `\n\n❌ Error connecting to backend: ${error.message}` }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-history">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'assistant' ? <Bot size={20} /> : <User size={20} />}
            </div>
            <div className="message-content">
              {/* Traces Section */}
              {msg.traces && msg.traces.length > 0 && (
                <div style={{ marginBottom: msg.content ? '16px' : '0' }}>
                  {msg.traces.map((trace, idx) => (
                    <div key={idx} style={{
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      fontFamily: 'monospace',
                      marginBottom: '8px',
                      borderLeft: '2px solid var(--accent-color)',
                      animation: 'fadeIn 0.3s ease-in-out'
                    }}>
                      {trace}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Actual Message Content */}
              {msg.content && (
                <div className="markdown-content" style={{ lineHeight: '1.5' }}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
              
              {/* Agent Thinking Indicator */}
              {isLoading && msg.role === 'assistant' && msg.id === messages[messages.length - 1].id && !msg.content && msg.traces.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>
                  <Activity size={16} className="animate-pulse" />
                  <span>Agent is thinking...</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-area">
        <form onSubmit={handleSend} className="input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Ask about your Mac's security or CPU usage..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!input.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
