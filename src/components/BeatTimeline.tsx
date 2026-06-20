import React, { useMemo, useRef, useEffect } from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import type { BeatPoint, DetectionResult } from '@/types';
import { useTrainingStore } from '@/store/trainingStore';
import { getAccuracyColor, formatDeviation, PERFECT_THRESHOLD, GOOD_THRESHOLD, POOR_THRESHOLD } from '@/hooks/useBeatMatcher';

interface BeatTimelineProps {
  width?: number;
  height?: number;
}

const VISIBLE_WINDOW_MS = 8000;
const BEAT_RADIUS_BAN = 14;
const BEAT_RADIUS_YAN = 10;

export const BeatTimeline: React.FC<BeatTimelineProps> = ({
  width = 900,
  height = 220,
}) => {
  const {
    selectedAria,
    currentTime,
    windowStart,
    detectionResults,
    lastDetectedBeat,
  } = useTrainingStore();

  const containerRef = useRef<HTMLDivElement>(null);

  const timeToX = (time: number): number => {
    const relativeTime = time - windowStart;
    return (relativeTime / VISIBLE_WINDOW_MS) * width;
  };

  const visibleBeats = selectedAria?.beats.filter(b => 
    b.time >= windowStart - 1000 && b.time <= windowStart + VISIBLE_WINDOW_MS + 1000
  ) || [];

  const recentResults = useMemo(() => {
    return detectionResults.filter(r => 
      r.detectedTime >= windowStart - 500 && r.detectedTime <= windowStart + VISIBLE_WINDOW_MS + 500
    );
  }, [detectionResults, windowStart]);

  const beatResultMap = useMemo(() => {
    const map = new Map<number, DetectionResult>();
    detectionResults.forEach(r => {
      if (r.expectedBeat) {
        map.set(r.expectedBeat.index, r);
      }
    });
    return map;
  }, [detectionResults]);

  const currentLineX = timeToX(currentTime);

  const renderBeatPoint = (beat: BeatPoint) => {
    const x = timeToX(beat.time);
    const isPast = beat.time <= currentTime + 10;
    const result = beatResultMap.get(beat.index);
    const isCurrentBeat = beat.index === useTrainingStore.getState().currentBeatIndex;
    const distanceToCurrent = Math.abs(beat.time - currentTime);
    const isNearCurrent = distanceToCurrent < 200;

    const baseY = height / 2;
    const beatRadius = beat.type === 'ban' ? BEAT_RADIUS_BAN : BEAT_RADIUS_YAN;
    const pulseScale = isNearCurrent && !result ? 1 + Math.max(0, 1 - distanceToCurrent / 200) * 0.4 : 1;
    const scale = isCurrentBeat && !result ? pulseScale : 1;

    const beatColor = beat.type === 'ban' ? '#dc2626' : '#3b82f6';
    const beatLabel = beat.type === 'ban' ? '板' : '眼';

    const getResultIcon = () => {
      if (!result) return null;

      const iconColor = getAccuracyColor(result.accuracy);
      const iconY = baseY - beatRadius - 24;

      if (result.accuracy === 'perfect' || result.accuracy === 'good') {
        return (
          <g transform={`translate(${x - 8}, ${iconY - 8})`}>
            <circle
              cx="8"
              cy="8"
              r="10"
              fill="#fff"
              stroke={iconColor}
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            />
            <Check
              x="2"
              y="2"
              width="12"
              height="12"
              stroke={iconColor}
              strokeWidth="3"
              fill="none"
            />
          </g>
        );
      } else if (result.accuracy === 'poor') {
        return (
          <g transform={`translate(${x - 8}, ${iconY - 8})`}>
            <circle
              cx="8"
              cy="8"
              r="10"
              fill="#fff"
              stroke={iconColor}
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            />
            <X
              x="2"
              y="2"
              width="12"
              height="12"
              stroke={iconColor}
              strokeWidth="3"
              fill="none"
            />
          </g>
        );
      } else {
        return (
          <g transform={`translate(${x - 8}, ${iconY - 8})`}>
            <circle
              cx="8"
              cy="8"
              r="10"
              fill="#fff"
              stroke={iconColor}
              strokeWidth="2"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            />
            <X
              x="2"
              y="2"
              width="12"
              height="12"
              stroke={iconColor}
              strokeWidth="3"
              fill="none"
            />
          </g>
        );
      }
    };

    const getDeviationLabel = () => {
      if (!result || result.accuracy === 'missed') return null;

      const absDev = Math.abs(result.deviation);
      let color = getAccuracyColor(result.accuracy);
      const text = formatDeviation(result.deviation);
      const labelY = baseY + beatRadius + 20;

      return (
        <text
          x={x}
          y={labelY}
          textAnchor="middle"
          fill={color}
          fontSize="11"
          fontWeight="600"
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          }}
        >
          {text}
        </text>
      );
    };

    const getActualPositionIndicator = () => {
      if (!result || !result.expectedBeat || result.accuracy === 'missed') return null;

      const actualX = timeToX(result.detectedTime);
      const absDev = Math.abs(result.deviation);
      const color = getAccuracyColor(result.accuracy);

      return (
        <>
          <line
            x1={x}
            y1={baseY + beatRadius + 4}
            x2={actualX}
            y2={baseY + beatRadius + 4}
            stroke={color}
            strokeWidth="2"
            strokeDasharray={absDev > GOOD_THRESHOLD ? "4,2" : "0"}
            opacity="0.7"
          />
          <circle
            cx={actualX}
            cy={baseY + beatRadius + 4}
            r="4"
            fill={color}
            style={{
              filter: 'drop-shadow(0 0 6px ' + color + ')',
            }}
          />
          {result.direction && (
            <g transform={`translate(${actualX + (result.direction === 'late' ? 6 : -18)}, ${baseY + beatRadius - 2})`}>
              <ArrowRight
                width="12"
                height="12"
                stroke={color}
                strokeWidth="2"
                fill="none"
                style={{
                  transform: result.direction === 'early' ? 'rotate(180deg)' : 'none',
                  transformOrigin: '6px 6px',
                }}
              />
            </g>
          )}
        </>
      );
    };

    return (
      <g key={beat.index}>
        {getResultIcon()}
        
        <circle
          cx={x}
          cy={baseY}
          r={beatRadius * scale}
          fill={beatColor}
          stroke={result ? getAccuracyColor(result.accuracy) : '#fff'}
          strokeWidth={result ? '3' : isPast ? '2' : '2'}
          opacity={isPast ? (result ? 1 : 0.4) : 1}
          style={{
            filter: isNearCurrent && !result 
              ? `drop-shadow(0 0 ${12 * pulseScale}px ${beatColor})`
              : result
                ? `drop-shadow(0 0 8px ${getAccuracyColor(result.accuracy)})`
                : 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            transition: 'all 100ms ease-out',
          }}
        />
        
        <text
          x={x}
          y={baseY + 4}
          textAnchor="middle"
          fill="#fff"
          fontSize={beat.type === 'ban' ? '10' : '9'}
          fontWeight="700"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {beatLabel}
        </text>

        {getActualPositionIndicator()}
        {getDeviationLabel()}
      </g>
    );
  };

  const renderThresholdMarkers = () => {
    const markers = [];
    const y1 = height / 2 + BEAT_RADIUS_BAN + 35;
    const y2 = height / 2 + BEAT_RADIUS_BAN + 45;

    const thresholdLines = [
      { label: '完美', value: PERFECT_THRESHOLD, color: '#22c55e' },
      { label: '良好', value: GOOD_THRESHOLD, color: '#eab308' },
      { label: '偏差', value: POOR_THRESHOLD, color: '#ef4444' },
    ];

    thresholdLines.forEach(({ label, value, color }) => {
      const xLeft = timeToX(currentTime - value);
      const xRight = timeToX(currentTime + value);

      if (xLeft > 0) {
        markers.push(
          <line
            key={`left-${value}`}
            x1={xLeft}
            y1={y1}
            x2={xLeft}
            y2={y2}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.5"
          />
        );
      }
      if (xRight < width) {
        markers.push(
          <line
            key={`right-${value}`}
            x1={xRight}
            y1={y1}
            x2={xRight}
            y2={y2}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.5"
          />
        );
      }
    });

    return markers;
  };

  const renderTimeMarkers = () => {
    const markers = [];
    const interval = 1000;
    const startSec = Math.floor(windowStart / interval) * interval;
    const endSec = windowStart + VISIBLE_WINDOW_MS + interval;

    for (let t = startSec; t < endSec; t += interval) {
      const x = timeToX(t);
      const sec = Math.floor(t / 1000);
      const isMajor = sec % 5 === 0;
      const heightLine = isMajor ? 12 : 6;

      markers.push(
        <g key={`time-${t}`}>
          <line
            x1={x}
            y1={height - 10}
            x2={x}
            y2={height - 10 - heightLine}
            stroke="#6b7280"
            strokeWidth="1"
            opacity="0.4"
          />
          {isMajor && (
            <text
              x={x}
              y={height - 1}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="10"
            >
              {sec}s
            </text>
          )}
        </g>
      );
    }

    return markers;
  };

  if (!selectedAria) {
    return (
      <div
        ref={containerRef}
        className="relative bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl flex items-center justify-center"
        style={{ width, height }}
      >
        <p className="text-slate-400 text-lg">请选择一个唱段开始练习</p>
      </div>
    );
  }

  const progress = (currentTime / selectedAria.totalDuration) * 100;

  return (
    <div
      ref={containerRef}
      className="relative bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
      style={{ width, height }}
    >
      <div className="absolute top-3 left-4 flex items-center gap-4">
        <span className="text-slate-400 text-xs">
          {(currentTime / 1000).toFixed(1)}s / {(selectedAria.totalDuration / 1000).toFixed(1)}s
        </span>
        <div className="flex-1 max-w-32 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-100"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      <div className="absolute top-3 right-4 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-600" />
          <span className="text-slate-400 text-xs">板</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-slate-400 text-xs">眼</span>
        </div>
      </div>

      <svg width={width} height={height} className="absolute inset-0">
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#475569"
          strokeWidth="1"
          opacity="0.5"
        />

        {renderTimeMarkers()}

        {renderThresholdMarkers()}

        {visibleBeats.map(renderBeatPoint)}

        <line
          x1={currentLineX}
          y1="20"
          x2={currentLineX}
          y2={height - 20}
          stroke="#f59e0b"
          strokeWidth="2"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.8)',
          }}
        />
        <polygon
          points={`${currentLineX},12 ${currentLineX - 6},22 ${currentLineX + 6},22`}
          fill="#f59e0b"
          style={{
            filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.8)',
          }}
        />

        {lastDetectedBeat && (
          <circle
            cx={timeToX(lastDetectedBeat)}
            cy={height / 2}
            r="20"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            opacity="0.6"
            style={{
              animation: 'pulse-ring 0.6s ease-out forwards',
            }}
          />
        )}
      </svg>

      <style>{`
        @keyframes pulse-ring {
          0% {
            r: 10;
            opacity: 0.8;
          }
          100% {
            r: 30;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
