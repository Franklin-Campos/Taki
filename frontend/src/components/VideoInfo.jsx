// src/components/VideoInfo.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const abortControllerRef = useRef(null);

  if (!video) return null;

  // Timer para mostrar tiempo transcurrido
  useEffect(() => {
    let interval;
    if (isDownloading) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isDownloading]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins} min ${secs} seg`;
    return `${secs} seg`;
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setDownloading(null);
      setIsDownloading(false);
      console.log('🛑 Descarga cancelada por el usuario');
    }
  };

  const handleDownload = async (format) => {
    setDownloading(format.quality);
    setIsDownloading(true);
    setElapsedTime(0);
    
    const extension = format.ext || (format.quality === 'audio' ? 'mp3' : 'mp4');
    const cleanTitle = video.title.replace(/[<>:"/\\|?*]+/g, '');
    
    // Crear un nuevo AbortController para esta descarga
    abortControllerRef.current = new AbortController();
    
    try {
      // Determinar el tipo de formato solicitado
      const formatType = format.type === 'audio' ? 'audio' : 'video';
      const quality = format.quality;
      
      // Enviar URL de YouTube + información del formato deseado
      const response = await axios.post(
        `${API_URL}/api/download`,
        {
          url: video.url,
          format_type: formatType,
          quality: quality
        },
        {
          responseType: 'blob',
          timeout: 300000, // 5 minutos de timeout
          signal: abortControllerRef.current.signal, // Pasar la señal de cancelación
        }
      );
      
      // Crear blob y descargar
      const blob = new Blob([response.data]);
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${cleanTitle}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      // Agregar al historial
      if (onAddToHistory) {
        onAddToHistory({
          title: video.title,
          url: video.url,
          thumbnail: video.thumbnail
        });
      }
      
      if (onDownload) onDownload(format.quality);
      
    } catch (error) {
      // Si fue cancelado por el usuario, no mostrar error
      if (axios.isCancel(error)) {
        console.log('🛑 Descarga cancelada');
        return;
      }
      
      console.error('Error de descarga:', error);
      
      let errorMessage = 'Error al descargar el archivo';
      
      if (error.response) {
        // Error del servidor - intentar leer el mensaje
        try {
          const errorText = await error.response.data.text();
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.detail || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        } catch {
          errorMessage = `Error del servidor (${error.response.status})`;
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'La descarga tardó demasiado tiempo. Intenta con una calidad menor.';
      } else if (error.request) {
        errorMessage = 'Error de conexión. Verifica que el servidor esté funcionando.';
      }
      
      alert(errorMessage);
    } finally {
      abortControllerRef.current = null;
      setDownloading(null);
      setIsDownloading(false);
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

      {/* Barra de progreso indeterminada con botón cancelar */}
      {isDownloading && (
        <div className="progress-container">
          <div className="progress-bar-indeterminate">
            <div className="progress-bar-indeterminate-fill"></div>
          </div>
          <div className="progress-info">
            <span className="progress-text">⬇️ Descargando {downloading}...</span>
            <span className="progress-time">⏱️ {formatTime(elapsedTime)}</span>
          </div>
          <p className="progress-hint">La descarga puede tomar unos segundos dependiendo del tamaño del archivo</p>
          <button onClick={handleCancel} className="cancel-btn">
            ❌ Cancelar descarga
          </button>
        </div>
      )}

      <div className="formats-section">
        <h3>Calidades disponibles:</h3>
        <div className="formats-grid">
          {video.formats && video.formats.map((format, index) => (
            <button
              key={index}
              onClick={() => handleDownload(format)}
              disabled={isDownloading}
              className="format-btn"
            >
              {isDownloading ? (
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