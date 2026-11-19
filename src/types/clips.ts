export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface ClipCandidate {
  start_time: number;
  end_time: number;
  title: string;
  virality_score: number;
  reason: string;
  suggested_caption: string;
}

export type ClipAspectRatio = 'vertical' | 'horizontal';

export interface RenderClipJob {
  inputPath: string;
  outputPath: string;
  subtitlePath?: string;
  startTime: number;
  endTime: number;
  aspectRatio: ClipAspectRatio;
}
