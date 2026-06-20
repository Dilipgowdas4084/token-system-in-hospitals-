/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, RefreshCw, Heart, Activity } from 'lucide-react';

interface AIPrediction {
  bestTime: string;
  suggestion: string;
  recommendations: string[];
  confidence: string;
  averageWait: number;
  totalPatients: number;
}

interface AIPredictorCardProps {
  prediction: AIPrediction | null;
  loading: boolean;
  onRefresh?: () => void;
}

export default function AIPredictorCard({ prediction, loading, onRefresh }: AIPredictorCardProps) {
  if (loading) {
    return (
      <div className="bg-[#F9F8F6] border border-[#E0DBCF] rounded-[32px] p-8 animate-pulse shadow-sm">
        <div className="h-4 bg-[#E0DBCF] rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-[#E0DBCF] rounded w-2/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-[#E0DBCF] rounded"></div>
          <div className="h-3 bg-[#E0DBCF] rounded w-5/6"></div>
          <div className="h-3 bg-[#E0DBCF] rounded w-4/5"></div>
        </div>
      </div>
    );
  }

  if (!prediction) return null;

  return (
    <div className="bg-[#F9F8F6] text-[#3D3D3D] rounded-[32px] p-8 shadow-sm border border-[#E0DBCF] overflow-hidden relative transition-all duration-300">
      {/* Visual Accent Ambient Beam */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-[#5A634D]/5 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />

      <div className="flex items-center justify-between mb-5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#E8EDE7] text-[#5A634D] border border-[#CBD2C6]">
          <Sparkles className="w-3.5 h-3.5" />
          AI Predictive Model Active
        </span>
        <button
          onClick={onRefresh}
          title="Recalculate AI Predictions"
          className="text-[#9A9A8A] hover:text-[#5A634D] hover:bg-[#F2F0EB] p-1.5 rounded-lg transition-all"
          id="btn-recalculate-ai"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] font-serif uppercase tracking-widest text-[#9A9A8A] font-bold mb-1">
        Recommended Check-In Window
      </p>
      
      <div className="flex items-baseline gap-3 mb-5">
        <h3 className="text-4xl font-serif font-bold tracking-tight text-[#D67D5B]">
          {prediction.bestTime}
        </h3>
        <span className="text-xs font-semibold text-[#9A9A8A]">
          (Optimal Visit Time)
        </span>
      </div>

      <div className="p-4 bg-white border border-[#E0DBCF] rounded-2xl mb-6 shadow-inner">
        <p className="text-xs font-sans text-[#3D3D3D] leading-relaxed italic">
          "{prediction.suggestion}"
        </p>
      </div>

      <div className="border-t border-[#CBD2C6]/50 pt-5">
        <h4 className="text-xs font-serif uppercase tracking-widest text-[#4A4A35] font-bold mb-4 flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-[#D67D5B]" />
          Waiting Wellness Advice
        </h4>
        <ul className="space-y-3">
          {prediction.recommendations.map((tip, idx) => (
            <li key={idx} className="flex gap-3 items-start text-xs text-[#3D3D3D] leading-relaxed">
              <span className="flex-shrink-0 w-5.5 h-5.5 rounded-lg bg-[#E8EDE7] text-[#5A634D] font-mono font-bold flex items-center justify-center text-[10px]">
                {idx + 1}
              </span>
              <span className="font-medium">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Metrics footer info */}
      <div className="mt-6 pt-5 border-t border-[#CBD2C6]/50 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[9px] font-serif uppercase tracking-wider text-[#9A9A8A] font-bold">Wait Factor</p>
          <p className="text-sm font-serif font-bold text-[#3D3D3D] mt-0.5">{prediction.averageWait}m avg</p>
        </div>
        <div>
          <p className="text-[9px] font-serif uppercase tracking-wider text-[#9A9A8A] font-bold">Confidence</p>
          <p className="text-sm font-serif font-bold text-[#5A634D] mt-0.5">{prediction.confidence}</p>
        </div>
        <div>
          <p className="text-[9px] font-serif uppercase tracking-wider text-[#9A9A8A] font-bold">Patients</p>
          <p className="text-sm font-serif font-bold text-[#3D3D3D] mt-0.5">{prediction.totalPatients} seen</p>
        </div>
      </div>
    </div>
  );
}
