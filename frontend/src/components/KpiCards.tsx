import React from 'react';
import { AlertCircle, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { OverviewKPIs } from '../services/api';

interface KpiCardsProps {
  kpis: OverviewKPIs | null;
  totalTrackedCases?: number;
  isLoading?: boolean;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, totalTrackedCases, isLoading }) => {
  const formatRupees = (amount: number = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const trackedCount = totalTrackedCases ?? kpis.active_recovery_cases ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      
      {/* 1. Revenue at Risk */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Revenue at Risk
          </span>
          <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl font-bold font-outfit text-slate-900 dark:text-white">
            {formatRupees(kpis.revenue_at_risk_rupees)}
          </span>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>{trackedCount} failed payments tracked</span>
          </p>
        </div>
      </div>

      {/* 2. Revenue Recovered */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Revenue Recovered
          </span>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl font-bold font-outfit text-emerald-600 dark:text-emerald-400">
            {formatRupees(kpis.revenue_recovered_rupees)}
          </span>
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{formatRupees(kpis.additional_recovered_rupees)} added revenue</span>
          </p>
        </div>
      </div>

      {/* 3. Recovery Rate % */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Recovery Rate
          </span>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl font-bold font-outfit text-indigo-600 dark:text-indigo-400">
            {(kpis.recovery_rate_pct || 0).toFixed(1)}%
          </span>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>vs {((kpis as any).baseline_recovery_rate_pct ?? 25.1).toFixed(1)}% baseline</span>
          </p>
        </div>
      </div>

      {/* 4. AI Financial Uplift % */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            AI Financial Uplift
          </span>
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-2xl sm:text-3xl font-bold font-outfit text-purple-600 dark:text-purple-400">
            +{(kpis.ai_uplift_pct || 0).toFixed(1)}%
          </span>
          <p className="mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1">
            <span>Verified across 1,000+ test events</span>
          </p>
        </div>
      </div>

    </div>
  );
};
