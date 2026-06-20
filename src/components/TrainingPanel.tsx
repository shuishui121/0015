import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import {
  Play,
  Pause,
  Square,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Info,
  Music2,
  Clock,
  Target,
  Gauge,
  ChevronDown,
  Shuffle,
  Plus,
  Edit3,
} from 'lucide-react';
import { useTrainingStore } from '@/store/trainingStore';
import { BAN_STYLES, ARIAS, getStyleArias, ARIA_SEQUENCES, getAriaById } from '@/data/arias';
import { BeatTimeline } from '@/components/BeatTimeline';
import { AssessmentReport } from '@/components/AssessmentReport';
import { TransitionWarning } from '@/components/TransitionWarning';
import { SequenceEditor } from '@/components/SequenceEditor';
import { useMicrophone } from '@/hooks/useMicrophone';
import { useBeatPlayer } from '@/hooks/useBeatPlayer';
import { useBeatMatcher, PERFECT_THRESHOLD, GOOD_THRESHOLD, POOR_THRESHOLD } from '@/hooks/useBeatMatcher';
import type { BanStyle, DetectionResult, AriaSequence, BeatPoint, Aria } from '@/types';
import type { OnsetEvent } from '@/audio/OnsetDetector';

export const TrainingPanel: React.FC = () => {
  const {
    trainingState,
    selectedStyle,
    selectedAria,
    isSequenceMode,
    currentSequence,
    currentTime,
    detectionResults,
    sessionStats,
    microphoneActive,
    metronomeActive,
    sensitivity,
    setSelectedStyle,
    setSelectedAria,
    setTrainingState,
    addDetectionResult,
    setSessionStats,
    setMicrophoneActive,
    setMetronomeActive,
    setSensitivity,
    setLastDetectedBeat,
    resetSession,
    startTraining,
    pauseTraining,
    stopTraining,
    finishTraining,
    setCurrentTime,
    loadSequence,
    getActiveBeats,
    getActiveDuration,
    getActiveStyle,
    getSegmentAtTime,
  } = useTrainingStore();

  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showAriaDropdown, setShowAriaDropdown] = useState(false);
  const [showSequenceDropdown, setShowSequenceDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSequenceEditor, setShowSequenceEditor] = useState(false);
  const [practiceMode, setPracticeMode] = useState<'single' | 'sequence'>('single');
  const [customSequences, setCustomSequences] = useState<AriaSequence[]>([]);
  const [instantFeedback, setInstantFeedback] = useState<{
    show: boolean;
    type: 'perfect' | 'good' | 'poor' | 'missed';
    message: string;
  } | null>(null);

  const beatMatcherRef = useRef<ReturnType<typeof useBeatMatcher> | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const styleDropdownRef = useRef<HTMLDivElement>(null);
  const ariaDropdownRef = useRef<HTMLDivElement>(null);
  const sequenceDropdownRef = useRef<HTMLDivElement>(null);
  const settingsContainerRef = useRef<HTMLDivElement>(null);

  const { matchBeat, checkMissedBeats, reset: resetMatcher } = useBeatMatcher();
  beatMatcherRef.current = { matchBeat, checkMissedBeats, reset: resetMatcher };

  const allSequences = [...ARIA_SEQUENCES, ...customSequences];

  const handleOnset = useCallback((onset: OnsetEvent) => {
    const state = useTrainingStore.getState();
    const trainingState = state.trainingState;
    
    if (trainingState !== 'playing') return;

    const beats = state.getActiveBeats();
    if (beats.length === 0) return;

    const currentPlayTime = state.currentTime;
    const detectedTime = onset.time;

    const fakeAria: Aria = {
      id: 'virtual',
      title: state.getActiveTitle(),
      opera: '',
      role: '',
      style: state.getActiveStyle(),
      totalDuration: state.getActiveDuration(),
      beats: beats,
      sections: [],
      difficulty: 'basic',
    };
    
    const matched = beatMatcherRef.current?.matchBeat(
      detectedTime,
      onset.strength,
      fakeAria,
      currentPlayTime
    );

    if (matched) {
      useTrainingStore.getState().addDetectionResult(matched);
      useTrainingStore.getState().setLastDetectedBeat(detectedTime);
      showInstantFeedback(matched);
    }
  }, []);

  const microphone = useMicrophone({
    onOnset: handleOnset,
    sensitivity,
  });

  const beatPlayer = useBeatPlayer({
    onProgress: (time) => {
      setCurrentTime(time);
      
      const beats = useTrainingStore.getState().getActiveBeats();
      if (beats.length === 0) return;

      const fakeAria: Aria = {
        id: 'virtual',
        title: useTrainingStore.getState().getActiveTitle(),
        opera: '',
        role: '',
        style: useTrainingStore.getState().getActiveStyle(),
        totalDuration: useTrainingStore.getState().getActiveDuration(),
        beats: beats,
        sections: [],
        difficulty: 'basic',
      };

      if (beatMatcherRef.current) {
        const missed = beatMatcherRef.current.checkMissedBeats(fakeAria, time);
        missed.forEach(r => useTrainingStore.getState().addDetectionResult(r));
      }
    },
    onComplete: () => {
      handleFinish();
    },
    enableMetronome: metronomeActive,
  });

  const showInstantFeedback = (result: DetectionResult) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    let message = '';
    if (result.accuracy === 'perfect') {
      message = '完美！';
    } else if (result.accuracy === 'good') {
      message = `不错！${result.direction === 'early' ? '稍快' : result.direction === 'late' ? '稍慢' : ''}`;
    } else if (result.accuracy === 'poor') {
      message = `${result.direction === 'early' ? '偏快' : '偏慢'}了 ${Math.abs(result.deviation).toFixed(0)}ms`;
    } else {
      message = '漏拍';
    }

    setInstantFeedback({
      show: true,
      type: result.accuracy,
      message,
    });

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setInstantFeedback(null);
    }, 600);
  };

  const handleStyleSelect = (style: BanStyle) => {
    setSelectedStyle(style);
    setShowStyleDropdown(false);
    beatMatcherRef.current?.reset();
  };

  const handleAriaSelect = (ariaId: string) => {
    const aria = ARIAS.find(a => a.id === ariaId);
    if (aria) {
      setSelectedAria(aria);
      setShowAriaDropdown(false);
      beatMatcherRef.current?.reset();
    }
  };

  const handleSequenceSelect = (sequenceId: string) => {
    const sequence = allSequences.find(s => s.id === sequenceId);
    if (sequence) {
      loadSequence(sequence);
      setShowSequenceDropdown(false);
      beatMatcherRef.current?.reset();
    }
  };

  const handleSaveSequence = (sequence: AriaSequence) => {
    setCustomSequences(prev => {
      const existing = prev.findIndex(s => s.id === sequence.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = sequence;
        return updated;
      }
      return [...prev, sequence];
    });
    loadSequence(sequence);
    setShowSequenceEditor(false);
  };

  const handleStart = async () => {
    const beats = getActiveBeats();
    if (beats.length === 0) return;

    if (microphoneActive && !microphone.isActive) {
      const started = await microphone.start(sensitivity);
      if (!started) {
        return;
      }
    }

    beatMatcherRef.current?.reset();
    startTraining();

    const virtualAria: Aria = {
      id: 'virtual',
      title: useTrainingStore.getState().getActiveTitle(),
      opera: '',
      role: '',
      style: useTrainingStore.getState().getActiveStyle(),
      totalDuration: useTrainingStore.getState().getActiveDuration(),
      beats: beats,
      sections: [],
      difficulty: 'basic',
    };

    beatPlayer.setMetronomeEnabled(metronomeActive);
    beatPlayer.start(virtualAria, 0);
  };

  const handlePause = () => {
    pauseTraining();
    beatPlayer.pause();
  };

  const handleResume = () => {
    setTrainingState('playing');
    beatPlayer.resume();
  };

  const handleStop = () => {
    stopTraining();
    beatPlayer.stop();
    if (microphone.isActive) {
      microphone.stop();
    }
    beatMatcherRef.current?.reset();
  };

  const handleFinish = useCallback(() => {
    beatPlayer.stop();
    if (microphone.isActive) {
      microphone.stop();
    }
    finishTraining();
  }, [microphone, beatPlayer, finishTraining]);

  const toggleMicrophone = async () => {
    if (microphone.isActive) {
      await microphone.stop();
      setMicrophoneActive(false);
    } else {
      if (trainingState === 'idle' || trainingState === 'finished') {
        setMicrophoneActive(!microphoneActive);
      } else {
        const started = await microphone.start(sensitivity);
        if (started) {
          setMicrophoneActive(true);
        }
      }
    }
  };

  const toggleMetronome = () => {
    const newState = !metronomeActive;
    setMetronomeActive(newState);
    beatPlayer.setMetronomeEnabled(newState);
  };

  const handleSensitivityChange = (value: number) => {
    setSensitivity(value);
    microphone.setSensitivity(value);
  };

  const switchMode = (mode: 'single' | 'sequence') => {
    setPracticeMode(mode);
    if (mode === 'sequence') {
      if (!currentSequence && allSequences.length > 0) {
        loadSequence(allSequences[0]);
      }
    } else {
      loadSequence(null);
    }
    beatMatcherRef.current?.reset();
  };

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  const styleArias = getStyleArias(selectedStyle);
  const currentStyleInfo = BAN_STYLES[selectedStyle];

  const currentDisplayStyle = getActiveStyle();
  const currentDisplayStyleInfo = BAN_STYLES[currentDisplayStyle];

  const recentStats = {
    total: detectionResults.length,
    perfect: detectionResults.filter(r => r.accuracy === 'perfect').length,
    good: detectionResults.filter(r => r.accuracy === 'good').length,
    accuracy: detectionResults.length > 0
      ? ((detectionResults.filter(r => r.accuracy === 'perfect' || r.accuracy === 'good').length / detectionResults.length) * 100)
      : 0,
    avgDeviation: detectionResults.filter(r => r.expectedBeat).length > 0
      ? detectionResults.filter(r => r.expectedBeat).reduce((sum, r) => sum + Math.abs(r.deviation), 0) / detectionResults.filter(r => r.expectedBeat).length
      : 0,
  };

  const getFeedbackColor = (type: string) => {
    switch (type) {
      case 'perfect': return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 'good': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'poor': return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'missed': return 'text-red-400 bg-red-500/20 border-red-500/50';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (showStyleDropdown && styleDropdownRef.current && !styleDropdownRef.current.contains(target)) {
        setShowStyleDropdown(false);
      }
      if (showAriaDropdown && ariaDropdownRef.current && !ariaDropdownRef.current.contains(target)) {
        setShowAriaDropdown(false);
      }
      if (showSequenceDropdown && sequenceDropdownRef.current && !sequenceDropdownRef.current.contains(target)) {
        setShowSequenceDropdown(false);
      }
    };

    if (showStyleDropdown || showAriaDropdown || showSequenceDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStyleDropdown, showAriaDropdown, showSequenceDropdown]);

  const currentSegmentsInfo = isSequenceMode && currentSequence ? (
    <div className="space-y-2">
      {currentSequence.segments.map((seg, i) => {
        const aria = getAriaById(seg.ariaId);
        if (!aria) return null;
        const styleInfo = BAN_STYLES[aria.style];
        const { segmentIndex } = getSegmentAtTime(currentTime);
        const isActive = segmentIndex === i;
        return (
          <div
            key={seg.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isActive
                ? 'bg-violet-500/20 border border-violet-500/30'
                : 'bg-slate-700/30 border border-transparent'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
              isActive ? 'bg-violet-500 text-white' : 'bg-slate-600 text-slate-300'
            }`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  styleInfo.category === 'xipi' ? 'bg-rose-500' :
                  styleInfo.category === 'erhuang' ? 'bg-amber-500' : 'bg-blue-500'
                }`} />
                <span className={isActive ? 'text-violet-200' : 'text-white'}>{styleInfo.name}</span>
                <span className="text-xs text-slate-500">· {aria.title}</span>
              </div>
              {i < currentSequence.segments.length - 1 && (
                <div className="text-xs text-slate-500 mt-0.5">
                  过渡: {seg.transitionStyle === 'gradual' ? '渐变' : seg.transitionStyle === 'natural' ? '自然' : '突变'} · {(seg.transitionDuration / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-rose-500 rounded-2xl shadow-lg shadow-amber-500/20">
              <Music2 size={36} className="text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-black bg-gradient-to-r from-amber-200 via-rose-200 to-amber-200 bg-clip-text text-transparent">
                京剧板眼训练
              </h1>
              <p className="text-slate-400 text-sm mt-1">可视化节奏训练工具 · 西皮二黄板式练习</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="relative z-30 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex bg-slate-700/50 rounded-xl p-1">
                  <button
                    onClick={() => switchMode('single')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      practiceMode === 'single'
                        ? 'bg-amber-500 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    单板式练习
                  </button>
                  <button
                    onClick={() => switchMode('sequence')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      practiceMode === 'sequence'
                        ? 'bg-violet-500 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Shuffle size={14} />
                    板式序列练习
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {practiceMode === 'single' ? (
                  <>
                    <div className="relative" ref={styleDropdownRef}>
                      <button
                        onClick={() => {
                          setShowStyleDropdown(!showStyleDropdown);
                          setShowAriaDropdown(false);
                        }}
                        className="flex items-center gap-3 px-5 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl border border-slate-600 transition-all min-w-48"
                      >
                        <div className={`w-3 h-3 rounded-full ${
                          currentStyleInfo.category === 'xipi' ? 'bg-rose-500' :
                          currentStyleInfo.category === 'erhuang' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        <div className="text-left flex-1">
                          <div className="text-sm text-slate-400">{currentStyleInfo.categoryName}</div>
                          <div className="font-semibold">{currentStyleInfo.name}</div>
                        </div>
                        <ChevronDown size={18} className="text-slate-400" />
                      </button>

                      {showStyleDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 overflow-hidden">
                          {Object.entries(BAN_STYLES).map(([key, style]) => (
                            <button
                              key={key}
                              onClick={() => handleStyleSelect(key as BanStyle)}
                              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-all ${
                                selectedStyle === key ? 'bg-slate-700/70' : ''
                              }`}
                            >
                              <div className={`w-3 h-3 rounded-full ${
                                style.category === 'xipi' ? 'bg-rose-500' :
                                style.category === 'erhuang' ? 'bg-amber-500' : 'bg-blue-500'
                              }`} />
                              <div className="text-left flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{style.name}</span>
                                  <span className="text-xs text-slate-500">{style.categoryName}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {style.bpm} BPM · {style.beatsPerMeasure}拍
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="relative" ref={ariaDropdownRef}>
                      <button
                        onClick={() => {
                          setShowAriaDropdown(!showAriaDropdown);
                          setShowStyleDropdown(false);
                        }}
                        disabled={styleArias.length === 0}
                        className="flex items-center gap-3 px-5 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl border border-slate-600 transition-all min-w-80 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-left flex-1">
                          <div className="text-sm text-slate-400">唱段选择</div>
                          <div className="font-semibold truncate max-w-56">
                            {selectedAria?.title || '请选择唱段'}
                          </div>
                        </div>
                        <ChevronDown size={18} className="text-slate-400" />
                      </button>

                      {showAriaDropdown && styleArias.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-96 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto">
                          {styleArias.map((aria) => (
                            <button
                              key={aria.id}
                              onClick={() => handleAriaSelect(aria.id)}
                              className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-700 transition-all ${
                                selectedAria?.id === aria.id ? 'bg-slate-700/70' : ''
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                aria.difficulty === 'basic' ? 'bg-green-500/20 text-green-400' :
                                aria.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {aria.difficulty === 'basic' ? '初' :
                                 aria.difficulty === 'intermediate' ? '中' : '难'}
                              </div>
                              <div className="text-left flex-1 min-w-0">
                                <div className="font-medium truncate">{aria.title}</div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {aria.opera} · {aria.role} · {(aria.totalDuration / 1000).toFixed(0)}秒
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative" ref={sequenceDropdownRef}>
                      <button
                        onClick={() => {
                          setShowSequenceDropdown(!showSequenceDropdown);
                        }}
                        disabled={allSequences.length === 0}
                        className="flex items-center gap-3 px-5 py-3 bg-violet-500/10 hover:bg-violet-500/20 rounded-xl border border-violet-500/30 transition-all min-w-80 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Shuffle size={18} className="text-violet-400" />
                        <div className="text-left flex-1">
                          <div className="text-sm text-violet-400">板式序列</div>
                          <div className="font-semibold truncate max-w-56">
                            {currentSequence?.title || '请选择序列'}
                          </div>
                        </div>
                        <ChevronDown size={18} className="text-slate-400" />
                      </button>

                      {showSequenceDropdown && allSequences.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-[28rem] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto">
                          <div className="px-4 py-2 border-b border-slate-700 text-xs text-slate-400">
                            预设序列
                          </div>
                          {ARIA_SEQUENCES.map((seq) => (
                            <button
                              key={seq.id}
                              onClick={() => handleSequenceSelect(seq.id)}
                              className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-700 transition-all text-left ${
                                currentSequence?.id === seq.id ? 'bg-slate-700/70' : ''
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                seq.difficulty === 'basic' ? 'bg-green-500/20 text-green-400' :
                                seq.difficulty === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {seq.difficulty === 'basic' ? '初' :
                                 seq.difficulty === 'intermediate' ? '中' : '难'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{seq.title}</div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {seq.segments.length} 段 · {seq.segments.length - 1} 次过渡
                                </div>
                                {seq.description && (
                                  <div className="text-xs text-slate-500 mt-1 truncate">{seq.description}</div>
                                )}
                              </div>
                            </button>
                          ))}
                          {customSequences.length > 0 && (
                            <div className="px-4 py-2 border-t border-slate-700 border-b border-slate-700 text-xs text-slate-400">
                              自定义序列
                            </div>
                          )}
                          {customSequences.map((seq) => (
                            <button
                              key={seq.id}
                              onClick={() => handleSequenceSelect(seq.id)}
                              className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-slate-700 transition-all text-left ${
                                currentSequence?.id === seq.id ? 'bg-slate-700/70' : ''
                              }`}
                            >
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-500/20 text-violet-400">
                                <Edit3 size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{seq.title}</div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {seq.segments.length} 段 · {seq.segments.length - 1} 次过渡 · 自定义
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowSequenceEditor(true)}
                      className="flex items-center gap-2 px-5 py-3 bg-slate-700/50 hover:bg-slate-700 rounded-xl border border-slate-600 transition-all"
                    >
                      <Plus size={18} />
                      {currentSequence ? '编辑序列' : '创建序列'}
                    </button>
                  </>
                )}

                <div className="flex-1" />

                <button
                  onClick={() => {
                    setShowSettings(!showSettings);
                    setShowStyleDropdown(false);
                    setShowAriaDropdown(false);
                    setShowSequenceDropdown(false);
                  }}
                  className={`p-3 rounded-xl border transition-all ${
                    showSettings
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Settings size={20} />
                </button>
              </div>

              {showSettings && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">检测灵敏度</label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">低</span>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={sensitivity}
                          onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <span className="text-xs text-slate-500">高</span>
                        <span className="text-sm font-mono w-12 text-right">{(sensitivity * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleMetronome}
                        className={`p-3 rounded-xl border transition-all ${
                          metronomeActive
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {metronomeActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
                      </button>
                      <div>
                        <div className="text-sm font-medium">节拍器</div>
                        <div className="text-xs text-slate-400">{metronomeActive ? '已开启' : '已关闭'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleMicrophone}
                        className={`p-3 rounded-xl border transition-all ${
                          microphoneActive
                            ? 'bg-green-500/20 border-green-500/50 text-green-400'
                            : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {microphoneActive ? <Mic size={20} /> : <MicOff size={20} />}
                      </button>
                      <div>
                        <div className="text-sm font-medium">麦克风检测</div>
                        <div className="text-xs text-slate-400">
                          {microphone.isActive ? '已激活' : microphoneActive ? '待启动' : '已关闭'}
                        </div>
                      </div>
                      {microphone.isActive && (
                        <div className="ml-2 w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-75"
                            style={{ width: `${microphone.volume * 100}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-700/50">
                    <div className="flex items-start gap-3 text-sm text-slate-400">
                      <Info size={16} className="mt-0.5 flex-shrink-0 text-slate-500" />
                      <div>
                        <p>判定标准：≤{PERFECT_THRESHOLD}ms 完美（绿勾），≤{GOOD_THRESHOLD}ms 良好，≤{POOR_THRESHOLD}ms 偏差（黄叉），{'>'}{POOR_THRESHOLD}ms 漏拍（红叉）。</p>
                        <p className="mt-1">所有音频处理在本地完成，不会上传到服务器。</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative z-0">
              <BeatTimeline width={900} height={220} />

              {instantFeedback?.show && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className={`px-6 py-3 rounded-xl border backdrop-blur-sm text-2xl font-bold animate-bounce ${getFeedbackColor(instantFeedback.type)}`}>
                    {instantFeedback.message}
                  </div>
                </div>
              )}

              <TransitionWarning />
            </div>

            {isSequenceMode && currentSequence && currentSegmentsInfo && trainingState !== 'finished' && (
              <div className="relative z-0 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-violet-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shuffle size={18} className="text-violet-400" />
                    序列片段
                  </h3>
                  <span className="text-sm text-slate-400">{currentSequence.segments.length} 个片段</span>
                </div>
                {currentSegmentsInfo}
              </div>
            )}

            {!isSequenceMode && selectedAria && (
              <div className="relative z-0 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">段落信息</h3>
                  <span className="text-sm text-slate-400">{selectedAria.sections.length} 个段落</span>
                </div>
                <div className="space-y-2">
                  {selectedAria.sections.map((section, i) => {
                    const isActive = currentTime >= section.startTime && currentTime < section.endTime;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                          isActive
                            ? 'bg-amber-500/20 border border-amber-500/30'
                            : 'bg-slate-700/30 border border-transparent'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          isActive ? 'bg-amber-500 text-white' : 'bg-slate-600 text-slate-300'
                        }`}>
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{section.name}</div>
                          {section.lyrics && (
                            <div className={`text-sm mt-0.5 ${isActive ? 'text-amber-200' : 'text-slate-400'}`}>
                              {section.lyrics}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {(section.startTime / 1000).toFixed(1)} - {(section.endTime / 1000).toFixed(1)}s
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 relative z-10">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <div className="flex justify-center gap-4 mb-6">
                {trainingState === 'idle' || trainingState === 'finished' ? (
                  <button
                    onClick={handleStart}
                    disabled={isSequenceMode ? !currentSequence : !selectedAria}
                    className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105 disabled:hover:scale-100"
                  >
                    <Play size={24} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                    开始训练
                  </button>
                ) : trainingState === 'playing' ? (
                  <>
                    <button
                      onClick={handlePause}
                      className="flex items-center gap-2 px-6 py-4 bg-amber-500 hover:bg-amber-600 rounded-xl font-bold transition-all"
                    >
                      <Pause size={20} fill="currentColor" />
                      暂停
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-2 px-6 py-4 bg-red-500 hover:bg-red-600 rounded-xl font-bold transition-all"
                    >
                      <Square size={20} fill="currentColor" />
                      停止
                    </button>
                  </>
                ) : trainingState === 'paused' ? (
                  <>
                    <button
                      onClick={handleResume}
                      className="flex items-center gap-2 px-6 py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold transition-all"
                    >
                      <Play size={20} fill="currentColor" />
                      继续
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-2 px-6 py-4 bg-red-500 hover:bg-red-600 rounded-xl font-bold transition-all"
                    >
                      <Square size={20} fill="currentColor" />
                      停止
                    </button>
                  </>
                ) : null}
              </div>

              {trainingState !== 'idle' && (
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/50 rounded-full">
                    <span className={`w-2 h-2 rounded-full ${
                      trainingState === 'playing' ? 'bg-green-500 animate-pulse' :
                      trainingState === 'paused' ? 'bg-yellow-500' : 'bg-slate-500'
                    }`} />
                    <span className="text-sm text-slate-300">
                      {trainingState === 'playing' ? '训练中' :
                       trainingState === 'paused' ? '已暂停' :
                       trainingState === 'finished' ? '已完成' : '准备中'}
                    </span>
                  </div>
                </div>
              )}

              {(isSequenceMode ? currentSequence : selectedAria) && trainingState !== 'finished' && (
                <button
                  onClick={handleFinish}
                  disabled={trainingState === 'idle'}
                  className="w-full py-3 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm transition-all border border-slate-600"
                >
                  结束训练并查看报告
                </button>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Gauge size={20} className="text-amber-400" />
                实时统计
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Target size={16} className="text-emerald-400" />
                    准确率
                  </span>
                  <span className={`text-xl font-bold ${
                    recentStats.accuracy >= 75 ? 'text-green-400' :
                    recentStats.accuracy >= 50 ? 'text-yellow-400' :
                    recentStats.accuracy > 0 ? 'text-red-400' : 'text-slate-500'
                  }`}>
                    {recentStats.accuracy.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Clock size={16} className="text-blue-400" />
                    平均偏差
                  </span>
                  <span className={`text-xl font-bold ${
                    recentStats.avgDeviation <= 30 ? 'text-green-400' :
                    recentStats.avgDeviation <= 80 ? 'text-yellow-400' :
                    recentStats.avgDeviation > 0 ? 'text-red-400' : 'text-slate-500'
                  }`}>
                    {recentStats.avgDeviation > 0 ? `${recentStats.avgDeviation.toFixed(0)}ms` : '--'}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">检测点</span>
                    <span className="text-white font-medium">{recentStats.total}</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden flex">
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${recentStats.total > 0 ? (recentStats.perfect / recentStats.total) * 100 : 0}%` }}
                    />
                    <div
                      className="bg-yellow-500 h-full"
                      style={{ width: `${recentStats.total > 0 ? (recentStats.good / recentStats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>完美 {recentStats.perfect}</span>
                    <span>良好 {recentStats.good}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 rounded-2xl p-6 border border-amber-500/20">
              <h3 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
                <Info size={16} />
                {isSequenceMode ? '当前序列板式' : '板式说明'}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {currentDisplayStyleInfo.description}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-slate-500">速度</div>
                  <div className="text-white font-semibold">{currentDisplayStyleInfo.bpm} BPM</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3">
                  <div className="text-slate-500">每小节</div>
                  <div className="text-white font-semibold">{currentDisplayStyleInfo.beatsPerMeasure} 拍</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {sessionStats && <AssessmentReport />}
      {showSequenceEditor && (
        <SequenceEditor
          onSave={handleSaveSequence}
          onClose={() => setShowSequenceEditor(false)}
          initialSequence={currentSequence}
        />
      )}
    </div>
  );
};
