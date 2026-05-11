// src/App.jsx
import React, { useState } from 'react';
import UrlInput from './components/UrlInput';
import VideoInfo from './components/VideoInfo';
import PlaylistViewer from './components/PlaylistViewer';
import ThemeToggle from './components/ThemeToggle';
import { useHistory } from './hooks/useHistory';
import { useTheme } from './hooks/useTheme';
import axios from 'axios';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [currentView, setCurrentView] = useState('idle');
  const [videoData, setVideoData] = useState(null);
  const [playlistData, setPlaylistData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(null);
  
  const { history, addToHistory, clearHistory, removeFromHistory } = useHistory();
  const { theme, toggleTheme } = useTheme();

  const fetchVideo = async (url) => {
    setLoading(true);
    setCurrentView('idle');
    setCurrentUrl(url);
    
    try {
      const response = await axios.post(`${API_URL}/api/video-info`, { url });
      setVideoData(response.data);
      setCurrentView('video');
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.detail || 'Error al obtener el video');
      setCurrentView('idle');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylist = async (url) => {
    setLoading(true);
    setCurrentView('idle');
    setCurrentUrl(url);
    
    try {
      const response = await axios.post(`${API_URL}/api/playlist-info`, { url });
      setPlaylistData(response.data);
      setCurrentView('playlist');
      
      if (response.data.warning) {
        console.warn(response.data.warning);
      }
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.detail || 'Error al obtener la playlist');
      setCurrentView('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoDownload = (video) => {
    addToHistory({
      title: video.title,
      url: video.url,
      thumbnail: video.thumbnail
    });
  };

  const handleHistorySelect = (item) => {
    if (item.url) {
      fetchVideo(item.url);
    }
  };

  const resetView = () => {
    setCurrentView('idle');
    setVideoData(null);
    setPlaylistData(null);
    setCurrentUrl(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} d`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`app ${theme === 'dark' ? 'dark-mode' : ''}`}>
      <header className="app-header">
        <div className="header-left">
          <img 
            src="/TakiLogo.png" 
            alt="Taki" 
            className="header-logo"
            title="Taki - YouTube Downloader"
          />
          {currentView !== 'idle' && (
            <button onClick={resetView} className="back-btn" title="Nueva busqueda">
              Nueva busqueda
            </button>
          )}
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <main className="app-main">
        <div className="content-area">
          <UrlInput 
            onVideoDetected={fetchVideo}
            onPlaylistDetected={fetchPlaylist}
            loading={loading}
          />

          {loading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Obteniendo informacion...</p>
            </div>
          )}

          {currentView === 'video' && videoData && !loading && (
            <VideoInfo 
              video={videoData}
              onAddToHistory={handleVideoDownload}
            />
          )}

          {currentView === 'playlist' && playlistData && !loading && (
            <PlaylistViewer 
              playlist={playlistData}
              onAddToHistory={handleVideoDownload}
            />
          )}
        </div>

        {/* Historial en la parte inferior */}
        <div className="history-section">
          <div className="history-header">
            <h3>Historial de descargas</h3>
            {history.length > 0 && (
              <button onClick={clearHistory} className="clear-history">
                Limpiar historial
              </button>
            )}
          </div>
          
          {history.length === 0 ? (
            <div className="history-empty">
              <p>No hay descargas todavia</p>
              <p className="empty-subtitle">Tu historial aparecera aqui</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item, index) => (
                <div key={index} className="history-item">
                  <div 
                    className="history-item-content"
                    onClick={() => handleHistorySelect(item)}
                  >
                    <img 
                      src={item.thumbnail} 
                      alt={item.title}
                      className="history-thumbnail"
                    />
                    <div className="history-info">
                      <p className="history-title">{item.title}</p>
                      <p className="history-date">{formatDate(item.date)}</p>
                    </div>
                  </div>
                  <button 
                    className="history-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(index);
                    }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>Solo para uso personal. Respeta los derechos de autor.</p>
      </footer>
    </div>
  );
}

export default App;