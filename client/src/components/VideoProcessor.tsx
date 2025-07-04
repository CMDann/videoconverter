import React, { useState, useRef } from 'react';

interface VideoProcessorProps {}

const VideoProcessor: React.FC<VideoProcessorProps> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [videoId, setVideoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
      setMetadata(null);
      setVideoId(null);
      setDownloadUrl(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
      setMetadata(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

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
      <h2 className="function-title">Video Metadata Extractor</h2>
      <p className="function-description">
        Upload a video file to extract and save its metadata to JSON format
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

      <div className="controls-grid">
        <button
          className="btn"
          onClick={extractMetadata}
          disabled={!selectedFile || loading}
        >
          {loading ? 'Extracting...' : 'Extract Metadata'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={saveMetadata}
          disabled={!metadata || loading}
        >
          Save to JSON
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