import { create } from 'zustand';
import type { 
  Aria, TrainingState, DetectionResult, SessionStats, BeatPoint, BanStyle,
  AriaSequence, TransitionAnalysis, SequenceSessionStats, TransitionPoint
} from '@/types';
import { 
  ARIAS, BAN_STYLES, getAriaById, ARIA_SEQUENCES, 
  buildSequenceBeats, getSequenceDuration, getTransitionPoints, getSegmentAtTime 
} from '@/data/arias';

interface TrainingStore {
  trainingState: TrainingState;
  selectedStyle: BanStyle;
  selectedAria: Aria | null;
  currentSequence: AriaSequence | null;
  isSequenceMode: boolean;
  currentTime: number;
  currentBeatIndex: number;
  detectionResults: DetectionResult[];
  sessionStats: SessionStats | SequenceSessionStats | null;
  microphoneActive: boolean;
  metronomeActive: boolean;
  sensitivity: number;
  windowStart: number;
  visibleBeats: BeatPoint[];
  lastDetectedBeat: number | null;
  sequenceBeats: BeatPoint[];
  sequenceDuration: number;
  transitionPoints: TransitionPoint[];
  upcomingTransition: TransitionPoint | null;
  
  setSelectedStyle: (style: BanStyle) => void;
  setSelectedAria: (aria: Aria | null) => void;
  setTrainingState: (state: TrainingState) => void;
  setCurrentTime: (time: number) => void;
  setCurrentBeatIndex: (index: number) => void;
  addDetectionResult: (result: DetectionResult) => void;
  setSessionStats: (stats: SessionStats | SequenceSessionStats | null) => void;
  setMicrophoneActive: (active: boolean) => void;
  setMetronomeActive: (active: boolean) => void;
  setSensitivity: (sensitivity: number) => void;
  setLastDetectedBeat: (time: number | null) => void;
  resetSession: () => void;
  updateVisibleBeats: () => void;
  startTraining: () => void;
  pauseTraining: () => void;
  stopTraining: () => void;
  finishTraining: () => void;
  loadSequence: (sequence: AriaSequence | null) => void;
  getSegmentAtTime: (time: number) => ReturnType<typeof getSegmentAtTime>;
  setIsSequenceMode: (isSequence: boolean) => void;
  getActiveBeats: () => BeatPoint[];
  getActiveDuration: () => number;
  getActiveStyle: () => BanStyle;
  getActiveTitle: () => string;
}

const VISIBLE_WINDOW_MS = 8000;

