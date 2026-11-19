import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  OUTPUT_DIR: z.string().default('./media/output'),
  TEMP_DIR: z.string().default('./.tmp'),
});

export const env = envSchema.parse(process.env);
