import { useRef, useCallback, useEffect } from 'react';
import type { Aria, BeatPoint } from '@/types';
import { BAN_STYLES } from '@/data/arias';

interface BeatPlayerOptions {
  onBeat?: (beat: BeatPoint, time: number) => void;
  onProgress?: (currentTime: number) => void;
  onComplete?: () => void;
  enableMetronome?: boolean;
}

export function useBeatPlayer(options: BeatPlayerOptions = {}) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isPlayingRef = useRef(false);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const scheduledBeatsRef = useRef<Map<number, OscillatorNode>>(new Map());
  const nextBeatIndexRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const ariaRef = useRef<Aria | null>(null);
  const enableMetronomeRef = useRef(options.enableMetronome ?? true);

  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const playClickSound = useCallback((time: number, isBan: boolean) => {
    if (!audioContextRef.current || !enableMetronomeRef.current) return;
    
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.value = isBan ? 880 : 660;
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(isBan ? 0.4 : 0.25, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (isBan ? 0.08 : 0.05));
    
    osc.start(time);
    osc.stop(time + 0.1);
  }, []);

  const scheduleBeats = useCallback((currentAudioTime: number, currentPlayTime: number) => {
    if (!ariaRef.current || !audioContextRef.current) return;
    
    const aria = ariaRef.current;
    const lookahead = 0.1;
    const lookaheadMs = lookahead * 1000;
    
    while (
      nextBeatIndexRef.current < aria.beats.length &&
      aria.beats[nextBeatIndexRef.current].time <= currentPlayTime + lookaheadMs
    ) {
      const beat = aria.beats[nextBeatIndexRef.current];
      
      if (beat.time >= currentPlayTime - 50) {
        const audioPlayTime = currentAudioTime - startTimeRef.current * 0.001;
        const delayMs = beat.time - currentPlayTime;
        const scheduleTime = currentAudioTime + delayMs * 0.001;
        
        if (scheduleTime >= currentAudioTime - 0.01 && !scheduledBeatsRef.current.has(beat.index)) {
          playClickSound(scheduleTime, beat.type === 'ban');
          scheduledBeatsRef.current.set(beat.index, null as any);
          
          const actualDelay = scheduleTime - currentAudioTime;
          setTimeout(() => {
            if (options.onBeat && isPlayingRef.current) {
              options.onBeat(beat, beat.time);
            }
          }, actualDelay * 1000);
        }
      }
      
      nextBeatIndexRef.current++;
    }
  }, [playClickSound, options.onBeat]);

  const updateProgress = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const currentAudioTime = ctx.currentTime;
    const currentPlayTime = (currentAudioTime - startTimeRef.current * 0.001) * 1000;
    
    scheduleBeats(currentAudioTime, currentPlayTime);
    
    if (options.onProgress) {
      options.onProgress(Math.max(0, currentPlayTime));
    }
    
    if (ariaRef.current && currentPlayTime >= ariaRef.current.totalDuration + 500) {
      stop();
      if (options.onComplete) {
        options.onComplete();
      }
      return;
    }
    
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [scheduleBeats, options.onProgress, options.onComplete]);

  const start = useCallback(async (aria: Aria, startTime: number = 0) => {
    await initAudioContext();
    
    ariaRef.current = aria;
    pauseTimeRef.current = startTime;
    
    if (audioContextRef.current) {
      const ctxStartTime = audioContextRef.current.currentTime + 0.05;
      startTimeRef.current = (ctxStartTime - startTime * 0.001) * 1000;
      
      nextBeatIndexRef.current = 0;
      while (
        nextBeatIndexRef.current < aria.beats.length &&
        aria.beats[nextBeatIndexRef.current].time < startTime
      ) {
        nextBeatIndexRef.current++;
      }
      
      scheduledBeatsRef.current.clear();
      isPlayingRef.current = true;
      
      updateProgress();
    }
  }, [initAudioContext, updateProgress]);

  const pause = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current) return;
    
    isPlayingRef.current = false;
    const ctx = audioContextRef.current;
    pauseTimeRef.current = (ctx.currentTime - startTimeRef.current * 0.001) * 1000;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const resume = useCallback(async () => {
    if (isPlayingRef.current || !ariaRef.current || !audioContextRef.current) return;
    
    await initAudioContext();
    
    const ctx = audioContextRef.current;
    const ctxStartTime = ctx.currentTime + 0.05;
    startTimeRef.current = (ctxStartTime - pauseTimeRef.current * 0.001) * 1000;
    
    isPlayingRef.current = true;
    updateProgress();
  }, [initAudioContext, updateProgress]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    pauseTimeRef.current = 0;
    nextBeatIndexRef.current = 0;
    scheduledBeatsRef.current.clear();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const setMetronomeEnabled = useCallback((enabled: boolean) => {
    enableMetronomeRef.current = enabled;
  }, []);

  const getCurrentTime = useCallback((): number => {
    if (!isPlayingRef.current || !audioContextRef.current) {
      return pauseTimeRef.current;
    }
    const ctx = audioContextRef.current;
    return (ctx.currentTime - startTimeRef.current * 0.001) * 1000;
  }, []);

  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stop]);

  return {
    start,
    pause,
    resume,
    stop,
    isPlaying: () => isPlayingRef.current,
    getCurrentTime,
    setMetronomeEnabled,
  };
}
