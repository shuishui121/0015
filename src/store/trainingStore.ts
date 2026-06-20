import { create } from 'zustand';
import type { Aria, TrainingState, DetectionResult, SessionStats, BeatPoint, BanStyle } from '@/types';
import { ARIAS, BAN_STYLES, getAriaById } from '@/data/arias';

interface TrainingStore {
  trainingState: TrainingState;
  selectedStyle: BanStyle;
  selectedAria: Aria | null;
  currentTime: number;
  currentBeatIndex: number;
  detectionResults: DetectionResult[];
  sessionStats: SessionStats | null;
  microphoneActive: boolean;
  metronomeActive: boolean;
  sensitivity: number;
  windowStart: number;
  visibleBeats: BeatPoint[];
  lastDetectedBeat: number | null;
  
  setSelectedStyle: (style: BanStyle) => void;
  setSelectedAria: (aria: Aria | null) => void;
  setTrainingState: (state: TrainingState) => void;
  setCurrentTime: (time: number) => void;
  setCurrentBeatIndex: (index: number) => void;
  addDetectionResult: (result: DetectionResult) => void;
  setSessionStats: (stats: SessionStats | null) => void;
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
}

const VISIBLE_WINDOW_MS = 8000;

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  trainingState: 'idle',
  selectedStyle: 'yuanban',
  selectedAria: null,
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

  setSelectedStyle: (style) => {
    const styleArias = ARIAS.filter(a => a.style === style);
    set({ 
      selectedStyle: style,
      selectedAria: styleArias.length > 0 ? styleArias[0] : null,
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
      currentTime: 0,
      currentBeatIndex: 0,
      detectionResults: [],
      sessionStats: null,
      windowStart: 0,
      visibleBeats: aria ? aria.beats.filter(b => b.time < VISIBLE_WINDOW_MS) : [],
    });
  },

  setTrainingState: (state) => set({ trainingState: state }),
  
  setCurrentTime: (time) => {
    const state = get();
    const aria = state.selectedAria;
    if (!aria) return;
    
    let newWindowStart = state.windowStart;
    if (time > state.windowStart + VISIBLE_WINDOW_MS * 0.7) {
      newWindowStart = time - VISIBLE_WINDOW_MS * 0.3;
    } else if (time < state.windowStart + VISIBLE_WINDOW_MS * 0.3 && state.windowStart > 0) {
      newWindowStart = Math.max(0, time - VISIBLE_WINDOW_MS * 0.7);
    }
    
    const windowEnd = newWindowStart + VISIBLE_WINDOW_MS;
    const visibleBeats = aria.beats.filter(b => b.time >= newWindowStart - 500 && b.time <= windowEnd + 500);
    
    let beatIndex = state.currentBeatIndex;
    while (beatIndex < aria.beats.length - 1 && aria.beats[beatIndex + 1].time <= time) {
      beatIndex++;
    }
    while (beatIndex > 0 && aria.beats[beatIndex].time > time) {
      beatIndex--;
    }
    
    set({ 
      currentTime: time, 
      windowStart: newWindowStart,
      visibleBeats,
      currentBeatIndex: beatIndex,
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
    set({
      trainingState: 'idle',
      currentTime: 0,
      currentBeatIndex: 0,
      detectionResults: [],
      sessionStats: null,
      windowStart: 0,
      visibleBeats: get().selectedAria?.beats.filter(b => b.time < VISIBLE_WINDOW_MS) || [],
      lastDetectedBeat: null,
    });
  },

  updateVisibleBeats: () => {
    const aria = get().selectedAria;
    if (!aria) return;
    
    const state = get();
    const windowEnd = state.windowStart + VISIBLE_WINDOW_MS;
    const visibleBeats = aria.beats.filter(b => b.time >= state.windowStart - 500 && b.time <= windowEnd + 500);
    set({ visibleBeats });
  },

  startTraining: () => {
    const state = get();
    if (!state.selectedAria) return;
    
    if (state.trainingState === 'idle' || state.trainingState === 'finished') {
      set({
        trainingState: 'playing',
        currentTime: 0,
        currentBeatIndex: 0,
        detectionResults: [],
        sessionStats: null,
        windowStart: 0,
        visibleBeats: state.selectedAria.beats.filter(b => b.time < VISIBLE_WINDOW_MS),
        lastDetectedBeat: null,
      });
    } else if (state.trainingState === 'paused') {
      set({ trainingState: 'playing' });
    }
  },

  pauseTraining: () => {
    set({ trainingState: 'paused' });
  },

  stopTraining: () => {
    set({
      trainingState: 'idle',
      currentTime: 0,
      currentBeatIndex: 0,
      windowStart: 0,
      visibleBeats: get().selectedAria?.beats.filter(b => b.time < VISIBLE_WINDOW_MS) || [],
      lastDetectedBeat: null,
    });
  },

  finishTraining: () => {
    const state = get();
    if (!state.selectedAria) return;
    
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
    
    const aria = state.selectedAria;
    const sectionStats = aria.sections.map(section => {
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
    const styleInfo = BAN_STYLES[aria.style];
    if (aria.difficulty === 'advanced') {
      suggestions.push(`${styleInfo.name}板式难度较高，可先从基础板式入门`);
    }
    if (suggestions.length === 0) {
      suggestions.push('节奏把握良好，继续保持！可以尝试更复杂的板式进行挑战');
    }
    
    const stats: SessionStats = {
      ariaId: aria.id,
      ariaTitle: aria.title,
      style: aria.style,
      startTime: 0,
      endTime: state.currentTime,
      results,
      averageDeviation,
      accuracyRate,
      worstSections,
      suggestions,
    };
    
    set({ 
      trainingState: 'finished',
      sessionStats: stats,
    });
  },
}));
