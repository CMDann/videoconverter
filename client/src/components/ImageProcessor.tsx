import React, { useState, useRef } from 'react';

interface ImageProcessorProps {}

const ImageProcessor: React.FC<ImageProcessorProps> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preserveMetadata, setPreserveMetadata] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [action, setAction] = useState<string>('frames');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const processImage = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('action', action);
      formData.append('preserveMetadata', preserveMetadata.toString());

      const response = await fetch('http://localhost:5001/api/360image/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process 360° image');
      }

      const data = await response.json();
      setSuccess(`360° image processed successfully: ${data.action}`);
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
      <h2 className="function-title">360° Image Processor</h2>
      <p className="function-description">
        Upload a 360° image and process it with frame extraction or trimming capabilities
      </p>

      <div
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-text">
          {selectedFile ? selectedFile.name : 'Click to select or drag & drop 360° image'}
        </div>
        <div className="upload-subtext">
          {selectedFile 
            ? `${formatFileSize(selectedFile.size)} - ${selectedFile.type}`
            : 'Supports JPG, PNG, and other 360° image formats'
          }
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="file-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Processing Action</label>
        <select
          className="form-input"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="frames">Extract Frames</option>
          <option value="trim">Trim/Crop</option>
          <option value="metadata">Extract Metadata</option>
        </select>
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

      <button
        className="btn"
        onClick={processImage}
        disabled={!selectedFile || loading}
        style={{ width: '100%' }}
      >
        {loading ? 'Processing...' : 'Process 360° Image'}
      </button>

      {error && (
        <div className="error">
          Error: {error}
        </div>
      )}

      {success && (
        <div className="success">
          {success}
        </div>
      )}
    </div>
  );
};

export default ImageProcessor;