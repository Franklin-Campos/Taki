// src/components/VideoInfo.jsx
import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');

  if (!video) return null;

  const handleDownload = async (format) => {
    setDownloading(format.quality);
    setProgress(0);
    setProgressText('Iniciando descarga...');
    
    try {
      console.log("🔽 Descargando:", format.quality);
      
      // Usar fetch con reporte de progreso
      const response = await fetch(`${API_URL}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: format.url })
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      
      // Obtener el tamaño total del archivo
      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);
      
      // Usar Response.body para leer el stream con progreso
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      
      setProgressText('Descargando archivo...');
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        received += value.length;
        
        if (total) {
          const percent = (received / total) * 100;
          setProgress(Math.round(percent));
          setProgressText(`Descargando: ${Math.round(percent)}% (${formatFileSize(received)} / ${formatFileSize(total)})`);
        } else {
          setProgressText(`Descargando: ${formatFileSize(received)}`);
        }
      }
      
      // Combinar todos los chunks en un solo blob
      const blob = new Blob(chunks);
      const blobUrl = window.URL.createObjectURL(blob);
      
      setProgressText('Guardando archivo...');
      setProgress(100);
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = blobUrl;
      const extension = format.ext || (format.quality === 'audio' ? 'mp3' : 'mp4');
      const cleanTitle = video.title.replace(/[<>:"/\\|?*]+/g, '');
      link.download = `${cleanTitle}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar
      window.URL.revokeObjectURL(blobUrl);
      
      console.log("✅ Descarga completada");
      
      // Agregar al historial
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
      
      // Limpiar progreso después de 2 segundos
      setTimeout(() => {
        setProgress(0);
        setProgressText('');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error:', error);
      setProgressText(`Error: ${error.message}`);
      setTimeout(() => {
        setProgressText('');
        setProgress(0);
      }, 3000);
      alert('Error al descargar. Intenta con otra calidad.');
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

      {/* Barra de progreso */}
      {progressText && (
        <div className="progress-container">
          <div className="progress-bar-wrapper">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }}
            >
              {progress > 0 && `${progress}%`}
            </div>
          </div>
          <p className="progress-text">{progressText}</p>
        </div>
      )}

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