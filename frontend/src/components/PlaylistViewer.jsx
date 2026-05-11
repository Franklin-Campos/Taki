// src/components/PlaylistViewer.jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlaylistViewer = ({ playlist, onDownloadSelected, onAddToHistory }) => {
  const [selectedVideos, setSelectedVideos] = useState({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  const toggleVideo = (index) => {
    setSelectedVideos(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const selectAll = () => {
    const allSelected = {};
    playlist.videos.forEach((_, idx) => {
      allSelected[idx] = true;
    });
    setSelectedVideos(allSelected);
  };

  const selectNone = () => {
    setSelectedVideos({});
  };

  const handleDownloadSelected = async () => {
    const selected = playlist.videos.filter((_, idx) => selectedVideos[idx]);
    
    if (selected.length === 0) {
      alert('Selecciona al menos un video');
      return;
    }

    setIsDownloading(true);
    
    for (let i = 0; i < selected.length; i++) {
      const video = selected[i];
      setDownloadProgress({ current: i + 1, total: selected.length, title: video.title });
      
      try {
        const response = await axios.post(`${API_URL}/api/video-info`, { url: video.url });
        const videoInfo = response.data;
        const bestFormat = videoInfo.formats[0];
        
        if (bestFormat && bestFormat.url) {
          const link = document.createElement('a');
          link.href = bestFormat.url;
          link.download = `${videoInfo.title}.${bestFormat.ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          if (onAddToHistory) {
            onAddToHistory({
              title: videoInfo.title,
              url: video.url,
              thumbnail: videoInfo.thumbnail
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error descargando ${video.title}:`, error);
      }
    }
    
    setDownloadProgress(null);
    setIsDownloading(false);
    alert(`✅ Descargados ${selected.length} videos`);
    
    if (onDownloadSelected) {
      onDownloadSelected(selected);
    }
  };

  const selectedCount = Object.values(selectedVideos).filter(Boolean).length;

  if (!playlist) return null;

  return (
    <div className="playlist-viewer">
      <div className="playlist-header">
        <h2>📋 {playlist.title}</h2>
        <p className="playlist-info">
          {playlist.total_videos} videos en total
          {playlist.warning && <span className="warning"> ⚠️ {playlist.warning}</span>}
        </p>
      </div>

      <div className="playlist-controls">
        <button onClick={selectAll} className="btn-secondary" disabled={isDownloading}>
          ✅ Seleccionar todo
        </button>
        <button onClick={selectNone} className="btn-secondary" disabled={isDownloading}>
          ❌ Ninguno
        </button>
        <button 
          onClick={handleDownloadSelected} 
          className="btn-primary"
          disabled={isDownloading || selectedCount === 0}
        >
          {isDownloading 
            ? `Descargando... ${downloadProgress?.current}/${downloadProgress?.total}` 
            : `📥 Descargar seleccionados (${selectedCount})`}
        </button>
      </div>

      {downloadProgress && (
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
          >
            {downloadProgress.current}/{downloadProgress.total} - {downloadProgress.title}
          </div>
        </div>
      )}

      <div className="playlist-videos">
        {playlist.videos.map((video, idx) => (
          <div key={idx} className="playlist-video-item">
            <label className="video-checkbox-label">
              <input
                type="checkbox"
                checked={selectedVideos[idx] || false}
                onChange={() => toggleVideo(idx)}
                disabled={isDownloading}
              />
              <span className="video-number">#{idx + 1}</span>
              <span className="video-title">{video.title}</span>
              <span className="video-duration">{formatDuration(video.duration)}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlaylistViewer;