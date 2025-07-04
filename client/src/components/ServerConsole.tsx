import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
}

const ServerConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Since we don't have WebSocket logging set up yet, let's simulate some logs
    // and add a way to fetch server status
    
    // Add some initial mock logs
    const initialLogs: LogEntry[] = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Server Console initialized - Live server logs will appear here'
      },
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Monitoring server at http://localhost:5001'
      }
    ];
    
    setLogs(initialLogs);
    
    // Test server connectivity
    testServerConnection();
    
    // Set up periodic server status checks
    const statusInterval = setInterval(testServerConnection, 5000);
    
    return () => {
      clearInterval(statusInterval);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const testServerConnection = async () => {
    try {
      const response = await fetch('http://localhost:5001/', {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      
      if (response.ok) {
        if (!connected) {
          setConnected(true);
          addLog('info', '✅ Server connection established');
        }
      } else {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (error) {
      if (connected) {
        setConnected(false);
        addLog('error', `❌ Server connection lost: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const addLog = (level: LogEntry['level'], message: string) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };
    
    setLogs(prev => [...prev, newLog]);
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Console cleared');
  };

  const getLogColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return '#ff0000';
      case 'warn': return '#ffaa00';
      case 'info': return '#00ff00';
      case 'debug': return '#00cccc';
      default: return '#ffffff';
    }
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${formatTimestamp(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog('info', 'Logs exported to file');
  };

  return (
    <div className="function-card">
      <h2 className="function-title">🖥️ Server Console</h2>
      <p className="function-description">
        Monitor server status and view real-time logs
      </p>

      {/* Status Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        backgroundColor: connected ? '#004400' : '#440000',
        border: `2px solid ${connected ? '#00ff00' : '#ff0000'}`,
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: connected ? '#00ff00' : '#ff0000',
            animation: connected ? 'none' : 'blink 1s infinite'
          }}></div>
          <span style={{ color: connected ? '#00ff00' : '#ff0000', fontWeight: 'bold' }}>
            {connected ? 'Server Online' : 'Server Offline'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: '#888' }}>
          Last check: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <button
          className="btn btn-secondary"
          onClick={clearLogs}
          style={{ padding: '8px 15px', fontSize: '0.9rem' }}
        >
          🗑️ Clear Logs
        </button>
        <button
          className="btn btn-secondary"
          onClick={exportLogs}
          disabled={logs.length === 0}
          style={{ padding: '8px 15px', fontSize: '0.9rem' }}
        >
          💾 Export Logs
        </button>
        <button
          className="btn btn-secondary"
          onClick={testServerConnection}
          style={{ padding: '8px 15px', fontSize: '0.9rem' }}
        >
          🔄 Test Connection
        </button>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '5px',
          color: '#00cc00',
          fontSize: '0.9rem'
        }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            style={{ accentColor: '#00ff00' }}
          />
          Auto-scroll
        </label>
      </div>

      {/* Console Output */}
      <div
        ref={consoleRef}
        style={{
          backgroundColor: '#111',
          border: '2px solid #333',
          borderRadius: '5px',
          padding: '15px',
          height: '400px',
          overflowY: 'auto',
          fontFamily: 'Courier New, monospace',
          fontSize: '0.85rem',
          lineHeight: '1.4'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', paddingTop: '50px' }}>
            No logs yet...
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: '8px',
                padding: '5px',
                borderLeft: `3px solid ${getLogColor(log.level)}`,
                paddingLeft: '10px',
                backgroundColor: log.level === 'error' ? '#221111' : 'transparent'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <span style={{ color: '#666', fontSize: '0.75rem', minWidth: '80px' }}>
                  {formatTimestamp(log.timestamp)}
                </span>
                <span style={{ fontSize: '0.8rem' }}>
                  {getLogIcon(log.level)}
                </span>
                <span style={{ 
                  color: getLogColor(log.level),
                  flex: 1,
                  wordBreak: 'break-word'
                }}>
                  {log.message}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#222',
        borderRadius: '5px',
        fontSize: '0.8rem',
        color: '#888'
      }}>
        <div style={{ marginBottom: '5px' }}>
          📊 {logs.length} log entries • 
          {logs.filter(l => l.level === 'error').length} errors • 
          {logs.filter(l => l.level === 'warn').length} warnings
        </div>
        <div>
          💡 <strong>Note:</strong> This console shows simulated logs and server status. 
          For full server logs, check your terminal where the server is running.
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default ServerConsole;