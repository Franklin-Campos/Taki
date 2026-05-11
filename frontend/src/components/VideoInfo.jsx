// src/components/VideoInfo.jsx
import React, { useState } from 'react';

const formatFileSize = (bytes) => {
  if (bytes === 0 || !bytes) return 'Desconocido';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VideoInfo = ({ video, onDownload, onAddToHistory }) => {
  const [downloading, setDownloading] = useState(null);

  if (!video) return null;

  const handleDownload = async (format) => {
    setDownloading(format.quality);
    
    try {
      const link = document.createElement('a');
      link.href = format.url;
      link.download = `${video.title}.${format.ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (onAddToHistory) {
        onAddToHistory({
          title: video.title,
          url: video.url,
          thumbnail: video.thumbnail
        });
      }
      
      if (onDownload) {
        onDownload(format.quality);
      }
    } catch (error) {
      console.error('Error al descargar:', error);
      alert('Error al descargar el video');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="video-info">
      <div className="video-header">
        <img 
          src={video.thumbnail} 
          alt={video.title}
          className="video-thumbnail"
        />
        <div className="video-details">
          <h2 className="video-title">{video.title}</h2>
          <p className="video-channel">📺 {video.channel}</p>
          <p className="video-duration">⏱️ {formatDuration(video.duration)}</p>
        </div>
      </div>

      <div className="formats-section">
        <h3>Calidades disponibles:</h3>
        <div className="formats-grid">
          {video.formats && video.formats.map((format, index) => (
            <button
              key={index}
              onClick={() => handleDownload(format)}
              disabled={downloading === format.quality}
              className="format-btn"
            >
              {downloading === format.quality ? (
                'Descargando...'
              ) : (
                <>
                  <span className="format-quality">
                    {format.quality === 'audio' ? '🎵 Audio MP3' : `📹 ${format.quality}`}
                  </span>
                  <span className="format-size">
                    {format.size ? formatFileSize(format.size) : ''}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoInfo;