#!/usr/bin/env node
import path from 'node:path';
import { createClip, formatTime, validateClipOptions, OUTPUT_DIR } from './lib/clip.js';

const args = process.argv.slice(2);
const url = args[0];
const options = {};
for (let i = 1; i < args.length; i++) {
  const key = args[i];
  if (!['--start', '--duration', '--output'].includes(key) || !args[i + 1]) usage(1);
  options[key.slice(2)] = args[++i];
}
if (!url || args.includes('--help') || args.includes('-h')) usage(url ? 0 : 1);

try {
  const validated = validateClipOptions({ url, start: options.start ?? '0', duration: options.duration ?? 30 });
  const output = path.resolve(options.output || path.join(OUTPUT_DIR, `clip-${Date.now()}.mp4`));
  console.log(`Recortando desde ${formatTime(validated.startSeconds)} durante ${validated.durationSeconds} segundos...`);
  console.log('La fuente debe ser accesible yyt-dlp/FFmpeg deben estar instalados.');
  const result = await createClip({ url, start: validated.startSeconds, duration: validated.durationSeconds }, output);
  console.log(`Clip vertical creado: ${result}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}

function usage(code) {
  console.log(`Uso: node cli.js <URL> [--start HH:MM:SS] [--duration SEGUNDOS] [--output archivo.mp4]\n\nEjemplo:\n  node cli.js "https://www.youtube.com/watch?v=..." --start 00:02:10 --duration 25 --output clips/jugada.mp4`);
  process.exit(code);
}
