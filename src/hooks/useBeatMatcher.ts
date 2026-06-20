import { useRef, useCallback } from 'react';
import type { BeatPoint, DetectionResult, Aria } from '@/types';

export const PERFECT_THRESHOLD = 30;
export const GOOD_THRESHOLD = 80;
export const POOR_THRESHOLD = 120;
export const MAX_MATCH_WINDOW = 200;

interface BeatMatcherState {
  lastMatchedIndex: number;
  matchedBeats: Set<number>;
  pendingDetections: Array<{ time: number; strength: number }>;
}

export function useBeatMatcher() {
  const stateRef = useRef<BeatMatcherState>({
    lastMatchedIndex: 0,
    matchedBeats: new Set(),
    pendingDetections: [],
  });

  const reset = useCallback(() => {
    stateRef.current = {
      lastMatchedIndex: 0,
      matchedBeats: new Set(),
      pendingDetections: [],
    };
  }, []);

  const findNearestBeat = useCallback((
    detectedTime: number,
    beats: BeatPoint[],
    startIndex: number = 0
  ): { beat: BeatPoint | null; index: number; deviation: number } => {
    if (beats.length === 0) {
      return { beat: null, index: -1, deviation: 0 };
    }

    let bestIndex = -1;
    let bestDeviation = Infinity;

    const searchStart = Math.max(0, startIndex - 5);
    const searchEnd = Math.min(beats.length, startIndex + 20);

    for (let i = searchStart; i < searchEnd; i++) {
      const beat = beats[i];
      const deviation = detectedTime - beat.time;
      const absDeviation = Math.abs(deviation);
      
      if (absDeviation < bestDeviation && absDeviation <= MAX_MATCH_WINDOW) {
        bestDeviation = absDeviation;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) {
      return { beat: null, index: -1, deviation: 0 };
    }

    return {
      beat: beats[bestIndex],
      index: bestIndex,
      deviation: detectedTime - beats[bestIndex].time,
    };
  }, []);

  const matchBeat = useCallback((
    detectedTime: number,
    strength: number,
    aria: Aria,
    currentPlayTime: number
  ): DetectionResult => {
    const state = stateRef.current;
    
    const startSearchIndex = Math.max(
      0,
      state.lastMatchedIndex,
      Math.floor(currentPlayTime / (60000 / 180)) - 5
    );
    
    const { beat, index, deviation } = findNearestBeat(detectedTime, aria.beats, startSearchIndex);
    
    if (!beat) {
      return {
        detectedTime,
        expectedBeat: null,
        deviation: 0,
        isAccurate: false,
        accuracy: 'missed',
      };
    }

    if (state.matchedBeats.has(index)) {
      return {
        detectedTime,
        expectedBeat: beat,
        deviation,
        isAccurate: false,
        accuracy: 'missed',
        direction: deviation > 0 ? 'late' : 'early',
      };
    }

    const absDeviation = Math.abs(deviation);
    let accuracy: DetectionResult['accuracy'];
    let isAccurate: boolean;

    if (absDeviation <= PERFECT_THRESHOLD) {
      accuracy = 'perfect';
      isAccurate = true;
    } else if (absDeviation <= GOOD_THRESHOLD) {
      accuracy = 'good';
      isAccurate = true;
    } else if (absDeviation <= POOR_THRESHOLD) {
      accuracy = 'poor';
      isAccurate = false;
    } else {
      accuracy = 'missed';
      isAccurate = false;
    }

    state.matchedBeats.add(index);
    if (index > state.lastMatchedIndex) {
      state.lastMatchedIndex = index;
    }

    return {
      detectedTime,
      expectedBeat: beat,
      deviation,
      isAccurate,
      accuracy,
      direction: deviation > 0 ? 'late' : deviation < 0 ? 'early' : undefined,
    };
  }, [findNearestBeat]);

  const checkMissedBeats = useCallback((
    aria: Aria,
    currentPlayTime: number
  ): DetectionResult[] => {
    const state = stateRef.current;
    const missedResults: DetectionResult[] = [];
    
    const missedThreshold = MAX_MATCH_WINDOW;
    
    for (let i = 0; i < aria.beats.length; i++) {
      const beat = aria.beats[i];
      if (
        !state.matchedBeats.has(i) &&
        currentPlayTime > beat.time + missedThreshold &&
        beat.time >= 0
      ) {
        state.matchedBeats.add(i);
        if (i > state.lastMatchedIndex) {
          state.lastMatchedIndex = i;
        }
        
        missedResults.push({
          detectedTime: beat.time + missedThreshold,
          expectedBeat: beat,
          deviation: missedThreshold,
          isAccurate: false,
          accuracy: 'missed',
        });
      }
    }
    
    return missedResults;
  }, []);

  return {
    matchBeat,
    checkMissedBeats,
    reset,
  };
}

export function getAccuracyColor(accuracy: DetectionResult['accuracy']): string {
  switch (accuracy) {
    case 'perfect':
      return '#22c55e';
    case 'good':
      return '#eab308';
    case 'poor':
      return '#f97316';
    case 'missed':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

export function getAccuracyLabel(accuracy: DetectionResult['accuracy']): string {
  switch (accuracy) {
    case 'perfect':
      return '完美';
    case 'good':
      return '良好';
    case 'poor':
      return '偏差';
    case 'missed':
      return '漏拍';
    default:
      return '未知';
  }
}

export function formatDeviation(deviation: number): string {
  const sign = deviation > 0 ? '+' : deviation < 0 ? '-' : '';
  return `${sign}${Math.abs(deviation).toFixed(0)}ms`;
}
