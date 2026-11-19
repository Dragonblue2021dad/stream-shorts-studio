# Stream Shorts Studio — pipeline foundation

Base modular en Node.js 20+ / TypeScript para producir clips a partir de material al que tengas derecho de acceso. Incluye analizador de momentos con validación Zod, cola BullMQ y worker FFmpeg con salida vertical 9:16 (fondo desenfocado) u horizontal 16:9 y subtítulos opcionales.

## Flujo recomendado

1. **Descubrimiento autorizado:** cada conector de plataforma consulta APIs oficiales/eventos permitidos y normaliza cambios de estado a un evento interno `stream.online` / `stream.offline`. No se implementa scraping ni extracción de URLs privadas.
2. **Ingesta:** el adaptador captura/recibe segmentos en ventanas configurables (p. ej., 5–15 min), los rota con nombres únicos y los registra con su duración y origen. Reintenta con backoff exponencial y límite; evita duplicar ventanas con una clave idempotente.
3. **Transcripción:** extrae audio a un formato compatible con el proveedor ASR y conserva timestamps y offsets por segmento/chunk. Ajusta cada timestamp al reloj de la grabación combinando duración de ventanas y solapamiento.
4. **Selección IA:** `MomentAnalyzer` devuelve JSON validado y descarta intervalos fuera de rango. Para máxima fiabilidad, guardar respuesta, modelo, versión de prompt y marcas temporales, y añadir moderación/revisión humana antes de publicar.
5. **Render:** encola `RenderClipJob`; BullMQ gestiona reintentos y el worker de `src/render/ffmpeg.ts` corta, reencuadra, quema subtítulos opcionales, normaliza audio y codifica MP4 H.264/AAC.
6. **Persistencia y limpieza:** registra estados (`queued`, `processing`, `completed`, `failed`), IDs de job, duración, score, URI y errores en una base de datos. Sube el artefacto a almacenamiento privado (S3/R2) y elimina temporales según política de retención, nunca antes de confirmar la subida.

## Árbol de proyecto

```text
src/
  ai/moment-analyzer.ts
  config/env.ts
  ingest/                 # adaptadores oficiales por plataforma (siguiente módulo)
  queues/render-queue.ts
  render/ffmpeg.ts
  transcribe/             # adaptador Whisper/ASR (siguiente módulo)
  types/clips.ts
  workers/render-worker.ts
```

## Arranque

Requisitos: Node.js 20+, Redis y FFmpeg instalado y disponible en `PATH`.

```bash
cp .env.example .env
npm install
npm run build
npm run worker:render
```

La aplicación que produce los trabajos puede llamar `enqueueRender` desde `src/queues/render-queue.ts`. Job mínimo:

```ts
{
  inputPath: '/ruta/autorizada/ventana.mp4',
  outputPath: './media/output/clip-001.mp4',
  subtitlePath: './media/subtitles/clip-001.srt', // opcional
  startTime: 42.5,
  endTime: 71.2,
  aspectRatio: 'vertical' // o 'horizontal'
}
```

La salida vertical usa fondo ampliado y desenfocado con el vídeo original encajado al centro; horizontal usa 1920×1080 con padding. Los subtítulos se queman si se pasa `subtitlePath`. Para subtítulos dinámicos estilo karaoke se recomienda producir ASS con estilos/tiempos por palabra en el paso de transcripción.

## Integraciones de plataforma (diseño)

- **Twitch:** usar Helix para metadatos/estado según permisos y EventSub para notificaciones `stream.online`/`stream.offline`; validar firmas y renovar suscripciones. Para grabaciones, usar VODs o señales a las que se tenga acceso legítimo; tratar expiraciones y límites de tasa mediante backoff y caché.
- **YouTube:** usar YouTube Data API para localizar emisiones (`liveBroadcastContent === "live"`) respetando cuotas; procesar emisiones/VODs por mecanismos oficiales y autorizados.
- **Kick:** encapsular el mecanismo permitido/contratado en un adaptador independiente. No depender de endpoints privados o técnicas que eludan controles de acceso. Si no hay API de captura soportada para el caso de uso, permitir importación manual de archivos autorizados.
- Los adaptadores deben emitir eventos normalizados y nunca conocer detalles de render. El pipeline debe soportar reintento, reconexión con backoff+jitter, checkpoints, rotación y limpieza con TTL.

## Límites operativos y seguridad

Validar tamaño, duración y codecs antes de procesar; limitar concurrencia por CPU/GPU y proveedor; proteger claves en un secret manager; usar almacenamiento privado y enlaces firmados; evitar confiar en rutas suministradas por clientes en despliegues multiusuario. Configurar cuotas y límites de tasa de Twitch/YouTube/ASR/LLM, respetar términos de servicio y controles técnicos. FFmpeg y los descargadores no deben usarse para sortear DRM, paywalls o restricciones.

Confirma licencias, derechos de autor, permisos de reproducción y uso de voz/imagen antes de capturar, editar o publicar. Cumple las condiciones vigentes de cada plataforma, políticas de privacidad y normativa local. La automatización de publicación queda deliberadamente fuera del scaffold.
