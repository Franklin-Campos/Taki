// src/components/ThemeToggle.jsx
import React from 'react';

const ThemeToggle = ({ theme, onToggle }) => {
  return (
    <button 
      className="theme-toggle" 
      onClick={onToggle}
      aria-label="Cambiar tema"
      title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
};

export default ThemeToggle;