function analyzeTransition(
  transitionPoint: TransitionPoint,
  results: DetectionResult[]
): TransitionAnalysis {
  const windowBefore = 2000;
  const windowAfter = 2000;
  const t = transitionPoint.time;

  const resultsBefore = results.filter(
    r => r.detectedTime >= t - windowBefore && r.detectedTime < t
  );
  const resultsAfter = results.filter(
    r => r.detectedTime >= t && r.detectedTime <= t + windowAfter
  );

  const fromBpm = BAN_STYLES[transitionPoint.fromStyle].bpm;
  const toBpm = BAN_STYLES[transitionPoint.toStyle].bpm;
  const expectedSpeedChange = toBpm / fromBpm;

  const calcBpm = (res: DetectionResult[]): number => {
    const valid = res.filter(r => r.expectedBeat);
    if (valid.length < 2) return 0;
    valid.sort((a, b) => a.detectedTime - b.detectedTime);
    const intervals: number[] = [];
    for (let i = 1; i < valid.length; i++) {
      intervals.push(valid[i].detectedTime - valid[i - 1].detectedTime);
    }
    if (intervals.length === 0) return 0;
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return avgInterval > 0 ? 60000 / avgInterval : 0;
  };

  const bpmBefore = calcBpm(resultsBefore);
  const bpmAfter = calcBpm(resultsAfter);
  const actualSpeedChange = bpmBefore > 0 && bpmAfter > 0 ? bpmAfter / bpmBefore : 1;
  const speedChangeRate = Math.abs(actualSpeedChange - expectedSpeedChange) / expectedSpeedChange;

  const calcStability = (res: DetectionResult[]): number => {
    const valid = res.filter(r => r.expectedBeat).map(r => Math.abs(r.deviation));
    if (valid.length < 2) return 0;
    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const variance = valid.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / valid.length;
    const std = Math.sqrt(variance);
    return mean > 0 ? Math.max(0, 1 - std / 80) : 0;
  };

  const stabilityBefore = calcStability(resultsBefore);
  const stabilityAfter = calcStability(resultsAfter);
  const stabilityChange = Math.abs(stabilityAfter - stabilityBefore);

  const calcAccuracy = (res: DetectionResult[]): number => {
    if (res.length === 0) return 0;
    const good = res.filter(r => r.accuracy === 'perfect' || r.accuracy === 'good').length;
    return good / res.length;
  };

  const transitionResults = results.filter(
    r => r.detectedTime >= t - windowBefore && r.detectedTime <= t + windowAfter
  );
  const beatAccuracy = calcAccuracy(transitionResults);

  const speedControl = Math.max(0, 1 - speedChangeRate * 2);
  const smoothness = Math.max(0, 1 - stabilityChange * 2);
  const totalScore = (smoothness * 0.35 + speedControl * 0.35 + beatAccuracy * 0.3) * 100;

  return {
    time: t,
    fromStyle: transitionPoint.fromStyle,
    toStyle: transitionPoint.toStyle,
    speedChangeRate,
    stabilityBefore,
    stabilityAfter,
    stabilityChange,
    smoothness,
    speedControl,
    beatAccuracy,
    totalScore,
  };
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  trainingState: 'idle',
  selectedStyle: 'yuanban',
  selectedAria: null,
  currentSequence: null,
  isSequenceMode: false,
  currentTime: 0,
  currentBeatIndex: 0,
  detectionResults: [],
  sessionStats: null,
  microphoneActive: false,
  metronomeActive: true,
  sensitivity: 0.6,
  windowStart: 0,
  visibleBeats: [],
  lastDetectedBeat: null,
  sequenceBeats: [],
  sequenceDuration: 0,
  transitionPoints: [],
  upcomingTransition: null,

  getActiveBeats: () => {
    const state = get();
    return state.isSequenceMode ? state.sequenceBeats : (state.selectedAria?.beats || []);
  },

  getActiveDuration: () => {
    const state = get();
    return state.isSequenceMode ? state.sequenceDuration : (state.selectedAria?.totalDuration || 0);
  },

  getActiveStyle: () => {
    const state = get();
    if (state.isSequenceMode && state.currentSequence) {
      const { segment } = state.getSegmentAtTime(state.currentTime);
      if (segment) {
        const aria = getAriaById(segment.ariaId);
        if (aria) return aria.style;
      }
    }
    return state.selectedAria?.style || state.selectedStyle;
  },

  getActiveTitle: () => {
    const state = get();
    return state.isSequenceMode
      ? (state.currentSequence?.title || '')
      : (state.selectedAria?.title || '');
  },

  setSelectedStyle: (style) => {
    const styleArias = ARIAS.filter(a => a.style === style);
    set({ 
      selectedStyle: style,
      selectedAria: styleArias.length > 0 ? styleArias[0] : null,
      isSequenceMode: false,
      currentSequence: null,
      sequenceBeats: [],
      transitionPoints: [],
      currentTime: 0,
      currentBeatIndex: 0,
      detectionResults: [],
      sessionStats: null,
      windowStart: 0,
      visibleBeats: [],
    });
    get().updateVisibleBeats();
  },

  setSelectedAria: (aria) => {
    set({ 
      selectedAria: aria,
      isSequenceMode: false,
      currentSequence: null,
      sequenceBeats: [],
      transitionPoints: [],
      currentTime: 0,
      currentBeatIndex: 0,
      detectionResults: [],
      sessionStats: null,
      windowStart: 0,
      visibleBeats: aria ? aria.beats.filter(b => b.time < VISIBLE_WINDOW_MS) : [],
    });
  },

  setIsSequenceMode: (isSequence) => {
    set({ isSequenceMode: isSequence });
  },

  loadSequence: (sequence) => {
    if (!sequence) {
      set({
        currentSequence: null,
        isSequenceMode: false,
        sequenceBeats: [],
        sequenceDuration: 0,
        transitionPoints: [],
        currentTime: 0,
        currentBeatIndex: 0,
        detectionResults: [],
        sessionStats: null,
        windowStart: 0,
        visibleBeats: [],
      });
      return;
    }

    const beats = buildSequenceBeats(sequence);
    const duration = getSequenceDuration(sequence);
    const transitions = getTransitionPoints(sequence);

    set({
      currentSequence: sequence,
      isSequenceMode: true,
      sequenceBeats: beats,
      sequenceDuration: duration,
      transitionPoints: transitions,
      currentTime: 0,
      currentBeatIndex: 0,
      detectionResults: [],
      sessionStats: null,
      windowStart: 0,
      visibleBeats: beats.filter(b => b.time < VISIBLE_WINDOW_MS),
    });
  },

  getSegmentAtTime: (time) => {
    const sequence = get().currentSequence;
    if (!sequence) return { segment: null, segmentIndex: -1, localTime: 0 };
    return getSegmentAtTime(sequence, time);
  },

  setTrainingState: (state) => set({ trainingState: state }),
  
  setCurrentTime: (time) => {
    const state = get();
    const beats = state.getActiveBeats();
    if (beats.length === 0) return;
    
    let newWindowStart = state.windowStart;
    if (time > state.windowStart + VISIBLE_WINDOW_MS * 0.7) {
      newWindowStart = time - VISIBLE_WINDOW_MS * 0.3;
    } else if (time < state.windowStart + VISIBLE_WINDOW_MS * 0.3 && state.windowStart > 0) {
      newWindowStart = Math.max(0, time - VISIBLE_WINDOW_MS * 0.7);
    }
    
    const windowEnd = newWindowStart + VISIBLE_WINDOW_MS;
    const visibleBeats = beats.filter(b => b.time >= newWindowStart - 500 && b.time <= windowEnd + 500);
    
    let beatIndex = state.currentBeatIndex;
    while (beatIndex < beats.length - 1 && beats[beatIndex + 1].time <= time) {
      beatIndex++;
    }
    while (beatIndex > 0 && beats[beatIndex].time > time) {
      beatIndex--;
    }

    let upcoming: TransitionPoint | null = null;
    if (state.isSequenceMode && state.transitionPoints.length > 0) {
      const WARNING_WINDOW = 3000;
      upcoming = state.transitionPoints.find(
        tp => tp.time > time && tp.time <= time + WARNING_WINDOW
      ) || null;
    }
    
    set({ 
      currentTime: time, 
      windowStart: newWindowStart,
      visibleBeats,
      currentBeatIndex: beatIndex,
      upcomingTransition: upcoming,
    });
  },

  setCurrentBeatIndex: (index) => set({ currentBeatIndex: index }),

  addDetectionResult: (result) => {
    set((state) => ({
      detectionResults: [...state.detectionResults, result],
    }));
  },

  setSessionStats: (stats) => set({ sessionStats: stats }),

  setMicrophoneActive: (active) => set({ microphoneActive: active }),

  setMetronomeActive: (active) => set({ metronomeActive: active }),

  setSensitivity: (sensitivity) => set({ sensitivity }),

  setLastDetectedBeat: (time) => set({ lastDetectedBeat: time }),

  resetSession: () => {
    const state = get();
    const beats = state.getActiveBeats();
    set({
      trainingState: 'idle',
      currentTime: 0,
      currentBeatIndex: 0,
      detectionResults: [],
      sessionStats: null,
      windowStart: 0,
      visibleBeats: beats.filter(b => b.time < VISIBLE_WINDOW_MS),
      lastDetectedBeat: null,
      upcomingTransition: null,
    });
  },

  updateVisibleBeats: () => {
    const state = get();
    const beats = state.getActiveBeats();
    if (beats.length === 0) return;
    
    const windowEnd = state.windowStart + VISIBLE_WINDOW_MS;
    const visibleBeats = beats.filter(b => b.time >= state.windowStart - 500 && b.time <= windowEnd + 500);
    set({ visibleBeats });
  },

  startTraining: () => {
    const state = get();
    const beats = state.getActiveBeats();
    
    if (state.isSequenceMode ? !state.currentSequence : !state.selectedAria) return;
    
    if (state.trainingState === 'idle' || state.trainingState === 'finished') {
      set({
        trainingState: 'playing',
        currentTime: 0,
        currentBeatIndex: 0,
        detectionResults: [],
        sessionStats: null,
        windowStart: 0,
        visibleBeats: beats.filter(b => b.time < VISIBLE_WINDOW_MS),
        lastDetectedBeat: null,
        upcomingTransition: null,
      });
    } else if (state.trainingState === 'paused') {
      set({ trainingState: 'playing' });
    }
  },

  pauseTraining: () => {
    set({ trainingState: 'paused' });
  },

  stopTraining: () => {
    const state = get();
    const beats = state.getActiveBeats();
    set({
      trainingState: 'idle',
      currentTime: 0,
      currentBeatIndex: 0,
      windowStart: 0,
      visibleBeats: beats.filter(b => b.time < VISIBLE_WINDOW_MS),
      lastDetectedBeat: null,
      upcomingTransition: null,
    });
  },

  finishTraining: () => {
    const state = get();
    const results = state.detectionResults;
    const validResults = results.filter(r => r.expectedBeat !== null);
    
    if (validResults.length === 0) {
      set({ trainingState: 'finished' });
      return;
    }
    
    const deviations = validResults.map(r => Math.abs(r.deviation));
    const averageDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    const perfectCount = results.filter(r => r.accuracy === 'perfect' || r.accuracy === 'good').length;
    const accuracyRate = perfectCount / results.length;
    
    const beats = state.getActiveBeats();
    const duration = state.getActiveDuration();
    const style = state.getActiveStyle();
    const ariaOrSeqTitle = state.getActiveTitle();

    const aria = state.selectedAria;
    const sections = aria?.sections || [];
    const sectionStats = sections.map(section => {
      const sectionResults = results.filter(r => 
        r.detectedTime >= section.startTime && r.detectedTime <= section.endTime
      );
      const sectionDeviations = sectionResults
        .filter(r => r.expectedBeat !== null)
        .map(r => Math.abs(r.deviation));
      const avgDev = sectionDeviations.length > 0 
        ? sectionDeviations.reduce((a, b) => a + b, 0) / sectionDeviations.length 
        : 0;
      return { section, avgDev, count: sectionResults.length };
    });
    
    sectionStats.sort((a, b) => b.avgDev - a.avgDev);
    const worstSections = sectionStats
      .filter(s => s.count > 0 && s.avgDev > 50)
      .slice(0, 3)
      .map(s => s.section);
    
    const suggestions: string[] = [];
    if (averageDeviation > 80) {
      suggestions.push('整体节奏偏差较大，建议先放慢速度练习，跟随节拍器熟悉板式节奏');
    }
    if (accuracyRate < 0.7) {
      suggestions.push('准确率较低，建议使用原板等基础板式多加练习');
    }
    const missedCount = results.filter(r => r.accuracy === 'missed').length;
    if (missedCount > results.length * 0.2) {
      suggestions.push('部分节拍未能准确捕捉，注意聆听檀板节奏，保持稳定');
    }
    if (worstSections.length > 0) {
      suggestions.push(`重点练习段落：${worstSections.map(s => s.name).join('、')}`);
    }
    const styleInfo = BAN_STYLES[style];
    
    if (state.isSequenceMode && state.currentSequence) {
      if (state.currentSequence.difficulty === 'advanced') {
        suggestions.push(`${state.currentSequence.title}难度较高，可先从单板式练习入门`);
      }
    } else if (aria?.difficulty === 'advanced') {
      suggestions.push(`${styleInfo.name}板式难度较高，可先从基础板式入门`);
    }

    let stats: SessionStats | SequenceSessionStats;

    if (state.isSequenceMode && state.currentSequence) {
      const transitions = state.transitionPoints.map(tp => analyzeTransition(tp, results));
      const validTransitions = transitions.filter(t => 
        !isNaN(t.totalScore) && isFinite(t.totalScore)
      );
      const transitionAverageScore = validTransitions.length > 0
        ? validTransitions.reduce((a, b) => a + b.totalScore, 0) / validTransitions.length
        : 0;

      if (validTransitions.length > 0) {
        const weakTransitions = validTransitions
          .filter(t => t.totalScore < 70)
          .map(t => `${BAN_STYLES[t.fromStyle].name}转${BAN_STYLES[t.toStyle].name}`);
        if (weakTransitions.length > 0) {
          suggestions.push(`板式过渡需加强：${weakTransitions.join('、')}`);
        }
        const avgSmooth = validTransitions.reduce((a, b) => a + b.smoothness, 0) / validTransitions.length;
        if (avgSmooth < 0.6) {
          suggestions.push('过渡平滑度不足，注意节奏渐变时的均匀性');
        }
      }

      if (suggestions.length === 0) {
        suggestions.push('节奏把握良好，继续保持！可以尝试更复杂的板式序列进行挑战');
      }

      stats = {
        ariaId: '',
        ariaTitle: ariaOrSeqTitle,
        style,
        startTime: 0,
        endTime: state.currentTime,
        results,
        averageDeviation,
        accuracyRate,
        worstSections,
        suggestions,
        sequenceId: state.currentSequence.id,
        sequenceTitle: state.currentSequence.title,
        transitions: validTransitions,
        transitionAverageScore,
      };
    } else {
      if (suggestions.length === 0) {
        suggestions.push('节奏把握良好，继续保持！可以尝试更复杂的板式进行挑战');
      }

      stats = {
        ariaId: aria?.id || '',
        ariaTitle: ariaOrSeqTitle,
        style,
        startTime: 0,
        endTime: state.currentTime,
        results,
        averageDeviation,
        accuracyRate,
        worstSections,
        suggestions,
      };
    }
    
    set({ 
      trainingState: 'finished',
      sessionStats: stats,
    });
  },
}));
