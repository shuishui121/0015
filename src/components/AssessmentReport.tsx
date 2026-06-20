import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Clock, 
  Lightbulb,
  Music2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronRight,
  Shuffle,
  Gauge,
  ArrowRight
} from 'lucide-react';
import { useTrainingStore } from '@/store/trainingStore';
import { BAN_STYLES } from '@/data/arias';
import { getAccuracyColor, getAccuracyLabel, formatDeviation } from '@/hooks/useBeatMatcher';
import type { DetectionResult, SequenceSessionStats } from '@/types';

export const AssessmentReport: React.FC = () => {
  const { sessionStats, selectedAria, resetSession, isSequenceMode, currentSequence } = useTrainingStore();

  const isSequenceSession = isSequenceMode && 'transitions' in (sessionStats || {});
  const seqStats = isSequenceSession ? (sessionStats as SequenceSessionStats) : null;

  const stats = useMemo(() => {
    if (!sessionStats) return null;

    const results = sessionStats.results;
    const totalBeats = isSequenceMode 
      ? useTrainingStore.getState().sequenceBeats.length
      : selectedAria?.beats.length || 0;
    
    const perfectCount = results.filter(r => r.accuracy === 'perfect').length;
    const goodCount = results.filter(r => r.accuracy === 'good').length;
    const poorCount = results.filter(r => r.accuracy === 'poor').length;
    const missedCount = results.filter(r => r.accuracy === 'missed').length;
    
    const detectedCount = perfectCount + goodCount + poorCount;
    const overallAccuracy = results.length > 0 
      ? ((perfectCount + goodCount) / results.length) * 100 
      : 0;
    
    const lateCount = results.filter(r => r.direction === 'late').length;
    const earlyCount = results.filter(r => r.direction === 'early').length;
    
    const deviations = results
      .filter(r => r.expectedBeat)
      .map(r => Math.abs(r.deviation));
    const maxDeviation = deviations.length > 0 ? Math.max(...deviations) : 0;

    return {
      totalBeats,
      perfectCount,
      goodCount,
      poorCount,
      missedCount,
      detectedCount,
      overallAccuracy,
      lateCount,
      earlyCount,
      maxDeviation,
    };
  }, [sessionStats, selectedAria, isSequenceMode]);

  const accuracyTrend = useMemo(() => {
    if (!sessionStats) return [];
    
    const results = sessionStats.results;
    const windowSize = Math.max(5, Math.floor(results.length / 10));
    const trend: Array<{ x: number; accuracy: number }> = [];
    
    for (let i = 0; i < results.length; i += Math.max(1, windowSize / 2)) {
      const end = Math.min(i + windowSize, results.length);
      const window = results.slice(Math.floor(i), end);
      const acc = window.filter(r => r.accuracy === 'perfect' || r.accuracy === 'good').length / window.length;
      trend.push({ x: Math.floor(i), accuracy: acc * 100 });
    }
    
    return trend;
  }, [sessionStats]);

  const getGrade = (accuracy: number): { grade: string; color: string; message: string } => {
    if (accuracy >= 90) return { grade: 'A', color: '#22c55e', message: '节奏大师！表现非常出色！' };
    if (accuracy >= 75) return { grade: 'B', color: '#84cc16', message: '节奏把握良好，继续保持！' };
    if (accuracy >= 60) return { grade: 'C', color: '#eab308', message: '节奏基本准确，还有提升空间' };
    if (accuracy >= 45) return { grade: 'D', color: '#f97316', message: '节奏偏差较大，需要加强练习' };
    return { grade: 'F', color: '#ef4444', message: '节奏需要从头开始练习' };
  };

  if (!sessionStats || !stats) return null;

  const gradeInfo = getGrade(stats.overallAccuracy);
  const styleInfo = BAN_STYLES[sessionStats.style];

  const getResultIcon = (r: DetectionResult) => {
    if (r.accuracy === 'perfect' || r.accuracy === 'good') {
      return <CheckCircle2 size={14} className="text-green-500" />;
    } else if (r.accuracy === 'poor') {
      return <MinusCircle size={14} className="text-yellow-500" />;
    }
    return <XCircle size={14} className="text-red-500" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#22c55e';
    if (score >= 70) return '#84cc16';
    if (score >= 55) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-700">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${
                isSequenceMode
                  ? 'bg-gradient-to-br from-violet-500 to-indigo-500'
                  : 'bg-gradient-to-br from-amber-500 to-rose-500'
              }`}>
                {isSequenceMode ? <Shuffle size={32} className="text-white" /> : <Music2 size={32} className="text-white" />}
              </div>
              <div className="text-left">
                <h2 className="text-3xl font-bold text-white">{sessionStats.ariaTitle}</h2>
                <p className="text-slate-400">
                  {isSequenceMode && currentSequence 
                    ? `板式序列练习 · ${currentSequence.segments.length} 段 · ${seqStats?.transitions.length || 0} 次过渡`
                    : `${styleInfo.categoryName} · ${styleInfo.name}`
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/50 rounded-2xl p-5 text-center border border-slate-700">
              <div 
                className="text-5xl font-black mb-2"
                style={{ color: gradeInfo.color }}
              >
                {gradeInfo.grade}
              </div>
              <div className="text-slate-400 text-sm">综合评级</div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-5 text-center border border-slate-700">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="text-emerald-400" size={20} />
                <span className="text-3xl font-bold text-white">
                  {stats.overallAccuracy.toFixed(1)}%
                </span>
              </div>
              <div className="text-slate-400 text-sm">准确率</div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-5 text-center border border-slate-700">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="text-blue-400" size={20} />
                <span className="text-3xl font-bold text-white">
                  {sessionStats.averageDeviation.toFixed(0)}
                  <span className="text-lg text-slate-400">ms</span>
                </span>
              </div>
              <div className="text-slate-400 text-sm">平均偏差</div>
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-5 text-center border border-slate-700">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="text-amber-400" size={20} />
                <span className="text-3xl font-bold text-white">
                  {stats.maxDeviation.toFixed(0)}
                  <span className="text-lg text-slate-400">ms</span>
                </span>
              </div>
              <div className="text-slate-400 text-sm">最大偏差</div>
            </div>
          </div>

          {seqStats && seqStats.transitions.length > 0 && (
            <div className="bg-gradient-to-br from-violet-900/30 to-indigo-900/30 rounded-2xl p-6 mb-6 border border-violet-500/30">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shuffle size={20} className="text-violet-400" />
                板式过渡评估
                <span className="ml-auto text-sm font-normal text-violet-300">
                  平均分: 
                  <span className="font-bold ml-1" style={{ color: getScoreColor(seqStats.transitionAverageScore) }}>
                    {seqStats.transitionAverageScore.toFixed(1)}
                  </span>
                </span>
              </h3>

              <div className="space-y-4">
                {seqStats.transitions.map((trans, i) => {
                  const fromInfo = BAN_STYLES[trans.fromStyle];
                  const toInfo = BAN_STYLES[trans.toStyle];
                  
                  return (
                    <div
                      key={i}
                      className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-lg text-sm font-medium ${
                            fromInfo.category === 'xipi' ? 'bg-rose-500/20 text-rose-300' :
                            fromInfo.category === 'erhuang' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {fromInfo.name}
                          </span>
                          <ArrowRight size={16} className="text-slate-500" />
                          <span className={`px-2 py-1 rounded-lg text-sm font-medium ${
                            toInfo.category === 'xipi' ? 'bg-rose-500/20 text-rose-300' :
                            toInfo.category === 'erhuang' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {toInfo.name}
                          </span>
                        </div>
                        <div
                          className="text-2xl font-bold"
                          style={{ color: getScoreColor(trans.totalScore) }}
                        >
                          {trans.totalScore.toFixed(0)}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                            <Gauge size={12} />
                            过渡平滑度
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ 
                                  width: `${trans.smoothness * 100}%`,
                                  backgroundColor: getScoreColor(trans.smoothness * 100)
                                }}
                              />
                            </div>
                            <span
                              className="text-sm font-mono font-bold"
                              style={{ color: getScoreColor(trans.smoothness * 100) }}
                            >
                              {(trans.smoothness * 100).toFixed(0)}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                            <Target size={12} />
                            速度控制
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ 
                                  width: `${trans.speedControl * 100}%`,
                                  backgroundColor: getScoreColor(trans.speedControl * 100)
                                }}
                              />
                            </div>
                            <span
                              className="text-sm font-mono font-bold"
                              style={{ color: getScoreColor(trans.speedControl * 100) }}
                            >
                              {(trans.speedControl * 100).toFixed(0)}
                            </span>
                          </div>
                        </div>

                        <div className="bg-slate-900/50 rounded-lg p-3">
                          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                            <CheckCircle2 size={12} />
                            节拍准确性
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ 
                                  width: `${trans.beatAccuracy * 100}%`,
                                  backgroundColor: getScoreColor(trans.beatAccuracy * 100)
                                }}
                              />
                            </div>
                            <span
                              className="text-sm font-mono font-bold"
                              style={{ color: getScoreColor(trans.beatAccuracy * 100) }}
                            >
                              {(trans.beatAccuracy * 100).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                        <div>
                          速度变化率: <span className="text-slate-300 font-mono">{(trans.speedChangeRate * 100).toFixed(1)}%</span>
                        </div>
                        <div>
                          过渡前稳定度: <span className="text-slate-300 font-mono">{(trans.stabilityBefore * 100).toFixed(0)}%</span>
                        </div>
                        <div>
                          过渡后稳定度: <span className="text-slate-300 font-mono">{(trans.stabilityAfter * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-slate-800/30 rounded-2xl p-6 mb-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-400" />
              节拍统计
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{stats.perfectCount}</div>
                <div className="text-slate-400 text-sm">完美</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{stats.goodCount}</div>
                <div className="text-slate-400 text-sm">良好</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">{stats.poorCount}</div>
                <div className="text-slate-400 text-sm">偏差</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{stats.missedCount}</div>
                <div className="text-slate-400 text-sm">漏拍</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>进度分布</span>
                <span>共 {sessionStats.results.length} 个检测点</span>
              </div>
              <div className="flex h-6 rounded-full overflow-hidden bg-slate-700">
                {stats.perfectCount > 0 && (
                  <div 
                    className="bg-green-500 h-full flex items-center justify-center"
                    style={{ width: `${(stats.perfectCount / sessionStats.results.length) * 100}%` }}
                  />
                )}
                {stats.goodCount > 0 && (
                  <div 
                    className="bg-yellow-500 h-full flex items-center justify-center"
                    style={{ width: `${(stats.goodCount / sessionStats.results.length) * 100}%` }}
                  />
                )}
                {stats.poorCount > 0 && (
                  <div 
                    className="bg-orange-500 h-full flex items-center justify-center"
                    style={{ width: `${(stats.poorCount / sessionStats.results.length) * 100}%` }}
                  />
                )}
                {stats.missedCount > 0 && (
                  <div 
                    className="bg-red-500 h-full flex items-center justify-center"
                    style={{ width: `${(stats.missedCount / sessionStats.results.length) * 100}%` }}
                  />
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/20 rounded-lg">
                  <ChevronRight size={18} className="text-rose-400 rotate-180" />
                </div>
                <div>
                  <div className="text-white font-semibold">{stats.earlyCount}</div>
                  <div className="text-slate-400 text-sm">偏快</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <ChevronRight size={18} className="text-blue-400" />
                </div>
                <div>
                  <div className="text-white font-semibold">{stats.lateCount}</div>
                  <div className="text-slate-400 text-sm">偏慢</div>
                </div>
              </div>
            </div>
          </div>

          {accuracyTrend.length > 1 && (
            <div className="bg-slate-800/30 rounded-2xl p-6 mb-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-400" />
                准确率趋势
              </h3>
              <div className="h-24 flex items-end gap-1">
                {accuracyTrend.map((point, i) => (
                  <div 
                    key={i}
                    className="flex-1 rounded-t transition-all duration-300"
                    style={{ 
                      height: `${Math.max(10, point.accuracy)}%`,
                      background: point.accuracy >= 75 
                        ? 'linear-gradient(to top, #22c55e, #86efac)'
                        : point.accuracy >= 50
                          ? 'linear-gradient(to top, #eab308, #fde047)'
                          : 'linear-gradient(to top, #ef4444, #fca5a5)'
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>开始</span>
                <span>结束</span>
              </div>
            </div>
          )}

          {sessionStats.worstSections.length > 0 && (
            <div className="bg-slate-800/30 rounded-2xl p-6 mb-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-amber-400" />
                需要加强的段落
              </h3>
              <div className="space-y-3">
                {sessionStats.worstSections.map((section, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between bg-slate-700/30 rounded-xl p-4"
                  >
                    <div>
                      <div className="text-white font-medium">{section.name}</div>
                      {section.lyrics && (
                        <div className="text-slate-400 text-sm mt-1">{section.lyrics}</div>
                      )}
                    </div>
                    <div className="text-amber-400 font-mono text-sm">
                      {(section.startTime / 1000).toFixed(1)}s - {(section.endTime / 1000).toFixed(1)}s
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-r from-amber-500/10 to-rose-500/10 rounded-2xl p-6 mb-6 border border-amber-500/30">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Lightbulb size={20} className="text-amber-400" />
              练习建议
            </h3>
            <ul className="space-y-3">
              {sessionStats.suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-bold text-sm mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-slate-300 leading-relaxed">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {sessionStats.results.length > 0 && (
            <div className="bg-slate-800/30 rounded-2xl p-6 mb-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">详细记录</h3>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                {sessionStats.results.slice(-30).map((result, i) => (
                  <div 
                    key={i}
                    className="flex items-center justify-between bg-slate-700/20 rounded-lg px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      {getResultIcon(result)}
                      <span className="text-slate-400 text-sm font-mono">
                        {(result.detectedTime / 1000).toFixed(2)}s
                      </span>
                      {result.expectedBeat && (
                        <span className="text-slate-500 text-sm">
                          → 预期{(result.expectedBeat.time / 1000).toFixed(2)}s
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span 
                        className="text-sm font-medium"
                        style={{ color: getAccuracyColor(result.accuracy) }}
                      >
                        {getAccuracyLabel(result.accuracy)}
                      </span>
                      {result.expectedBeat && (
                        <span 
                          className="text-sm font-mono px-2 py-0.5 rounded"
                          style={{ 
                            color: getAccuracyColor(result.accuracy),
                            backgroundColor: `${getAccuracyColor(result.accuracy)}15`
                          }}
                        >
                          {formatDeviation(result.deviation)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center pt-4">
            <button
              onClick={resetSession}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold rounded-xl hover:from-amber-600 hover:to-rose-600 transition-all transform hover:scale-105 shadow-lg"
            >
              继续练习
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
