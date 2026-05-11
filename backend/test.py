# test.py
import yt_dlp

url = "https://youtube.com/watch?v=7E9-c2Z6adU"

ydl_opts = {
    'quiet': True,
    'no_warnings': False,
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(url, download=False)
    
    print(f"Título: {info.get('title')}")
    print(f"Número total de formatos: {len(info.get('formats', []))}")
    print("\nPrimeros 5 formatos disponibles:")
    
    for i, f in enumerate(info.get('formats', [])[:5]):
        print(f"  {i+1}. Calidad: {f.get('height', 'audio')}p, Ext: {f.get('ext')}, Vcodec: {f.get('vcodec')}, Acodec: {f.get('acodec')}")