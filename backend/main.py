# main.py
# API principal de FastAPI para el descargador de YouTube

from fastapi.responses import StreamingResponse
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import re
import yt_dlp
from utils.validators import validate_youtube_url
from utils.youtube import YouTubeExtractor

# Inicializar la aplicación FastAPI
app = FastAPI(
    title="YouTube Downloader API",
    description="API para descargar videos y playlists de YouTube",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://taki-evihi677c-franks-projects-012fff81.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar el extractor de YouTube
youtube_extractor = YouTubeExtractor()

# Modelos de datos
class VideoRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    format_type: Optional[str] = "video"  # "video" o "audio"
    quality: Optional[str] = "best"  # "144p", "360p", "720p", "audio", etc.

class BatchVideoRequest(BaseModel):
    urls: List[str]

class ParseUrlResponse(BaseModel):
    type: str
    url: Optional[str] = None
    video_url: Optional[str] = None
    playlist_url: Optional[str] = None

# ==================== FUNCIONES AUXILIARES ====================

def clean_youtube_url(url: str) -> str:
    """Limpia la URL de YouTube eliminando parámetros innecesarios."""
    url = url.strip()
    
    if 'youtu.be' in url:
        parts = url.split('youtu.be/')
        if len(parts) > 1:
            video_id = parts[1].split('?')[0]
            return f"https://youtube.com/watch?v={video_id}"
    
    elif 'youtube.com/watch' in url:
        match = re.search(r'[?&]v=([^&]+)', url)
        if match:
            video_id = match.group(1)
            return f"https://youtube.com/watch?v={video_id}"
    
    elif 'youtube.com/playlist' in url:
        match = re.search(r'[?&]list=([^&]+)', url)
        if match:
            playlist_id = match.group(1)
            return f"https://youtube.com/playlist?list={playlist_id}"
    
    return url

def extract_playlist_id_from_url(url: str) -> Optional[str]:
    match = re.search(r'[?&]list=([^&]+)', url)
    return match.group(1) if match else None

# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    return {
        "message": "YouTube Downloader API",
        "version": "1.0.0",
        "status": "online"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "youtube-downloader"}

@app.post("/api/parse-url", response_model=ParseUrlResponse)
async def parse_url(request: VideoRequest):
    original_url = request.url
    cleaned_url = clean_youtube_url(original_url)
    
    if not validate_youtube_url(cleaned_url):
        raise HTTPException(
            status_code=400, 
            detail="URL inválida. Debe ser una URL de YouTube válida."
        )
    
    playlist_id = extract_playlist_id_from_url(original_url) or extract_playlist_id_from_url(cleaned_url)
    
    if playlist_id and 'radio=1' not in original_url:
        video_match = re.search(r'[?&]v=([^&]+)', original_url)
        if video_match:
            video_id = video_match.group(1)
            video_url = f"https://youtube.com/watch?v={video_id}"
            playlist_url = f"https://youtube.com/playlist?list={playlist_id}"
            return {
                "type": "video_in_playlist",
                "video_url": video_url,
                "playlist_url": playlist_url
            }
        else:
            return {
                "type": "playlist",
                "url": f"https://youtube.com/playlist?list={playlist_id}"
            }
    else:
        return {
            "type": "video",
            "url": cleaned_url
        }

@app.post("/api/video-info")
async def get_video_info(request: VideoRequest):
    try:
        cleaned_url = clean_youtube_url(request.url)
        
        if not validate_youtube_url(cleaned_url):
            raise HTTPException(status_code=400, detail="URL de YouTube inválida")
        
        print(f"📹 Procesando video: {cleaned_url}")
        
        video_info = youtube_extractor.get_video_info(cleaned_url)
        
        if not video_info.get('formats'):
            print(f"⚠️ No se encontraron formatos para: {cleaned_url}")
        
        return video_info
        
    except Exception as e:
        print(f"❌ Error en video-info: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/playlist-info")
async def get_playlist_info(request: VideoRequest):
    try:
        cleaned_url = clean_youtube_url(request.url)
        
        if not validate_youtube_url(cleaned_url):
            raise HTTPException(status_code=400, detail="URL de YouTube inválida")
        
        print(f"📋 Procesando playlist: {cleaned_url}")
        
        playlist_info = youtube_extractor.get_playlist_info(cleaned_url, max_videos=10)
        
        return playlist_info
        
    except Exception as e:
        print(f"❌ Error en playlist-info: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/batch-download")
async def batch_download(request: BatchVideoRequest):
    cleaned_urls = [clean_youtube_url(url) for url in request.urls]
    urls = cleaned_urls[:10]
    results = []
    
    for url in urls:
        try:
            video_info = youtube_extractor.get_video_info(url)
            best_format = video_info['formats'][0] if video_info['formats'] else None
            
            results.append({
                'title': video_info['title'],
                'download_url': best_format['url'] if best_format else None,
                'error': None
            })
        except Exception as e:
            results.append({
                'title': 'Error',
                'download_url': None,
                'error': str(e)
            })
    
    return {'results': results}

# ==================== ENDPOINT PARA DESCARGAR (CORREGIDO) ====================

