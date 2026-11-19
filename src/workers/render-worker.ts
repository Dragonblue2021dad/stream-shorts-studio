import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import { renderClip } from '../render/ffmpeg.js';
import type { RenderClipJob } from '../types/clips.js';

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
const worker = new Worker<RenderClipJob>('render-clip', async (job) => {
  await renderClip(job.data);
  return { outputPath: job.data.outputPath };
}, { connection, concurrency: 2 });

worker.on('completed', (job) => console.info(`Render job ${job.id} completed`));
worker.on('failed', (job, error) => console.error(`Render job ${job?.id ?? 'unknown'} failed`, error));

async function shutdown(): Promise<void> {
  await worker.close();
  await connection.quit();
}

process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });
