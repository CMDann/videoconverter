import React, { useState, useRef } from 'react';

interface VideoProcessorProps {
  selectedFile: File | null;
}

const VideoProcessor: React.FC<VideoProcessorProps> = ({ selectedFile }) => {
  const [metadata, setMetadata] = useState<any>(null);
  const [videoId, setVideoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const extractMetadata = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);

      const response = await fetch('http://localhost:5001/api/video/metadata', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to extract metadata');
      }

      const data = await response.json();
      setMetadata(data.metadata);
      setVideoId(data.id);
      setSuccess('Metadata extracted successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveMetadata = async () => {
    if (!metadata || !selectedFile) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('http://localhost:5001/api/video/save-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: selectedFile.name,
          metadata: metadata,
          id: videoId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save metadata');
      }

      const data = await response.json();
      setDownloadUrl(data.viewUrl);
      setSuccess(`Metadata saved as ${data.filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="function-card">
      <h2 className="function-title">📊 Video Metadata Extractor</h2>
      <p className="function-description">
        Extract comprehensive metadata from your video and save it as JSON
      </p>

      {!selectedFile ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#00cc00',
          backgroundColor: '#333',
          borderRadius: '10px',
          border: '2px dashed #555'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📊</div>
          <h3 style={{ color: '#00ff00' }}>No File Selected</h3>
          <p>Upload a video file using the area above to extract its metadata</p>
        </div>
      ) : !selectedFile.type.startsWith('video/') ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#ff6666',
          backgroundColor: '#441111',
          borderRadius: '10px',
          border: '2px solid #ff0000'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
          <h3 style={{ color: '#ff0000' }}>Invalid File Type</h3>
          <p>Please select a video file. Current file: {selectedFile.type}</p>
        </div>
      ) : (
        <>
          <div style={{
            backgroundColor: '#333',
            border: '2px solid #00ff00',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#00ff00', marginBottom: '15px', textAlign: 'center' }}>
              🎬 Ready to Process
            </h3>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <button
                className="btn"
                onClick={extractMetadata}
                disabled={loading}
                style={{ padding: '15px 25px', fontSize: '1.1rem' }}
              >
                {loading ? '🔄 Extracting...' : '📊 Extract Metadata'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={saveMetadata}
                disabled={!metadata || loading}
                style={{ padding: '15px 25px', fontSize: '1.1rem' }}
              >
                💾 Save to JSON
              </button>
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      {success && (
        <div className="success">
          {success}
          {downloadUrl && (
            <div style={{ marginTop: '10px' }}>
              <a 
                href={downloadUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                View/Download JSON
              </a>
            </div>
          )}
        </div>
      )}

      {metadata && (
        <div className="result-area">
          <div className="result-text">
            {JSON.stringify(metadata, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoProcessor;