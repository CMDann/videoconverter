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
  const [browseUrl, setBrowseUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
      setSelectedFiles(fileArray);
      setError(null);
      setSuccess(null);
      setResults([]);
      setBrowseUrl(null);
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
      setBrowseUrl(null);
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
    setBrowseUrl(null);

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
      setBrowseUrl(data.browseUrl);
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
          {browseUrl && (
            <div style={{ marginTop: '10px' }}>
              <a 
                href={browseUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Browse All Cube Maps
              </a>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="result-area" style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#00ff00', marginBottom: '15px', textAlign: 'center' }}>
            🗺️ Generated Cube Maps ({results.reduce((total, result) => total + (result.faceUrls?.length || 0), 0)} faces)
          </h3>
          
          {results.map((result, resultIndex) => (
            <div key={resultIndex} style={{ marginBottom: '30px' }}>
              <h4 style={{ 
                color: '#00cc00', 
                marginBottom: '15px',
                textAlign: 'center',
                padding: '10px',
                backgroundColor: '#333',
                borderRadius: '5px',
                border: '2px solid #00ff00'
              }}>
                📷 Source: {result.original}
              </h4>
              
              {result.faceUrls && result.faceUrls.length > 0 ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                  gap: '15px'
                }}>
                  {result.faceUrls.map((faceData: any, faceIndex: number) => (
                    <div
                      key={faceIndex}
                      style={{
                        border: '2px solid #00ff00',
                        borderRadius: '8px',
                        padding: '10px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        backgroundColor: '#333'
                      }}
                      onClick={() => window.open(faceData.url, '_blank')}
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
                        src={faceData.url}
                        alt={`${faceData.face} face`}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: '5px',
                          border: '1px solid #555'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.fallback-icon') as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                          }
                        }}
                      />
                      <div 
                        className="fallback-icon"
                        style={{ 
                          display: 'none',
                          height: '120px', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          background: '#444', 
                          borderRadius: '5px', 
                          color: '#ff0000',
                          fontSize: '2rem'
                        }}
                      >
                        ❌
                      </div>
                      <div style={{ 
                        fontSize: '0.9rem', 
                        color: '#00cc00', 
                        marginTop: '8px', 
                        fontWeight: 'bold',
                        textTransform: 'capitalize'
                      }}>
                        {faceData.face}
                      </div>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: '#888', 
                        marginTop: '3px'
                      }}>
                        {faceData.filename}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#888' }}>
                        Click to view full size
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#888', 
                  fontStyle: 'italic',
                  padding: '20px'
                }}>
                  No cube map faces generated for this image
                </div>
              )}
            </div>
          ))}
          
          {results.length > 1 && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: '20px', 
              padding: '15px',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              borderRadius: '5px',
              border: '1px solid #00ff00'
            }}>
              <div style={{ color: '#00ff00', fontWeight: 'bold' }}>
                Successfully processed {results.length} 360° images
              </div>
              <div style={{ color: '#00cc00', fontSize: '0.9rem', marginTop: '5px' }}>
                Each image has been converted into 6 cube map faces (front, back, left, right, top, bottom)
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CubeMapConverter;