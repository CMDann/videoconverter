import React, { useState, useRef } from 'react';
import VideoPreview from './VideoPreview';
import TrimTimeline from './TrimTimeline';

interface VideoEditorProps {}

const VideoEditor: React.FC<VideoEditorProps> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
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
      setStartTime(0);
      setEndTime(0);
      setVideoDuration(0);
      setCurrentTime(0);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
      setFrameUrls([]);
      setBrowseUrl(null);
      setStartTime(0);
      setEndTime(0);
      setVideoDuration(0);
      setCurrentTime(0);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleVideoLoadedMetadata = (duration: number) => {
    setVideoDuration(duration);
    setEndTime(duration);
  };

  const handleVideoTimeUpdate = (current: number, duration: number) => {
    setCurrentTime(current);
  };

  const handleStartTimeChange = (time: number) => {
    setStartTime(time);
  };

  const handleEndTimeChange = (time: number) => {
    setEndTime(time);
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
      console.log('Frame extraction response:', data);
      const urls = data.frameUrls || [];
      console.log('Setting frame URLs:', urls);
      setFrameUrls(urls);
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
      formData.append('startTime', startTime.toString());
      formData.append('endTime', endTime.toString());
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
    <div className="function-card" style={{ maxWidth: 'none' }}>
      <h2 className="function-title">🎬 Professional Video Editor</h2>
      <p className="function-description">
        Import, preview, and edit your videos with frame extraction and precision trimming
      </p>

      {/* File Upload Area - Only show if no file selected */}
      {!selectedFile && (
        <div
          className="upload-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          style={{ marginBottom: '30px' }}
        >
          <div className="upload-text">
            🎥 Click to select or drag & drop video file
          </div>
          <div className="upload-subtext">
            Supports MP4, AVI, MOV, WMV, MKV, and more
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="video/*"
            className="file-input"
          />
        </div>
      )}

      {/* Video Preview */}
      {selectedFile && (
        <>
          <VideoPreview
            videoFile={selectedFile}
            onTimeUpdate={handleVideoTimeUpdate}
            onLoadedMetadata={handleVideoLoadedMetadata}
            trimStart={startTime}
            trimEnd={endTime}
          />

          {/* Trim Timeline */}
          {videoDuration > 0 && (
            <TrimTimeline
              duration={videoDuration}
              startTime={startTime}
              endTime={endTime}
              currentTime={currentTime}
              onStartTimeChange={handleStartTimeChange}
              onEndTimeChange={handleEndTimeChange}
            />
          )}

          {/* Control Panel */}
          <div style={{
            backgroundColor: '#333',
            border: '2px solid #00ff00',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#00ff00', marginBottom: '15px', textAlign: 'center' }}>
              🛠️ Processing Controls
            </h3>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={preserveMetadata}
                  onChange={(e) => setPreserveMetadata(e.target.checked)}
                />
                Preserve original metadata in processed files
              </label>
            </div>

            <div className="controls-grid">
              <button
                className="btn"
                onClick={extractFrames}
                disabled={!selectedFile || loading}
                style={{ padding: '15px', fontSize: '1.1rem' }}
              >
                {loading && operation === 'frames' ? '🎞️ Extracting...' : '🎞️ Extract Frames'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={trimVideo}
                disabled={!selectedFile || endTime <= startTime || loading}
                style={{ padding: '15px', fontSize: '1.1rem' }}
              >
                {loading && operation === 'trim' ? '✂️ Trimming...' : '✂️ Trim Video'}
              </button>
            </div>

            {/* File info bar */}
            <div style={{
              marginTop: '15px',
              padding: '10px',
              backgroundColor: '#444',
              borderRadius: '5px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.9rem',
              color: '#00cc00'
            }}>
              <div>
                📁 {selectedFile.name}
              </div>
              <div>
                📊 {formatFileSize(selectedFile.size)} • {videoDuration > 0 ? `${Math.round(videoDuration)}s` : 'Loading...'}
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedFile(null);
                  setFrameUrls([]);
                  setBrowseUrl(null);
                }}
                style={{ padding: '5px 10px', fontSize: '0.8rem' }}
              >
                🗑️ Clear
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

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#111', border: '1px solid #333', borderRadius: '5px' }}>
          <div style={{ color: '#00ff00', fontSize: '0.8rem' }}>
            Debug: frameUrls.length = {frameUrls.length}
          </div>
          <div style={{ color: '#00cc00', fontSize: '0.7rem' }}>
            URLs: {frameUrls.length > 0 ? frameUrls.slice(0, 3).join(', ') + '...' : 'none'}
          </div>
        </div>
      )}

      {frameUrls.length > 0 && (
        <div className="result-area" style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#00ff00', marginBottom: '15px', textAlign: 'center' }}>
            🎞️ Extracted Frames ({frameUrls.length})
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
            gap: '15px',
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '10px'
          }}>
            {frameUrls.slice(0, 12).map((url, index) => (
              <div
                key={index}
                style={{
                  border: '2px solid #00ff00',
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: '#333'
                }}
                onClick={() => window.open(url, '_blank')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <img
                  src={url}
                  alt={`Frame ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '5px',
                    border: '1px solid #555'
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div style="height: 80px; display: flex; align-items: center; justify-content: center; background: #444; border-radius: 5px; color: #ff0000;">
                          ❌ Failed to load
                        </div>
                        <div style="font-size: 0.8rem; color: #00cc00; margin-top: 5px;">Frame ${index + 1}</div>
                      `;
                    }
                  }}
                />
                <div style={{ fontSize: '0.8rem', color: '#00cc00', marginTop: '5px', fontWeight: 'bold' }}>
                  Frame {index + 1}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>
                  Click to view
                </div>
              </div>
            ))}
          </div>
          {frameUrls.length > 12 && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '15px', 
              padding: '10px',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              borderRadius: '5px',
              border: '1px solid #00ff00'
            }}>
              <div style={{ color: '#00ff00', fontWeight: 'bold' }}>
                Showing first 12 of {frameUrls.length} frames
              </div>
              <div style={{ color: '#00cc00', fontSize: '0.9rem', marginTop: '5px' }}>
                Click "Browse All Frames" above to see all extracted frames
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoEditor;