import { useState, useRef, useCallback, useEffect } from 'react';
import { OnsetDetector, OnsetEvent } from '@/audio/OnsetDetector';

interface UseMicrophoneOptions {
  onOnset?: (onset: OnsetEvent) => void;
  sensitivity?: number;
}

export function useMicrophone(options: UseMicrophoneOptions = {}) {
  const [isActive, setIsActive] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  
  const detectorRef = useRef<OnsetDetector | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1,
        },
      });
      
      streamRef.current = stream;
      setIsPermissionGranted(true);
      setError(null);
      return true;
    } catch (err) {
      setError('无法访问麦克风，请检查权限设置');
      setIsPermissionGranted(false);
      return false;
    }
  }, []);

  const start = useCallback(async (sensitivity: number = 0.6): Promise<boolean> => {
    if (!streamRef.current) {
      const granted = await requestPermission();
      if (!granted) return false;
    }
    
    if (!streamRef.current) return false;
    
    try {
      const detector = new OnsetDetector({ sensitivity });
      await detector.init(streamRef.current);
      
      if (options.onOnset) {
        detector.setCallback(options.onOnset);
      }
      
      detector.start();
      detectorRef.current = detector;
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      setIsActive(true);
      setError(null);
      
      const monitorVolume = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
        const avg = sum / dataArrayRef.current.length;
        setVolume(avg / 255);
        
        animationRef.current = requestAnimationFrame(monitorVolume);
      };
      monitorVolume();
      
      return true;
    } catch (err) {
      setError('启动麦克风失败');
      return false;
    }
  }, [requestPermission, options.onOnset]);

  const stop = useCallback(async (): Promise<void> => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (detectorRef.current) {
      await detectorRef.current.destroy();
      detectorRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
    
    setIsActive(false);
    setVolume(0);
  }, []);

  const setSensitivity = useCallback((sensitivity: number) => {
    if (detectorRef.current) {
      detectorRef.current.setSensitivity(sensitivity);
    }
  }, []);

  const getCurrentTime = useCallback((): number => {
    if (detectorRef.current) {
      return detectorRef.current.getCurrentTime();
    }
    return 0;
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isActive,
    isPermissionGranted,
    error,
    volume,
    start,
    stop,
    requestPermission,
    setSensitivity,
    getCurrentTime,
  };
}
