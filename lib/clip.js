import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUTPUT_DIR = path.join(ROOT, 'clips');

export function validateClipOptions({ url, start = '0', duration = 30 }) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Introduce una URL válida del directo o VOD.'); }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const supported = host === 'twitch.tv' || host.endsWith('.twitch.tv') || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be' || host === 'kick.com' || host.endsWith('.kick.com');
  if (!supported || !['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error('Solo se admiten URLs de Twitch, YouTube o Kick.');
  }
  if (parsed.username || parsed.password) throw new Error('La URL no puede incluir credenciales.');

  const startSeconds = parseTime(start, 'inicio');
  const durationSeconds = Number(duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds < 1 || durationSeconds > 180) {
    throw new Error('La duración debe estar entre 1 y 180 segundos.');
  }
  if (startSeconds + durationSeconds > 24 * 60 * 60) throw new Error('El inicio y la duración no pueden superar 24 horas.');
  return { url: parsed.toString(), startSeconds, durationSeconds };
}

function parseTime(value, label) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  const text = String(value ?? '').trim();
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  if (!/^\d{1,2}:\d{2}:\d{2}(\.\d+)?$/.test(text)) {
    throw new Error(`El ${label} debe ser segundos o tener formato HH:MM:SS.`);
  }
  const [hours, minutes, seconds] = text.split(':').map(Number);
  if (minutes > 59 || seconds >= 60) throw new Error(`El formato del ${label} no es válido.`);
  return hours * 3600 + minutes * 60 + seconds;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-8000); });
    child.on('error', error => reject(new Error(`No se pudo ejecutar ${command}. ${error.message}`)));
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${command} terminó con error. ${stderr.trim().slice(-1800)}`)));
  });
}

export async function createClip(options, outputPath) {
  const { url, startSeconds, durationSeconds } = validateClipOptions(options);
  const target = path.resolve(outputPath);
  if (path.extname(target).toLowerCase() !== '.mp4') throw new Error('El archivo de salida debe terminar en .mp4.');
  await mkdir(path.dirname(target), { recursive: true });
  const workDir = await mkdtemp(path.join(tmpdir(), 'stream-shorts-'));
  try {
    const template = path.join(workDir, 'source.%(ext)s');
    await run(process.env.YTDLP_PATH || 'yt-dlp', [
      '--no-playlist', '--no-warnings', '--download-sections', `*${startSeconds}-${startSeconds + durationSeconds}`,
      '--force-keyframes-at-cuts', '--merge-output-format', 'mp4', '-o', template, url
    ]);
    const files = await readdir(workDir);
    const source = files.map(file => path.join(workDir, file)).find(file => /\.(mp4|mkv|webm|mov|m4v)$/i.test(file));
    if (!source) throw new Error('No se encontró el vídeo descargado. Comprueba que el directo/VOD sea accesible.');
    const tempOutput = `${target}.partial.mp4`;
    try {
      await run(process.env.FFMPEG_PATH || 'ffmpeg', [
        '-y', '-i', source, '-t', String(durationSeconds), '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', tempOutput
      ]);
      await rename(tempOutput, target);
    } catch (error) {
      await rm(tempOutput, { force: true });
      throw error;
    }
    return target;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = Math.floor(seconds % 60);
  return [hours, minutes, remainder].map(part => String(part).padStart(2, '0')).join(':');
}
