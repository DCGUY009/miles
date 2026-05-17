import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Activity } from 'lucide-react';

const INITIAL_MESSAGES = [
  { 
    id: 1, 
    role: 'assistant', 
    content: 'Hello! I am your Security & Diagnostics AI assistant powered by LangGraph. I can check your Mac\'s FileVault, Firewall, SIP status, pending OS updates, and realtime CPU/RAM usage! What would you like me to check?',
    traces: []
  }
];

export default function Chat() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

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

    setMessages(prev => [...prev, userMsgObj, initialAiMsgObj]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
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
                      borderLeft: '2px solid var(--accent-color)'
                    }}>
                      {trace}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Actual Message Content */}
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              <Bot size={20} />
            </div>
            <div className="message-content" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
              <Activity size={16} className="animate-pulse" />
              <span>Agent is working...</span>
            </div>
          </div>
        )}
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
