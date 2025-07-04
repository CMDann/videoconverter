import React, { useState, useRef, useEffect } from 'react';

interface VideoPreviewProps {
  videoFile: File | null;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  trimStart?: number;
  trimEnd?: number;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ 
  videoFile, 
  onTimeUpdate, 
  onLoadedMetadata,
  trimStart = 0,
  trimEnd = 0
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setVideoUrl(null);
    }
  }, [videoFile]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      setCurrentTime(current);
      if (onTimeUpdate) {
        onTimeUpdate(current, duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      if (onLoadedMetadata) {
        onLoadedMetadata(dur);
      }
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(event.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(event.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
  };

  if (!videoFile || !videoUrl) {
    return (
      <div className="video-preview-placeholder">
        <div style={{
          width: '100%',
          height: '300px',
          backgroundColor: '#333',
          border: '2px dashed #00ff00',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#00cc00'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎬</div>
          <div style={{ fontSize: '1.2rem' }}>No video loaded</div>
          <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Upload a video to preview</div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-preview-container" style={{ 
      backgroundColor: '#2a2a2a', 
      border: '2px solid #00ff00', 
      borderRadius: '10px', 
      padding: '15px',
      marginBottom: '20px'
    }}>
      {/* Video Player */}
      <div style={{ position: 'relative', marginBottom: '15px' }}>
        <video
          ref={videoRef}
          src={videoUrl}
          style={{
            width: '100%',
            height: '300px',
            backgroundColor: '#000',
            borderRadius: '8px'
          }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
        
        {/* Trim markers overlay */}
        {(trimStart > 0 || trimEnd > 0) && duration > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            right: '10px',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '2px'
          }}>
            {trimStart > 0 && (
              <div style={{
                position: 'absolute',
                left: `${(trimStart / duration) * 100}%`,
                width: '2px',
                height: '100%',
                backgroundColor: '#00ff00',
                transform: 'scaleY(3)'
              }} />
            )}
            {trimEnd > 0 && (
              <div style={{
                position: 'absolute',
                left: `${(trimEnd / duration) * 100}%`,
                width: '2px',
                height: '100%',
                backgroundColor: '#ff0000',
                transform: 'scaleY(3)'
              }} />
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: '15px' }}>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#555',
            borderRadius: '4px',
            outline: 'none',
            cursor: 'pointer'
          }}
          className="timeline-slider"
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: '5px',
          fontSize: '0.9rem',
          color: '#00cc00'
        }}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '15px',
        marginBottom: '15px'
      }}>
        <button 
          className="btn btn-secondary"
          onClick={skipBackward}
          style={{ padding: '8px 12px', fontSize: '0.9rem' }}
        >
          ⏪ 10s
        </button>
        
        <button 
          className="btn"
          onClick={handlePlayPause}
          style={{ 
            padding: '12px 20px', 
            fontSize: '1.2rem',
            minWidth: '80px'
          }}
        >
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={skipForward}
          style={{ padding: '8px 12px', fontSize: '0.9rem' }}
        >
          10s ⏩
        </button>
      </div>

      {/* Volume and Info */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        fontSize: '0.9rem',
        color: '#00cc00'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            style={{ width: '80px' }}
          />
          <span>{Math.round(volume * 100)}%</span>
        </div>
        
        <div>
          📁 {videoFile.name} • {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
        </div>
      </div>
    </div>
  );
};

export default VideoPreview;