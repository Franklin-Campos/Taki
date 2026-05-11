// src/hooks/useHistory.js
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'youtube_download_history';
const MAX_HISTORY_ITEMS = 10;

export const useHistory = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
      } catch (error) {
        console.error('Error cargando historial:', error);
        setHistory([]);
      }
    }
  }, []);

  const addToHistory = (item) => {
    const newItem = {
      id: Date.now(),
      title: item.title,
      url: item.url,
      thumbnail: item.thumbnail,
      timestamp: Date.now(),
      type: item.type || 'video'
    };

    setHistory(prevHistory => {
      const exists = prevHistory.some(h => h.url === item.url);
      if (exists) return prevHistory;

      const newHistory = [newItem, ...prevHistory].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const removeFromHistory = (id) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return { history, addToHistory, clearHistory, removeFromHistory };
};