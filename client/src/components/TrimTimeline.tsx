import React, { useState, useRef, useEffect } from 'react';

interface TrimTimelineProps {
  duration: number;
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  currentTime?: number;
}

const TrimTimeline: React.FC<TrimTimelineProps> = ({
  duration,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  currentTime = 0
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const getTimeFromPosition = (clientX: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const position = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(duration, position * duration));
  };

  const handleMouseDown = (event: React.MouseEvent, type: 'start' | 'end') => {
    event.preventDefault();
    setIsDragging(type);
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!isDragging) return;
    
    const time = getTimeFromPosition(event.clientX);
    
    if (isDragging === 'start') {
      onStartTimeChange(Math.min(time, endTime - 0.1));
    } else if (isDragging === 'end') {
      onEndTimeChange(Math.max(time, startTime + 0.1));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, startTime, endTime]);

  if (duration <= 0) {
    return (
      <div style={{
        height: '60px',
        backgroundColor: '#333',
        border: '2px dashed #555',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#666',
        marginBottom: '20px'
      }}>
        Load a video to see timeline
      </div>
    );
  }

  const startPercent = (startTime / duration) * 100;
  const endPercent = (endTime / duration) * 100;
  const currentPercent = (currentTime / duration) * 100;
  const selectedWidth = endPercent - startPercent;

  return (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{ color: '#00ff00', marginBottom: '10px' }}>✂️ Trim Timeline</h4>
      
      {/* Timeline Container */}
      <div
        ref={timelineRef}
        style={{
          position: 'relative',
          height: '60px',
          backgroundColor: '#333',
          border: '2px solid #00ff00',
          borderRadius: '8px',
          cursor: 'crosshair',
          overflow: 'hidden'
        }}
        onClick={(e) => {
          const time = getTimeFromPosition(e.clientX);
          // Snap to closest marker
          const distToStart = Math.abs(time - startTime);
          const distToEnd = Math.abs(time - endTime);
          if (distToStart < distToEnd) {
            onStartTimeChange(time);
          } else {
            onEndTimeChange(time);
          }
        }}
      >
        {/* Background timeline */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '10px',
          right: '10px',
          height: '4px',
          backgroundColor: '#555',
          transform: 'translateY(-50%)'
        }} />

        {/* Selected region */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: `${startPercent}%`,
          width: `${selectedWidth}%`,
          height: '8px',
          backgroundColor: '#00ff00',
          transform: 'translateY(-50%)',
          opacity: 0.7
        }} />

        {/* Current time indicator */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: `${currentPercent}%`,
          width: '2px',
          height: '100%',
          backgroundColor: '#ffffff',
          transform: 'translateX(-50%)',
          zIndex: 3
        }} />

        {/* Start marker */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${startPercent}%`,
            width: '20px',
            height: '20px',
            backgroundColor: '#00ff00',
            border: '2px solid #fff',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            cursor: 'ew-resize',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'start')}
        >
          ▶
        </div>

        {/* End marker */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${endPercent}%`,
            width: '20px',
            height: '20px',
            backgroundColor: '#ff0000',
            border: '2px solid #fff',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            cursor: 'ew-resize',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'end')}
        >
          ⏹
        </div>

        {/* Time markers */}
        {Array.from({ length: 11 }, (_, i) => i * 10).map(percent => (
          <div
            key={percent}
            style={{
              position: 'absolute',
              top: '0',
              left: `${percent}%`,
              width: '1px',
              height: '100%',
              backgroundColor: '#666',
              opacity: 0.5
            }}
          />
        ))}
      </div>

      {/* Time display */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '10px',
        fontSize: '0.9rem'
      }}>
        <div style={{ color: '#00ff00' }}>
          ▶ Start: {formatTime(startTime)}
        </div>
        <div style={{ color: '#00cc00' }}>
          Duration: {formatTime(endTime - startTime)}
        </div>
        <div style={{ color: '#ff0000' }}>
          End: {formatTime(endTime)} ⏹
        </div>
      </div>

      {/* Quick preset buttons */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginTop: '10px',
        justifyContent: 'center'
      }}>
        <button
          className="btn btn-secondary"
          onClick={() => {
            onStartTimeChange(0);
            onEndTimeChange(Math.min(10, duration));
          }}
          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
        >
          First 10s
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            onStartTimeChange(Math.max(0, duration - 10));
            onEndTimeChange(duration);
          }}
          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
        >
          Last 10s
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            const middle = duration / 2;
            onStartTimeChange(Math.max(0, middle - 5));
            onEndTimeChange(Math.min(duration, middle + 5));
          }}
          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
        >
          Middle 10s
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => {
            onStartTimeChange(0);
            onEndTimeChange(duration);
          }}
          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
        >
          Full Video
        </button>
      </div>
    </div>
  );
};

export default TrimTimeline;