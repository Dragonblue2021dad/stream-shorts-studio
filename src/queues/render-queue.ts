import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';
import type { RenderClipJob } from '../types/clips.js';

export const redisConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const renderQueue = new Queue<RenderClipJob>('render-clip', { connection: redisConnection });

export async function enqueueRender(job: RenderClipJob): Promise<string> {
  const queued = await renderQueue.add('render', job, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2_000 },
    removeOnComplete: { age: 86_400, count: 1_000 },
    removeOnFail: { age: 604_800 },
  });
  return queued.id ?? '';
}
