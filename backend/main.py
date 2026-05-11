# main.py
# API principal de FastAPI para el descargador de YouTube
from fastapi.responses import StreamingResponse
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re
from utils.validators import validate_youtube_url
from utils.youtube import YouTubeExtractor

# Inicializar la aplicación FastAPI
app = FastAPI(
    title="YouTube Downloader API",
    description="API para descargar videos y playlists de YouTube",
    version="1.0.0"
)

# Configurar CORS (Cross-Origin Resource Sharing)
# Esto permite que nuestro frontend (React) se comunique con el backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     # Desarrollo local de Vite
        "http://localhost:3000",     # Desarrollo local alternativo
        "https://tu-frontend.vercel.app"  # Producción (cambiar después)
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Permitir todos los métodos HTTP (GET, POST, etc.)
    allow_headers=["*"],  # Permitir todos los headers
)

# Inicializar el extractor de YouTube
youtube_extractor = YouTubeExtractor()

# Definir modelos de datos (validación automática)
class VideoRequest(BaseModel):
    """Modelo para solicitud de video único"""
    url: str

class BatchVideoRequest(BaseModel):
    """Modelo para solicitud de múltiples videos"""
    urls: List[str]

class ParseUrlResponse(BaseModel):
    """Respuesta para análisis de URL"""
    type: str
    url: Optional[str] = None
    video_url: Optional[str] = None
    playlist_url: Optional[str] = None

# ==================== FUNCIÓN PARA LIMPIAR URLs ====================

def clean_youtube_url(url: str) -> str:
    """
    Limpia la URL de YouTube eliminando parámetros innecesarios
    y convirtiendo URLs acortadas (youtu.be) al formato estándar.
    
    Ejemplos:
    - https://youtu.be/abc123?si=XXXXX -> https://youtube.com/watch?v=abc123
    - https://youtube.com/watch?v=abc123&list=... -> https://youtube.com/watch?v=abc123
    - https://www.youtube.com/watch?v=abc123 -> https://youtube.com/watch?v=abc123
    
    Args:
        url (str): URL original de YouTube
        
    Returns:
        str: URL limpia solo con el ID del video
    """
    # Limpiar URL de caracteres extra
    url = url.strip()
    
    # Caso 1: URLs acortadas (youtu.be)
    if 'youtu.be' in url:
        # Extraer ID después de youtu.be/
        parts = url.split('youtu.be/')
        if len(parts) > 1:
            video_id = parts[1].split('?')[0]  # Eliminar parámetros después de ?
            return f"https://youtube.com/watch?v={video_id}"
    
    # Caso 2: URLs normales de youtube.com
    elif 'youtube.com/watch' in url:
        # Buscar el parámetro v=
        match = re.search(r'[?&]v=([^&]+)', url)
        if match:
            video_id = match.group(1)
            return f"https://youtube.com/watch?v={video_id}"
    
    # Caso 3: URLs de playlist sin video específico
    elif 'youtube.com/playlist' in url:
        # Extraer el ID de la playlist
        match = re.search(r'[?&]list=([^&]+)', url)
        if match:
            playlist_id = match.group(1)
            return f"https://youtube.com/playlist?list={playlist_id}"
    
    # Si no se pudo limpiar, devolver original
    return url

def extract_playlist_id_from_url(url: str) -> Optional[str]:
    """Extrae el ID de una playlist si existe en la URL"""
    match = re.search(r'[?&]list=([^&]+)', url)
    return match.group(1) if match else None

# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    """Endpoint raíz para verificar que la API funciona"""
    return {
        "message": "YouTube Downloader API",
        "version": "1.0.0",
        "status": "online"
    }

@app.get("/api/health")
async def health_check():
    """Endpoint para verificar el estado del servicio"""
    return {"status": "healthy", "service": "youtube-downloader"}

