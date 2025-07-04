import React, { useState, useEffect } from 'react';

interface HistoryItem {
  id: number;
  filename: string;
  original_name: string;
  file_size: number;
  operation_type: string;
  status: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  frame_count?: number;
  additional_data: any;
}

interface Frame {
  id: number;
  frame_path: string;
  frame_number: number;
  timestamp: number;
  url: string;
  fileName: string;
}

const HistoryViewer: React.FC = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5001/api/history');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      
      const data = await response.json();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  };

  const fetchFrames = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:5001/api/history/${id}/frames`);
      if (!response.ok) {
        throw new Error('Failed to fetch frames');
      }
      
      const data = await response.json();
      setFrames(data);
    } catch (err) {
      console.error('Error fetching frames:', err);
      setFrames([]);
    }
  };

  const handleItemClick = async (item: HistoryItem) => {
    setSelectedItem(item);
    
    if (item.operation_type === 'frame_extraction') {
      await fetchFrames(item.id);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'metadata_extraction': return '📊';
      case 'frame_extraction': return '🎞️';
      case 'video_trim': return '✂️';
      case '360_image': return '🌐';
      case 'cube_map': return '🎲';
      default: return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#00ff00';
      case 'failed': return '#ff0000';
      case 'processing': return '#ffff00';
      default: return '#00cc00';
    }
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="function-card">
      <h2 className="function-title">Processing History</h2>
      <p className="function-description">
        View and manage your video processing history, access extracted frames and generated files
      </p>

      {loading && (
        <div className="loading">Loading history...</div>
      )}

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', height: '600px' }}>
        {/* History List */}
        <div style={{ flex: 1, borderRight: '2px solid #00ff00', paddingRight: '20px' }}>
          <h3 style={{ color: '#00ff00', marginBottom: '15px' }}>Recent Operations</h3>
          
          <button 
            className="btn btn-secondary" 
            onClick={fetchHistory}
            style={{ marginBottom: '15px', width: '100%' }}
          >
            Refresh History
          </button>
          
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {history.map((item) => (
              <div
                key={item.id}
                className="file-item"
                style={{
                  cursor: 'pointer',
                  borderLeft: `4px solid ${getStatusColor(item.status)}`,
                  backgroundColor: selectedItem?.id === item.id ? 'rgba(0, 255, 0, 0.1)' : '#333'
                }}
                onClick={() => handleItemClick(item)}
              >
                <div>
                  <div className="file-name">
                    {getOperationIcon(item.operation_type)} {item.original_name}
                  </div>
                  <div className="file-size">
                    {item.operation_type.replace('_', ' ')} • {formatFileSize(item.file_size)} • {item.status}
                  </div>
                  <div className="file-size">
                    {formatDate(item.created_at)}
                    {item.frame_count && item.frame_count > 0 && ` • ${item.frame_count} frames`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details Panel */}
        <div style={{ flex: 2, paddingLeft: '20px' }}>
          {selectedItem ? (
            <div>
              <h3 style={{ color: '#00ff00', marginBottom: '15px' }}>
                {getOperationIcon(selectedItem.operation_type)} {selectedItem.original_name}
              </h3>
              
              <div className="result-area" style={{ marginBottom: '20px' }}>
                <div className="result-text">
                  <strong>Operation:</strong> {selectedItem.operation_type.replace('_', ' ')}<br/>
                  <strong>Status:</strong> <span style={{ color: getStatusColor(selectedItem.status) }}>
                    {selectedItem.status}
                  </span><br/>
                  <strong>File Size:</strong> {formatFileSize(selectedItem.file_size)}<br/>
                  <strong>Created:</strong> {formatDate(selectedItem.created_at)}<br/>
                  {selectedItem.completed_at && (
                    <>
                      <strong>Completed:</strong> {formatDate(selectedItem.completed_at)}<br/>
                    </>
                  )}
                  {selectedItem.error_message && (
                    <>
                      <strong>Error:</strong> {selectedItem.error_message}<br/>
                    </>
                  )}
                  {selectedItem.additional_data?.duration && (
                    <>
                      <strong>Duration:</strong> {Math.round(selectedItem.additional_data.duration)} seconds<br/>
                    </>
                  )}
                </div>
              </div>

              {/* Frames Display */}
              {selectedItem.operation_type === 'frame_extraction' && frames.length > 0 && (
                <div>
                  <h4 style={{ color: '#00ff00', marginBottom: '15px' }}>
                    Extracted Frames ({frames.length})
                  </h4>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                    gap: '10px',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {frames.map((frame) => (
                      <div
                        key={frame.id}
                        style={{
                          border: '1px solid #00ff00',
                          borderRadius: '5px',
                          padding: '5px',
                          textAlign: 'center',
                          cursor: 'pointer'
                        }}
                        onClick={() => openInNewTab(frame.url)}
                      >
                        <img
                          src={frame.url}
                          alt={`Frame ${frame.frame_number}`}
                          style={{
                            width: '100%',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '3px'
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div style={{ fontSize: '0.8rem', color: '#00cc00', marginTop: '5px' }}>
                          Frame {frame.frame_number}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#888' }}>
                          {Math.round(frame.timestamp)}s
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    className="btn"
                    onClick={() => {
                      const framesDirName = selectedItem.additional_data?.framesDirName;
                      if (framesDirName) {
                        openInNewTab(`http://localhost:5001/files/${framesDirName}/`);
                      }
                    }}
                    style={{ marginTop: '15px', width: '100%' }}
                  >
                    Browse All Frames
                  </button>
                </div>
              )}

              {/* Metadata File Link */}
              {selectedItem.operation_type === 'metadata_extraction' && selectedItem.additional_data?.jsonFilename && (
                <div>
                  <h4 style={{ color: '#00ff00', marginBottom: '15px' }}>Generated Files</h4>
                  <button
                    className="btn"
                    onClick={() => openInNewTab(`http://localhost:5001/files/${selectedItem.additional_data.jsonFilename}`)}
                    style={{ width: '100%' }}
                  >
                    View Metadata JSON
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#00cc00', paddingTop: '50px' }}>
              <h3>Select an item from the history to view details</h3>
              <p>Click on any operation in the left panel to see more information and access generated files.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryViewer;