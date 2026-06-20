import React, { useState, useCallback } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowRight,
  Save,
  X,
  Clock,
  Music,
  ChevronDown,
  Gauge,
} from 'lucide-react';
import { ARIAS, BAN_STYLES, getAriaById } from '@/data/arias';
import type { AriaSequence, SequenceSegment, TransitionStyle, BanStyle } from '@/types';

interface SequenceEditorProps {
  onSave: (sequence: AriaSequence) => void;
  onClose: () => void;
  initialSequence?: AriaSequence | null;
}

interface EditorSegment {
  id: string;
  ariaId: string;
  startSec: number;
  endSec: number;
  transitionStyle: TransitionStyle;
  transitionDurationSec: number;
}

const TRANSITION_STYLES: { value: TransitionStyle; label: string; description: string }[] = [
  { value: 'gradual', label: '渐变', description: '节奏平滑过渡，使用缓动曲线' },
  { value: 'natural', label: '自然', description: '按线性节奏过渡' },
  { value: 'abrupt', label: '突变', description: '直接切换板式节奏' },
];

function createEditorSegment(ariaId: string): EditorSegment {
  const aria = getAriaById(ariaId);
  const durationSec = aria ? Math.min(20, Math.floor(aria.totalDuration / 1000)) : 15;
  return {
    id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ariaId,
    startSec: 0,
    endSec: durationSec,
    transitionStyle: 'gradual',
    transitionDurationSec: 2,
  };
}

