import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { env } from '../config/env.js';
import type { RenderClipJob } from '../types/clips.js';

function escapeFilterPath(value: string): string {
  // Escape FFmpeg filtergraph delimiters (not shell escaping; spawn is invoked without a shell).
  return value.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'").replaceAll(',', '\\,').replaceAll('[', '\\[').replaceAll(']', '\\]');
}

function makeVideoFilter(job: RenderClipJob): string {
  if (job.aspectRatio === 'horizontal') {
    const filters = ['scale=1920:1080:force_original_aspect_ratio=decrease', 'pad=1920:1080:(ow-iw)/2:(oh-ih)/2'];
    if (job.subtitlePath) filters.push(`subtitles='${escapeFilterPath(job.subtitlePath)}'`);
    return filters.join(',');
  }

  const filters = [
    'split=2[background][foreground]',
    '[background]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:10[bg]',
    '[foreground]scale=1080:1920:force_original_aspect_ratio=decrease[fg]',
    '[bg][fg]overlay=(W-w)/2:(H-h)/2',
  ];
  if (job.subtitlePath) filters.push(`subtitles='${escapeFilterPath(job.subtitlePath)}'`);
  return filters.join(';');
}

export async function renderClip(job: RenderClipJob): Promise<void> {
  const duration = job.endTime - job.startTime;
  if (!Number.isFinite(job.startTime) || !Number.isFinite(job.endTime) || job.startTime < 0 || duration <= 0) {
    throw new Error('Invalid clip time range');
  }
  await mkdir(dirname(job.outputPath), { recursive: true });

  const args = [
    '-hide_banner', '-y', '-ss', String(job.startTime), '-i', job.inputPath,
    '-t', String(duration), '-filter_complex', makeVideoFilter(job),
    '-map', job.aspectRatio === 'vertical' ? '[v]' : '0:v:0', '-map', '0:a:0?',
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:v', 'libx264', '-preset', 'medium',
    '-crf', '20', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    job.outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(env.FFMPEG_PATH, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => { stderr = (stderr + chunk).slice(-12_000); });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
    });
  });
}
