// src/App.jsx
import React, { useState } from 'react';
import UrlInput from './components/UrlInput';
import VideoInfo from './components/VideoInfo';
import PlaylistViewer from './components/PlaylistViewer';
import HistorySidebar from './components/HistorySidebar';
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

  return (
    <div className={`app ${theme}`}>
      <header className="app-header">
        <div className="header-left">
          <h1>📥 YouTube Downloader</h1>
          {currentView !== 'idle' && (
            <button onClick={resetView} className="back-btn" title="Nueva búsqueda">
              ← Nuevo
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
              <p>Obteniendo información...</p>
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

        <HistorySidebar 
          history={history}
          onClear={clearHistory}
          onSelect={handleHistorySelect}
          onRemove={removeFromHistory}
        />
      </main>

      <footer className="app-footer">
        <p>
          ⚠️ Solo para uso personal. Respeta los derechos de autor.
          <br />
          Máximo 10 videos por playlist para garantizar rendimiento.
        </p>
      </footer>
    </div>
  );
}

export default App;