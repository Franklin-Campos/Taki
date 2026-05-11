// src/components/UrlInput.jsx
import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const UrlInput = ({ onVideoDetected, onPlaylistDetected, loading }) => {
  const [url, setUrl] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Por favor ingresa una URL');
      return;
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      setError('URL inválida. Debe ser de YouTube');
      return;
    }

    setError('');
    

    try {
      const response = await axios.post(`${API_URL}/api/parse-url`, { url });
      const data = response.data;

      if (data.type === 'video') {
        onVideoDetected(data.url);
      } else if (data.type === 'video_in_playlist') {
        setPendingData(data);
        setShowDialog(true);
      } else if (data.type === 'playlist') {
        onPlaylistDetected(data.url);
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'Error al procesar la URL');
    } 
  };

  const handleDecision = (choice) => {
    setShowDialog(false);
    
    if (choice === 'single') {
      onVideoDetected(pendingData.video_url);
    } else {
      onPlaylistDetected(pendingData.playlist_url);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="url-input-form">
        <div className="input-group">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... o https://youtube.com/playlist?list=..."
            disabled={loading}
            className="url-input"
          />
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Analizando...' : 'Analizar'}
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
      </form>

      {showDialog && (
        <div className="modal-overlay" onClick={() => setShowDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🎵 ¿Qué quieres descargar?</h3>
            <p>Este enlace pertenece a una playlist</p>
            <div className="modal-buttons">
              <button onClick={() => handleDecision('single')} className="btn-primary">
                🎵 Solo esta canción
              </button>
              <button onClick={() => handleDecision('playlist')} className="btn-secondary">
                📋 Toda la playlist (máx. 10)
              </button>
            </div>
            <button onClick={() => setShowDialog(false)} className="modal-close">
              ✖
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default UrlInput;