import React, { useState } from 'react';
import './App.css';
import VideoProcessor from './components/VideoProcessor';
import VideoEditor from './components/VideoEditor';
import ImageProcessor from './components/ImageProcessor';
import CubeMapConverter from './components/CubeMapConverter';
import HistoryViewer from './components/HistoryViewer';

function App() {
  const [activeTab, setActiveTab] = useState('metadata');

  const tabs = [
    { id: 'metadata', label: 'Video Metadata', component: <VideoProcessor /> },
    { id: 'editor', label: 'Video Editor', component: <VideoEditor /> },
    { id: 'image', label: '360° Image', component: <ImageProcessor /> },
    { id: 'cubemap', label: 'Cube Map', component: <CubeMapConverter /> },
    { id: 'history', label: 'History', component: <HistoryViewer /> }
  ];

  return (
    <div className="App">
      <header className="App-header">
        <h1 className="App-title">Video Convert Pro</h1>
        <p className="App-subtitle">Professional Video & 360° Image Processing Suite</p>
      </header>
      
      <main className="main-container">
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
