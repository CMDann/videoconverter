import React, { useState, useRef } from 'react';

interface VideoEditorProps {}

const VideoEditor: React.FC<VideoEditorProps> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [preserveMetadata, setPreserveMetadata] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [operation, setOperation] = useState<'frames' | 'trim' | null>(null);
  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const [browseUrl, setBrowseUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
      setFrameUrls([]);
      setBrowseUrl(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const extractFrames = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setOperation('frames');

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('preserveMetadata', preserveMetadata.toString());

      const response = await fetch('http://localhost:5001/api/video/extract-frames', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to extract frames');
      }

      const data = await response.json();
      setFrameUrls(data.frameUrls || []);
      setBrowseUrl(data.browseUrl);
      setSuccess(`${data.frameCount} frames extracted successfully`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setOperation(null);
    }
  };

  const trimVideo = async () => {
    if (!selectedFile || !startTime || !endTime) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setOperation('trim');

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('startTime', startTime);
      formData.append('endTime', endTime);
      formData.append('preserveMetadata', preserveMetadata.toString());

      const response = await fetch('http://localhost:5001/api/video/trim', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to trim video');
      }

      const data = await response.json();
      setSuccess(`Video trimmed successfully: ${data.filename}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setOperation(null);
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
      <h2 className="function-title">Video Editor</h2>
      <p className="function-description">
        Extract frames from video or trim video segments with optional metadata preservation
      </p>

      <div
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-text">
          {selectedFile ? selectedFile.name : 'Click to select or drag & drop video file'}
        </div>
        <div className="upload-subtext">
          {selectedFile 
            ? `${formatFileSize(selectedFile.size)} - ${selectedFile.type}`
            : 'Supports MP4, AVI, MOV, WMV, and more'
          }
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="video/*"
          className="file-input"
        />
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            className="form-checkbox"
            checked={preserveMetadata}
            onChange={(e) => setPreserveMetadata(e.target.checked)}
          />
          Preserve metadata
        </label>
      </div>

      <div className="controls-grid">
        <div className="form-group">
          <label className="form-label">Start Time (seconds)</label>
          <input
            type="number"
            className="form-input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            placeholder="0"
            min="0"
            step="0.1"
          />
        </div>
        <div className="form-group">
          <label className="form-label">End Time (seconds)</label>
          <input
            type="number"
            className="form-input"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            placeholder="10"
            min="0"
            step="0.1"
          />
        </div>
      </div>

      <div className="controls-grid">
        <button
          className="btn"
          onClick={extractFrames}
          disabled={!selectedFile || loading}
        >
          {loading && operation === 'frames' ? 'Extracting...' : 'Extract Frames'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={trimVideo}
          disabled={!selectedFile || !startTime || !endTime || loading}
        >
          {loading && operation === 'trim' ? 'Trimming...' : 'Trim Video'}
        </button>
      </div>

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      {success && (
        <div className="success">
          {success}
          {browseUrl && (
            <div style={{ marginTop: '10px' }}>
              <a 
                href={browseUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Browse All Frames
              </a>
            </div>
          )}
        </div>
      )}

      {frameUrls.length > 0 && (
        <div className="result-area">
          <h4 style={{ color: '#00ff00', marginBottom: '15px' }}>
            Extracted Frames ({frameUrls.length})
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: '10px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {frameUrls.slice(0, 12).map((url, index) => (
              <div
                key={index}
                style={{
                  border: '1px solid #00ff00',
                  borderRadius: '5px',
                  padding: '5px',
                  textAlign: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => window.open(url, '_blank')}
              >
                <img
                  src={url}
                  alt={`Frame ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '60px',
                    objectFit: 'cover',
                    borderRadius: '3px'
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div style={{ fontSize: '0.7rem', color: '#00cc00', marginTop: '3px' }}>
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
          {frameUrls.length > 12 && (
            <div style={{ textAlign: 'center', marginTop: '10px', color: '#00cc00' }}>
              Showing first 12 frames. Click "Browse All Frames" to see all {frameUrls.length} frames.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoEditor;