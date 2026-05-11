# utils/validators.py
# Módulo para validar URLs de YouTube

import re

def validate_youtube_url(url: str) -> bool:
    """
    Valida si una URL pertenece a YouTube.
    
    Args:
        url (str): La URL a validar
        
    Returns:
        bool: True si es una URL válida de YouTube, False en caso contrario
    """
    # Limpiar la URL primero
    url = url.strip()
    
    # Patrones de URLs válidas de YouTube (más flexibles)
    patterns = [
        r'(youtube\.com/watch\?v=)',      # URLs normales
        r'(youtu\.be/)',                   # URLs cortas
        r'(youtube\.com/playlist\?list=)', # URLs de playlist
        r'(youtube\.com/watch\?.*&list=)', # URLs de video dentro de playlist
        r'(m\.youtube\.com/watch\?v=)'     # URLs móviles
    ]
    
    # Verificar si la URL coincide con algún patrón
    return any(re.search(pattern, url) for pattern in patterns)

def extract_video_id(url: str) -> str:
    """
    Extrae el ID del video de una URL de YouTube.
    
    Args:
        url (str): URL completa de YouTube
        
    Returns:
        str: ID del video o None si no se encuentra
    """
    # Patrón para capturar el ID del video
    pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11})(?:[?&]|$)'
    match = re.search(pattern, url)
    return match.group(1) if match else None

def extract_playlist_id(url: str) -> str:
    """
    Extrae el ID de la playlist de una URL de YouTube.
    
    Args:
        url (str): URL completa de YouTube
        
    Returns:
        str: ID de la playlist o None si no se encuentra
    """
    pattern = r'[?&]list=([^&]+)'
    match = re.search(pattern, url)
    return match.group(1) if match else None