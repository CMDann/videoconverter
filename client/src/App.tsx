import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import VideoProcessor from './components/VideoProcessor';
import VideoEditor from './components/VideoEditor';
import ImageProcessor from './components/ImageProcessor';
import CubeMapConverter from './components/CubeMapConverter';
import HistoryViewer from './components/HistoryViewer';
import SettingsViewer from './components/SettingsViewer';
import ServerConsole from './components/ServerConsole';

function App() {
  const [activeTab, setActiveTab] = useState('metadata');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load and apply theme settings on app start
  useEffect(() => {
    const loadThemeSettings = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/settings');
        if (response.ok) {
          const settings = await response.json();
          applyTheme(settings);
        }
      } catch (error) {
        console.warn('Failed to load theme settings:', error);
      }
    };

    loadThemeSettings();
  }, []);

  const applyTheme = (themeSettings: Record<string, string>) => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(themeSettings).forEach(([key, value]) => {
      if (key.startsWith('theme_') && key !== 'theme_name') {
        const cssVar = `--${key.replace('theme_', '').replace('_', '-')}`;
        root.style.setProperty(cssVar, value);
      }
    });
  };

  const tabs = [
    { id: 'metadata', label: 'Video Metadata', component: <VideoProcessor selectedFile={selectedFile} /> },
    { id: 'editor', label: 'Video Editor', component: <VideoEditor selectedFile={selectedFile} /> },
    { id: 'image', label: '360° Image', component: <ImageProcessor selectedFile={selectedFile} /> },
    { id: 'cubemap', label: 'Cube Map', component: <CubeMapConverter selectedFile={selectedFile} /> },
    { id: 'history', label: 'History', component: <HistoryViewer /> },
    { id: 'console', label: 'Server Console', component: <ServerConsole /> },
    { id: 'settings', label: 'Settings', component: <SettingsViewer /> }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (file: File) => {
    if (file.type.startsWith('video/')) return '🎬';
    if (file.type.startsWith('image/')) return '🖼️';
    return '📄';
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="App-title">Video Convert Pro</h1>
        <p className="App-subtitle">Professional Video & 360° Image Processing Suite</p>
      </header>
      
      <main className="main-container">
        {/* Compact File Upload Area - Top Right */}
        <div className="compact-upload-container" style={{ 
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          maxWidth: '350px'
        }}>
          {!selectedFile ? (
            <div
              className="upload-area"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                background: 'linear-gradient(135deg, #2a2a2a 0%, #333 100%)',
                border: '2px dashed #00ff00',
                borderRadius: '10px',
                padding: '15px',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
            >
              <div className="upload-text" style={{ fontSize: '0.9rem', marginBottom: '5px', textAlign: 'center' }}>
                🚀 Upload File
              </div>
              <div className="upload-subtext" style={{ fontSize: '0.8rem', textAlign: 'center' }}>
                Video or Image
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="video/*,image/*"
                className="file-input"
              />
            </div>
          ) : (
            <div style={{
              backgroundColor: '#2a2a2a',
              border: '2px solid #00ff00',
              borderRadius: '10px',
              padding: '10px',
              boxShadow: '0 0 15px rgba(0, 255, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '1.2rem' }}>
                  {getFileTypeIcon(selectedFile)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    color: '#00ff00', 
                    fontSize: '0.85rem', 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {selectedFile.name}
                  </div>
                  <div style={{ 
                    color: '#00cc00', 
                    fontSize: '0.7rem'
                  }}>
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '5px 8px', fontSize: '0.7rem', flex: 1 }}
                >
                  📂 Change
                </button>
                <button
                  className="btn"
                  onClick={handleClearFile}
                  style={{ 
                    padding: '5px 8px', 
                    fontSize: '0.7rem',
                    backgroundColor: '#ff4444',
                    border: 'none',
                    flex: 1
                  }}
                >
                  🗑️ Clear
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="video/*,image/*"
                  className="file-input"
                />
              </div>
            </div>
          )}
        </div>

        <div className="tabs-container">
          <div className="tabs-header">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="tab-content">
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