@app.post("/api/parse-url", response_model=ParseUrlResponse)
async def parse_url(request: VideoRequest):
    """
    Analiza una URL para determinar si es video o playlist.
    Primero limpia la URL para eliminar parámetros innecesarios.
    
    Args:
        request: Objeto con la URL a analizar
        
    Returns:
        Tipo de URL y URLs procesadas
    """
    # Limpiar la URL primero (importante para URLs acortadas)
    original_url = request.url
    cleaned_url = clean_youtube_url(original_url)
    
    # Validar que sea una URL de YouTube
    if not validate_youtube_url(cleaned_url):
        raise HTTPException(
            status_code=400, 
            detail="URL inválida. Debe ser una URL de YouTube válida.\n\n💡 Tip: Copia la URL de la barra de direcciones del navegador."
        )
    
    # Verificar si es una playlist (usando la URL original puede tener &list=)
    playlist_id = extract_playlist_id_from_url(original_url) or extract_playlist_id_from_url(cleaned_url)
    
    # Caso 1: Es una playlist (tiene parámetro list y no es una radio)
    if playlist_id and 'radio=1' not in original_url:
        # Si la URL original también tenía un video específico, mostrar ambas opciones
        video_match = re.search(r'[?&]v=([^&]+)', original_url)
        if video_match:
            # Video dentro de playlist
            video_id = video_match.group(1)
            video_url = f"https://youtube.com/watch?v={video_id}"
            playlist_url = f"https://youtube.com/playlist?list={playlist_id}"
            return {
                "type": "video_in_playlist",
                "video_url": video_url,
                "playlist_url": playlist_url
            }
        else:
            # Playlist pura
            return {
                "type": "playlist",
                "url": f"https://youtube.com/playlist?list={playlist_id}"
            }
    
    # Caso 2: URL de video único
    else:
        return {
            "type": "video",
            "url": cleaned_url
        }

@app.post("/api/video-info")
async def get_video_info(request: VideoRequest):
    """
    Obtiene información detallada de un video.
    
    Args:
        request: Objeto con la URL del video
        
    Returns:
        Información del video incluyendo títulos, miniaturas y formatos disponibles
    """
    try:
        # Limpiar URL antes de procesar (importante)
        cleaned_url = clean_youtube_url(request.url)
        
        # Validar URL
        if not validate_youtube_url(cleaned_url):
            raise HTTPException(status_code=400, detail="URL de YouTube inválida")
        
        print(f"📹 Procesando video: {cleaned_url}")  # Debug
        
        # Extraer información usando nuestra clase YouTubeExtractor
        video_info = youtube_extractor.get_video_info(cleaned_url)
        
        # Verificar si se encontraron formatos
        if not video_info.get('formats'):
            print(f"⚠️ No se encontraron formatos para: {cleaned_url}")
        
        return video_info
        
    except Exception as e:
        print(f"❌ Error en video-info: {e}")  # Debug
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/playlist-info")
async def get_playlist_info(request: VideoRequest):
    """
    Obtiene información de una playlist (máximo 10 videos).
    
    Args:
        request: Objeto con la URL de la playlist
        
    Returns:
        Información de la playlist y lista de videos
    """
    try:
        # Limpiar URL (para playlists)
        cleaned_url = clean_youtube_url(request.url)
        
        # Validar URL
        if not validate_youtube_url(cleaned_url):
            raise HTTPException(status_code=400, detail="URL de YouTube inválida")
        
        print(f"📋 Procesando playlist: {cleaned_url}")  # Debug
        
        # Extraer información de la playlist (límite de 10 videos)
        playlist_info = youtube_extractor.get_playlist_info(cleaned_url, max_videos=10)
        
        return playlist_info
        
    except Exception as e:
        print(f"❌ Error en playlist-info: {e}")  # Debug
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/batch-download")
async def batch_download(request: BatchVideoRequest):
    """
    Obtiene URLs de descarga para múltiples videos.
    
    Args:
        request: Objeto con lista de URLs
        
    Returns:
        URLs de descarga para cada video
    """
    # Limpiar todas las URLs primero
    cleaned_urls = [clean_youtube_url(url) for url in request.urls]
    # Forzar límite de 10 videos por seguridad
    urls = cleaned_urls[:10]
    results = []
    
    for url in urls:
        try:
            # Para cada video, obtener la mejor calidad disponible
            video_info = youtube_extractor.get_video_info(url)
            
            # Buscar el mejor formato (el primero de la lista, que está ordenada)
            best_format = video_info['formats'][0] if video_info['formats'] else None
            
            results.append({
                'title': video_info['title'],
                'download_url': best_format['url'] if best_format else None,
                'error': None
            })
        except Exception as e:
            # Si falla un video, continuar con los demás
            results.append({
                'title': 'Error',
                'download_url': None,
                'error': str(e)
            })
    
    return {'results': results}



# ==================== PARA CORRER LOCALMENTE ====================
if __name__ == "__main__":
    import uvicorn
    # Ejecutar el servidor en localhost:8000
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)