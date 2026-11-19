# Stream Shorts Studio

MVP local en Node.js para recortar un momento de un directo/VOD de Twitch, YouTube o Kick y exportarlo como vídeo vertical 9:16 (1080 × 1920).

> Descarga y comparte solo contenido propio o para el que tengas permiso. La disponibilidad depende de la plataforma, el VOD y las condiciones de uso; los directos protegidos, privados o no archivados pueden no estar disponibles.

## Requisitos

- Node.js 18 o posterior.
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) instalado y accesible como `yt-dlp`.
- [FFmpeg](https://ffmpeg.org/) instalado y accesible como `ffmpeg` (incluyendo `ffprobe` si la instalación de yt-dlp lo requiere).

En Windows puedes usar `winget install yt-dlp.yt-dlp` y `winget install Gyan.FFmpeg`; abre una terminal nueva después de instalarlos. En macOS, con Homebrew: `brew install yt-dlp ffmpeg`.

## Interfaz web

```bash
npm start
```

Abre <http://127.0.0.1:3000>. Pega un enlace, indica el punto de inicio (segundos o `HH:MM:SS`) y una duración de 1–180 segundos. Los MP4 se guardan en `clips/`.

El servidor escucha solo en `127.0.0.1`, por lo que la interfaz está pensada para uso local. Puedes cambiar el puerto con `PORT=3001 npm start`.

## Terminal

```bash
node cli.js "https://www.youtube.com/watch?v=VIDEO_ID" --start 00:02:10 --duration 25 --output clips/jugada.mp4
```

Las opciones `--start`, `--duration` y `--output` son opcionales; por defecto se recortan 30 segundos desde el principio y se genera un nombre en `clips/`.

## Limitaciones del MVP

- Descarga el segmento solicitado con yt-dlp y FFmpeg y recorta el centro de la imagen a vertical; no incluye editor, subtítulos ni reencuadre automático de personas.
- El acceso y los formatos cambian según la plataforma y el contenido. Mantén yt-dlp actualizado; algunas fuentes pueden requerir autenticación admitida por yt-dlp o simplemente no ser accesibles.
- Los clips procesados quedan en la carpeta local `clips/`. No se suben a ningún servicio.
