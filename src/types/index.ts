export type BeatType = 'ban' | 'yan';

export type BanStyle = 
  | 'yuanban' 
  | 'manban' 
  | 'liushui' 
  | 'kuaiban' 
  | 'yaoban'
  | 'erliu'
  | 'sipingdiao'
  | 'nanbangzi'
  | 'daoban'
  | 'kuaiyuanban';

export interface BeatPoint {
  time: number;
  type: BeatType;
  index: number;
}

export interface AriaSection {
  name: string;
  startTime: number;
  endTime: number;
  lyrics?: string;
}

export interface BanStyleInfo {
  id: BanStyle;
  name: string;
  category: 'xipi' | 'erhuang' | 'other';
  categoryName: string;
  bpm: number;
  beatsPerMeasure: number;
  description: string;
}

export interface Aria {
  id: string;
  title: string;
  opera: string;
  role: string;
  style: BanStyle;
  totalDuration: number;
  beats: BeatPoint[];
  sections: AriaSection[];
  difficulty: 'basic' | 'intermediate' | 'advanced';
}

export interface DetectionResult {
  detectedTime: number;
  expectedBeat: BeatPoint | null;
  deviation: number;
  isAccurate: boolean;
  accuracy: 'perfect' | 'good' | 'poor' | 'missed';
  direction?: 'early' | 'late';
}

export interface SessionStats {
  ariaId: string;
  ariaTitle: string;
  style: BanStyle;
  startTime: number;
  endTime: number;
  results: DetectionResult[];
  averageDeviation: number;
  accuracyRate: number;
  worstSections: AriaSection[];
  suggestions: string[];
}

export type TrainingState = 'idle' | 'ready' | 'playing' | 'paused' | 'finished';
