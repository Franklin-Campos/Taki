# utils/youtube.py
# Módulo para interactuar con YouTube usando yt-dlp

import yt_dlp
import re
from typing import Dict, List, Optional, Any

class YouTubeExtractor:
    """
    Clase principal para extraer información de YouTube.
    Encapsula toda la lógica de yt-dlp para mantener el código limpio.
    """
    
    def __init__(self):
        # Configuración base para yt-dlp
        self.base_options = {
            'quiet': True,           # No mostrar mensajes de consola
            'no_warnings': True,     # No mostrar advertencias
            'extract_flat': False,   # Extraer información completa
            'ignoreerrors': True,    # Continuar si hay errores en algunos videos
        }
    
    def get_video_info(self, url: str) -> Dict[str, Any]:
        """
        Obtiene información detallada de un video.
        
        Args:
            url (str): URL del video de YouTube
            
        Returns:
            dict: Información del video incluyendo títulos, miniaturas, formatos
        """
        try:
            # Configuración más permisiva para YouTube
            ydl_opts = {
                'quiet': True,
                'no_warnings': False,
                'extract_flat': False,
                'force_generic_extractor': False,
                'ignoreerrors': True,
                'no_check_certificate': True,
                'prefer_insecure': False,
            }
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                
                if not info:
                    raise Exception("No se pudo extraer información del video")
                
                # Procesar formatos
                formats = self._process_formats(info.get('formats', []))
                
                print(f"✅ Formatos encontrados: {len(formats)}")
                
                return {
                    'title': info.get('title', 'Sin título'),
                    'thumbnail': info.get('thumbnail', ''),
                    'duration': info.get('duration', 0),
                    'channel': info.get('uploader', 'Desconocido'),
                    'formats': formats,
                    'url': url
                }
                
        except Exception as e:
            print(f"❌ Error en get_video_info: {e}")
            raise Exception(f"Error al obtener video: {str(e)}")
    
    def get_playlist_info(self, url: str, max_videos: int = 10) -> Dict[str, Any]:
        """
        Obtiene información de una playlist con límite de videos.
        """
        try:
            playlist_options = {
                **self.base_options,
                'extract_flat': True,
                'playlistend': max_videos
            }
            
            with yt_dlp.YoutubeDL(playlist_options) as ydl:
                info = ydl.extract_info(url, download=False)
                
                videos = []
                entries = info.get('entries', [])
                
                for entry in entries[:max_videos]:
                    if entry:
                        videos.append({
                            'title': entry.get('title', 'Sin título'),
                            'video_id': entry.get('id', ''),
                            'url': f"https://youtube.com/watch?v={entry.get('id', '')}",
                            'duration': entry.get('duration', 0)
                        })
                
                total_videos = len(info.get('entries', []))
                
                return {
                    'title': info.get('title', 'Playlist sin título'),
                    'total_videos': total_videos,
                    'videos_shown': len(videos),
                    'warning': f"Esta playlist tiene {total_videos} videos. Solo se muestran los primeros {max_videos}." if total_videos > max_videos else None,
                    'videos': videos
                }
        except Exception as e:
            print(f"❌ Error en get_playlist_info: {e}")
            raise Exception(f"Error al obtener playlist: {str(e)}")
    
    def _process_formats(self, raw_formats: List[Dict]) -> List[Dict]:
        """Procesa y filtra los formatos de video disponibles."""
        processed = []
        
        for f in raw_formats:
            # Video + audio
            if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                processed.append({
                    'quality': self._get_quality_label(f),
                    'ext': f.get('ext', 'mp4'),
                    'url': f.get('url'),
                    'size': f.get('filesize', 0),
                    'type': 'video'
                })
            # Solo audio
            elif f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                processed.append({
                    'quality': 'audio',
                    'ext': 'mp3',
                    'url': f.get('url'),
                    'size': f.get('filesize', 0),
                    'type': 'audio'
                })
        
        # Eliminar duplicados
        seen_qualities = set()
        unique_formats = []
        for fmt in processed:
            quality_key = f"{fmt['quality']}_{fmt['type']}"
            if quality_key not in seen_qualities:
                seen_qualities.add(quality_key)
                unique_formats.append(fmt)
        
        # Ordenar por calidad (mayor a menor)
        unique_formats.sort(key=lambda x: self._get_quality_value(x['quality']), reverse=True)
        
        return unique_formats[:8]
    
    def _get_quality_label(self, format_info: Dict) -> str:
        """Convierte la información de formato en una etiqueta legible."""
        height = format_info.get('height', 0)
        if height:
            return f"{height}p"
        
        format_note = format_info.get('format_note', '')
        if format_note:
            return format_note
        
        return "standard"
    
    def _get_quality_value(self, quality: str) -> int:
        """Convierte una etiqueta de calidad en un valor numérico."""
        if quality == 'audio':
            return -1
        
        match = re.search(r'(\d+)', quality)
        return int(match.group(1)) if match else 0