import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useTrainingStore } from '@/store/trainingStore';
import { BAN_STYLES } from '@/data/arias';

export const TransitionWarning: React.FC = () => {
  const { upcomingTransition, currentTime } = useTrainingStore();

  const warning = useMemo(() => {
    if (!upcomingTransition) return null;

    const timeToTransition = upcomingTransition.time - currentTime;
    if (timeToTransition <= 0 || timeToTransition > 3000) return null;

    const fromStyle = BAN_STYLES[upcomingTransition.fromStyle];
    const toStyle = BAN_STYLES[upcomingTransition.toStyle];
    const progress = 1 - (timeToTransition / 3000);

    return {
      fromName: fromStyle.name,
      toName: toStyle.name,
      fromCategory: fromStyle.categoryName,
      toCategory: toStyle.categoryName,
      seconds: (timeToTransition / 1000).toFixed(1),
      progress: Math.min(1, Math.max(0, progress)),
      isUrgent: timeToTransition < 1500,
    };
  }, [upcomingTransition, currentTime]);

  if (!warning) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-pulse">
      <div
        className={`px-6 py-4 rounded-2xl border-2 shadow-2xl backdrop-blur-md ${
          warning.isUrgent
            ? 'bg-gradient-to-r from-red-900/80 to-orange-900/80 border-red-500 shadow-red-500/30'
            : 'bg-gradient-to-r from-amber-900/80 to-rose-900/80 border-amber-500 shadow-amber-500/30'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${
              warning.isUrgent ? 'bg-red-500/30 animate-bounce' : 'bg-amber-500/30'
            }`}
          >
            <AlertTriangle
              size={24}
              className={warning.isUrgent ? 'text-red-400' : 'text-amber-400'}
            />
          </div>

          <div>
            <div className="text-white font-bold text-lg flex items-center gap-2">
              <span>即将转入</span>
              <span
                className={`px-2 py-0.5 rounded-lg ${
                  warning.toCategory === '西皮'
                    ? 'bg-rose-500/30 text-rose-200'
                    : warning.toCategory === '二黄'
                    ? 'bg-amber-500/30 text-amber-200'
                    : 'bg-blue-500/30 text-blue-200'
                }`}
              >
                {warning.toName}
              </span>
              <span>板式</span>
            </div>
            <div className="text-white/80 text-sm mt-1 flex items-center gap-2">
              <span className="text-white/60">注意节奏变化</span>
              <ArrowRight size={14} className="text-white/60" />
              <span className="text-amber-300 font-mono text-sm">
                {warning.seconds}s
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              warning.isUrgent
                ? 'bg-gradient-to-r from-red-500 to-orange-400'
                : 'bg-gradient-to-r from-amber-500 to-rose-400'
            }`}
            style={{ width: `${warning.progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