@app.post("/api/download")
async def download_video(request: DownloadRequest):
    """
    Endpoint para descargar videos/audio con streaming eficiente.
    Recibe URL de YouTube y el formato deseado, obtiene URL directa con yt-dlp y hace streaming.
    """
    try:
        url = request.url
        format_type = request.format_type  # "video" o "audio"
        quality = request.quality  # "720p", "480p", "audio", etc.
        
        if not url:
            raise HTTPException(status_code=400, detail="URL no proporcionada")
        
        # Validar que sea URL de YouTube
        if not validate_youtube_url(url):
            raise HTTPException(status_code=400, detail="URL de YouTube inválida")
        
        print(f"📥 Iniciando descarga: {url}")
        print(f"📋 Formato: {format_type} | Calidad: {quality}")
        
        # Configurar formato según lo solicitado
        if format_type == "audio":
            # Solo audio - buscar el mejor formato de audio
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'format': 'bestaudio/best',
            }
        else:
            # Video con altura específica
            height = quality.replace('p', '') if quality != 'best' else '720'
            ydl_opts = {
                'quiet': True,
                'no_warnings': True,
                'format': f'best[height<={height}]',
            }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            if format_type == "audio":
                # Buscar SOLO formatos de audio puro (sin video)
                best_format = None
                for f in info.get('formats', []):
                    # Audio puro: tiene codec de audio pero NO tiene codec de video
                    if f.get('acodec') != 'none' and f.get('vcodec') == 'none':
                        if not best_format or f.get('abr', 0) > best_format.get('abr', 0):
                            best_format = f
                
                # Si no encuentra audio puro, usar el mejor audio disponible
                if not best_format:
                    for f in info.get('formats', []):
                        if f.get('acodec') != 'none':
                            if not best_format or f.get('abr', 0) > best_format.get('abr', 0):
                                best_format = f
                
                ext = 'mp3'
                media_type = "audio/mpeg"
            else:
                # Buscar formato de video CON audio
                best_format = None
                for f in info.get('formats', []):
                    if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                        if not best_format or f.get('height', 0) > best_format.get('height', 0):
                            best_format = f
                
                # Si no hay combinado, buscar solo video
                if not best_format:
                    for f in info.get('formats', []):
                        if f.get('vcodec') != 'none':
                            if not best_format or f.get('height', 0) > best_format.get('height', 0):
                                best_format = f
                
                ext = best_format.get('ext', 'mp4') if best_format else 'mp4'
                media_type = f"video/{ext}" if best_format else "video/mp4"
            
            if not best_format or not best_format.get('url'):
                raise HTTPException(status_code=400, detail="No se pudo obtener URL de descarga")
            
            direct_url = best_format['url']
            title = info.get('title', 'video').replace('/', '_').replace('\\', '_')
            
            print(f"✅ URL obtenida | Altura: {best_format.get('height', 'audio')} | Ext: {ext}")
            print(f"✅ Codec video: {best_format.get('vcodec')} | Codec audio: {best_format.get('acodec')}")
            
            # Streaming desde la URL directa
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "*/*",
                "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
                "Accept-Encoding": "identity",
                "Connection": "keep-alive",
            }
            
            async def generate():
                async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
                    async with client.stream("GET", direct_url, headers=headers) as response:
                        if response.status_code != 200:
                            raise Exception(f"Error al obtener el video: HTTP {response.status_code}")
                        
                        async for chunk in response.aiter_bytes(chunk_size=1024 * 1024):
                            yield chunk
            
            return StreamingResponse(
                generate(),
                media_type=media_type,
                headers={
                    "Content-Disposition": f'attachment; filename="{title}.{ext}"',
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                }
            )
            
    except HTTPException:
        raise
    except yt_dlp.utils.DownloadError as e:
        print(f"❌ Error de yt-dlp: {e}")
        raise HTTPException(status_code=400, detail="No se pudo acceder al video. Puede estar restringido o no disponible.")
    except Exception as e:
        print(f"❌ Error en descarga: {e}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

# ==================== ENDPOINT PARA OBTENER URL DIRECTA ====================

@app.post("/api/get-direct-url")
async def get_direct_url(request: VideoRequest):
    """
    Obtiene la URL directa del video sin descargarlo.
    """
    try:
        url = request.url
        if not url:
            raise HTTPException(status_code=400, detail="URL no proporcionada")
        
        print(f"🔗 Obteniendo URL directa...")
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            best_format = None
            best_height = 0
            
            for f in info.get('formats', []):
                if f.get('vcodec') != 'none' and f.get('acodec') != 'none':
                    height = f.get('height', 0)
                    if height > best_height:
                        best_height = height
                        best_format = f
            
            if not best_format:
                for f in info.get('formats', []):
                    if f.get('acodec') != 'none':
                        best_format = f
                        break
            
            if not best_format or not best_format.get('url'):
                raise Exception("No se encontró URL de descarga")
            
            print(f"✅ URL obtenida: {best_format.get('height', 'audio')}p")
            
            return {
                "success": True,
                "url": best_format['url'],
                "title": info.get('title', 'video'),
                "ext": best_format.get('ext', 'mp4'),
                "quality": best_format.get('height', 'audio')
            }
            
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ==================== EJECUCIÓN LOCAL ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)