export const SequenceEditor: React.FC<SequenceEditorProps> = ({
  onSave,
  onClose,
  initialSequence,
}) => {
  const [title, setTitle] = useState(initialSequence?.title || '自定义板式序列');
  const [description, setDescription] = useState(initialSequence?.description || '');
  const [difficulty, setDifficulty] = useState<AriaSequence['difficulty']>(
    initialSequence?.difficulty || 'intermediate'
  );
  const [segments, setSegments] = useState<EditorSegment[]>(() => {
    if (initialSequence) {
      return initialSequence.segments.map(s => ({
        id: s.id,
        ariaId: s.ariaId,
        startSec: s.startTime / 1000,
        endSec: s.endTime / 1000,
        transitionStyle: s.transitionStyle,
        transitionDurationSec: s.transitionDuration / 1000,
      }));
    }
    return [
      createEditorSegment('taiwaizhengzong-yuanban'),
      createEditorSegment('suolinang-manban'),
    ];
  });
  const [showAriaPicker, setShowAriaPicker] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    setSegments(prev => {
      const newSegments = [...prev];
      const [removed] = newSegments.splice(draggedIndex, 1);
      newSegments.splice(targetIndex, 0, removed);
      return newSegments;
    });
    setDraggedIndex(null);
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const addSegment = useCallback(() => {
    setSegments(prev => [...prev, createEditorSegment(ARIAS[0].id)]);
  }, []);

  const removeSegment = useCallback((index: number) => {
    setSegments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateSegment = useCallback((index: number, updates: Partial<EditorSegment>) => {
    setSegments(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  }, []);

  const handleSave = useCallback(() => {
    if (segments.length < 2) {
      alert('至少需要两个片段才能组成板式转换练习');
      return;
    }
    if (!title.trim()) {
      alert('请输入序列标题');
      return;
    }

    const sequence: AriaSequence = {
      id: initialSequence?.id || `custom-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      difficulty,
      createdAt: initialSequence?.createdAt || Date.now(),
      segments: segments.map(s => ({
        id: s.id,
        ariaId: s.ariaId,
        startTime: s.startSec * 1000,
        endTime: s.endSec * 1000,
        transitionStyle: s.transitionStyle,
        transitionDuration: s.transitionDurationSec * 1000,
      })),
    };

    onSave(sequence);
  }, [segments, title, description, difficulty, initialSequence, onSave]);

  const totalDuration = segments.reduce((sum, s, i) => {
    sum += (s.endSec - s.startSec);
    if (i < segments.length - 1) {
      sum += s.transitionDurationSec;
    }
    return sum;
  }, 0);

  const availableArias = ARIAS;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700 flex flex-col">
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {initialSequence ? '编辑板式序列' : '创建板式序列'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              拖拽调整片段顺序，设置过渡参数，创建个性化练习序列
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-2">序列标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                placeholder="例如：西皮流水转快板练习"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">难度等级</label>
              <div className="relative">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as AriaSequence['difficulty'])}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white appearance-none focus:outline-none focus:border-violet-500 transition-colors pr-10"
                >
                  <option value="basic">基础</option>
                  <option value="intermediate">中级</option>
                  <option value="advanced">高级</option>
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">描述说明（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
              placeholder="描述这个练习序列的目标和特点..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Music size={18} className="text-violet-400" />
                板式片段
                <span className="text-sm font-normal text-slate-400">
                  ({segments.length} 段 · 总时长约 {totalDuration.toFixed(0)} 秒)
                </span>
              </h3>
              <button
                onClick={addSegment}
                className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 rounded-lg text-violet-300 transition-colors"
              >
                <Plus size={16} />
                添加片段
              </button>
            </div>

            <div className="space-y-3">
              {segments.map((segment, index) => {
                const aria = getAriaById(segment.ariaId);
                const styleInfo = aria ? BAN_STYLES[aria.style] : null;
                const isLast = index === segments.length - 1;

                return (
                  <div key={segment.id}>
                    <div
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={`bg-slate-800/50 border rounded-2xl p-4 transition-all ${
                        draggedIndex === index
                          ? 'opacity-50 border-violet-500 scale-95'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-2 pt-1">
                          <div
                            className="p-1.5 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing rounded hover:bg-slate-700/50"
                          >
                            <GripVertical size={18} />
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-300 font-bold text-sm">
                            {index + 1}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="relative">
                            <button
                              onClick={() => setShowAriaPicker(showAriaPicker === index ? null : index)}
                              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600 rounded-xl transition-colors"
                            >
                              {aria && styleInfo ? (
                                <>
                                  <div className={`w-3 h-3 rounded-full ${
                                    styleInfo.category === 'xipi' ? 'bg-rose-500' :
                                    styleInfo.category === 'erhuang' ? 'bg-amber-500' : 'bg-blue-500'
                                  }`} />
                                  <div className="text-left flex-1 min-w-0">
                                    <div className="font-medium text-white truncate">{aria.title}</div>
                                    <div className="text-xs text-slate-400">
                                      {styleInfo.categoryName} · {styleInfo.name} · {aria.opera} · {aria.role}
                                    </div>
                                  </div>
                                  <ChevronDown size={18} className="text-slate-400" />
                                </>
                              ) : (
                                <span className="text-slate-400">选择唱段...</span>
                              )}
                            </button>

                            {showAriaPicker === index && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-10 max-h-64 overflow-y-auto">
                                {availableArias.map(a => {
                                  const sInfo = BAN_STYLES[a.style];
                                  return (
                                    <button
                                      key={a.id}
                                      onClick={() => {
                                        updateSegment(index, {
                                          ariaId: a.id,
                                          startSec: 0,
                                          endSec: Math.min(20, Math.floor(a.totalDuration / 1000)),
                                        });
                                        setShowAriaPicker(null);
                                      }}
                                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left"
                                    >
                                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                        sInfo.category === 'xipi' ? 'bg-rose-500' :
                                        sInfo.category === 'erhuang' ? 'bg-amber-500' : 'bg-blue-500'
                                      }`} />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">{a.title}</div>
                                        <div className="text-xs text-slate-400">
                                          {sInfo.categoryName} · {sInfo.name} · {(a.totalDuration / 1000).toFixed(0)}秒
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                                <Clock size={12} />
                                起始时间 (秒)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={aria ? aria.totalDuration / 1000 : 0}
                                value={segment.startSec}
                                onChange={(e) => updateSegment(index, {
                                  startSec: Math.max(0, Math.min(segment.endSec - 1, parseInt(e.target.value) || 0))
                                })}
                                className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                                <Clock size={12} />
                                结束时间 (秒)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={aria ? aria.totalDuration / 1000 : 0}
                                value={segment.endSec}
                                onChange={(e) => updateSegment(index, {
                                  endSec: Math.max(segment.startSec + 1, Math.min(aria?.totalDuration / 1000 || 0, parseInt(e.target.value) || 0))
                                })}
                                className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">
                              片段时长: {(segment.endSec - segment.startSec).toFixed(0)} 秒
                            </span>
                            <button
                              onClick={() => removeSegment(index)}
                              disabled={segments.length <= 1}
                              className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isLast && (
                      <div className="mx-8 my-2 p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                          <ArrowRight size={14} className="text-violet-400" />
                          过渡设置
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                              <Gauge size={12} />
                              过渡方式
                            </label>
                            <div className="relative">
                              <select
                                value={segment.transitionStyle}
                                onChange={(e) => updateSegment(index, {
                                  transitionStyle: e.target.value as TransitionStyle
                                })}
                                className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600 rounded-lg text-white text-sm appearance-none focus:outline-none focus:border-violet-500 pr-8"
                              >
                                {TRANSITION_STYLES.map(ts => (
                                  <option key={ts.value} value={ts.value}>{ts.label}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
                              <Clock size={12} />
                              过渡时长 (秒)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              step={0.5}
                              value={segment.transitionDurationSec}
                              onChange={(e) => updateSegment(index, {
                                transitionDurationSec: Math.max(0, Math.min(10, parseFloat(e.target.value) || 0))
                              })}
                              className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                            />
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {TRANSITION_STYLES.find(ts => ts.value === segment.transitionStyle)?.description}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {segments.length < 2 && (
              <span className="text-amber-400">至少需要 2 个片段</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={segments.length < 2 || !title.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
            >
              <Save size={18} />
              保存序列
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
