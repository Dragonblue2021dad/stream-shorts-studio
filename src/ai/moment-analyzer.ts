import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env.js';
import type { ClipCandidate, TranscriptSegment } from '../types/clips.js';

const ClipCandidateSchema = z.object({
  start_time: z.number().finite().nonnegative(),
  end_time: z.number().finite().positive(),
  title: z.string().trim().min(1).max(100),
  virality_score: z.number().int().min(1).max(100),
  reason: z.string().trim().min(1).max(500),
  suggested_caption: z.string().trim().min(1).max(500),
}).strict();

const ClipListSchema = z.array(ClipCandidateSchema).min(1).max(10);

export class MomentAnalyzer {
  private readonly client: OpenAI;

  constructor(apiKey = env.OPENAI_API_KEY, private readonly model = env.OPENAI_MODEL) {
    if (!apiKey) throw new Error('OPENAI_API_KEY is required to analyze moments');
    this.client = new OpenAI({ apiKey });
  }

  async analyze(segments: TranscriptSegment[], mediaDurationSeconds: number): Promise<ClipCandidate[]> {
    if (!segments.length) throw new Error('Transcript must contain at least one segment');
    if (!Number.isFinite(mediaDurationSeconds) || mediaDurationSeconds <= 0) {
      throw new Error('mediaDurationSeconds must be positive');
    }

    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Find up to 10 self-contained, engaging highlight moments. Return ONLY a JSON object with a "clips" array. Each clip must have start_time and end_time in seconds, title, virality_score (integer 1-100), reason, and suggested_caption. Keep timestamps inside the supplied media duration, include enough context to avoid cutting speech, and do not invent events not supported by the transcript.',
        },
        {
          role: 'user',
          content: JSON.stringify({ duration_seconds: mediaDurationSeconds, transcript: segments }),
        },
      ],
    });

    const raw = completion.choices[0]?.message.content;
    if (!raw) throw new Error('AI returned an empty response');
    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch {
      throw new Error('AI response was not valid JSON');
    }
    const candidates = ClipListSchema.parse(
      typeof decoded === 'object' && decoded !== null && 'clips' in decoded
        ? (decoded as { clips: unknown }).clips
        : decoded,
    ) as ClipCandidate[];

    const valid = candidates.filter((clip) =>
      clip.end_time > clip.start_time &&
      clip.start_time < mediaDurationSeconds &&
      clip.end_time <= mediaDurationSeconds,
    );
    if (!valid.length) throw new Error('AI returned no clips with valid timestamp ranges');
    return valid;
  }
}
