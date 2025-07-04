import React, { useState, useRef } from 'react';

interface CubeMapConverterProps {
  selectedFile: File | null;
}

const CubeMapConverter: React.FC<CubeMapConverterProps> = ({ selectedFile: globalSelectedFile }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
      setSelectedFiles(fileArray);
      setError(null);
      setSuccess(null);
      setResults([]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files) {
      const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
      setSelectedFiles(fileArray);
      setError(null);
      setSuccess(null);
      setResults([]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const convertToCubeMap = async () => {
    if (selectedFiles.length === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setResults([]);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('http://localhost:5001/api/360image/cube-map', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to convert to cube map');
      }

      const data = await response.json();
      setResults(data.results);
      setSuccess(`Cube maps generated successfully in ${data.outputDir}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
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
      <h2 className="function-title">Cube Map Converter</h2>
      <p className="function-description">
        Convert 360° images into 6-sided cube maps (front, back, left, right, top, bottom)
      </p>

      <div
        className="upload-area"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-text">
          {selectedFiles.length > 0 
            ? `${selectedFiles.length} file(s) selected` 
            : 'Click to select or drag & drop 360° images'
          }
        </div>
        <div className="upload-subtext">
          {selectedFiles.length > 0 
            ? 'Multiple files supported for batch processing'
            : 'Supports JPG, PNG, and other 360° image formats'
          }
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          multiple
          className="file-input"
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="file-list">
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-item">
              <div>
                <div className="file-name">{file.name}</div>
                <div className="file-size">{formatFileSize(file.size)}</div>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => removeFile(index)}
                style={{ padding: '5px 10px', fontSize: '0.8rem' }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn"
        onClick={convertToCubeMap}
        disabled={selectedFiles.length === 0 || loading}
        style={{ width: '100%', marginTop: '20px' }}
      >
        {loading ? 'Converting...' : 'Convert to Cube Maps'}
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

      {results.length > 0 && (
        <div className="result-area">
          <div className="result-text">
            <strong>Generated Cube Maps:</strong>
            {results.map((result, index) => (
              <div key={index} style={{ marginTop: '10px' }}>
                <strong>{result.original}:</strong>
                <ul style={{ marginLeft: '20px' }}>
                  {result.faces.map((face: string, faceIndex: number) => (
                    <li key={faceIndex}>{face}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CubeMapConverter;