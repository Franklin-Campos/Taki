// src/components/HistorySidebar.jsx
import React, { useState } from 'react';

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString();
};

const HistorySidebar = ({ history, onClear, onSelect, onRemove }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!history || history.length === 0) {
    return (
      <div className={`history-sidebar ${isOpen ? 'open' : 'collapsed'}`}>
        <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? '◀' : '▶'}
        </button>
        {isOpen && (
          <div className="history-empty">
            <p>📭 No hay historial</p>
            <p className="empty-subtitle">Los videos descargados aparecerán aquí</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`history-sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <button className="toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '◀' : '▶'}
      </button>
      
      {isOpen && (
        <>
          <div className="history-header">
            <h3>📜 Historial</h3>
            {history.length > 0 && (
              <button onClick={onClear} className="clear-history" title="Limpiar historial">
                🗑️
              </button>
            )}
          </div>
          
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-item-content" onClick={() => onSelect && onSelect(item)}>
                  {item.thumbnail && (
                    <img 
                      src={item.thumbnail} 
                      alt={item.title}
                      className="history-thumbnail"
                    />
                  )}
                  <div className="history-info">
                    <div className="history-title">{item.title.substring(0, 40)}...</div>
                    <div className="history-date">{formatDate(item.timestamp)}</div>
                  </div>
                </div>
                {onRemove && (
                  <button 
                    onClick={() => onRemove(item.id)}
                    className="history-remove"
                    title="Eliminar"
                  >
                    ✖
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HistorySidebar;