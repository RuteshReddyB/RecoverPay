import React, { useState } from 'react';
import { Calculator, TrendingUp, ShieldCheck, DollarSign, ArrowRight } from 'lucide-react';

export const ROICalculator: React.FC = () => {
  const [monthlyVolumeLakhs, setMonthlyVolumeLakhs] = useState<number>(50); // ₹50 Lakhs
  const [failureRatePct, setFailureRatePct] = useState<number>(6); // 6% failure rate

  // Financial calculations
  const monthlyVolumeRupees = monthlyVolumeLakhs * 100000;
  const monthlyAtRiskRupees = monthlyVolumeRupees * (failureRatePct / 100);
  
  // Baseline recovery rate = 20.9%, RecoverPay AI recovery rate = 74.0%
  const baselineMonthlyRecovered = monthlyAtRiskRupees * 0.209;
  const aiMonthlyRecovered = monthlyAtRiskRupees * 0.740;
  const netMonthlyGainRupees = aiMonthlyRecovered - baselineMonthlyRecovered;
  const annualGainRupees = netMonthlyGainRupees * 12;
  const annualGainLakhs = (annualGainRupees / 100000).toFixed(2);
  const doomedRetriesPreventedMonthly = Math.round((monthlyAtRiskRupees / 5000) * 0.285);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs transition-colors space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-outfit">
              Interactive Merchant Financial ROI Calculator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Project annual recovered revenue based on your transaction volume and failure rates
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
          +253.35% Measured Uplift
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Sliders Input Column */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Slider 1: Monthly Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-900 dark:text-slate-100">
                Monthly Transaction Volume
              </label>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded text-sm">
                ₹{monthlyVolumeLakhs} Lakhs / mo
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="500"
              step="10"
              value={monthlyVolumeLakhs}
              onChange={(e) => setMonthlyVolumeLakhs(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>₹10 Lakhs</span>
              <span>₹2.5 Crores</span>
              <span>₹5.0 Crores</span>
            </div>
          </div>

          {/* Slider 2: Payment Failure Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-900 dark:text-slate-100">
                Current Payment Failure Rate
              </label>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded text-sm">
                {failureRatePct}% Failure Rate
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={failureRatePct}
              onChange={(e) => setFailureRatePct(Number(e.target.value))}
              className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1% (Low)</span>
              <span>6% (Average Fintech)</span>
              <span>15% (High Risk)</span>
            </div>
          </div>

          {/* Summary Breakdown Pills */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Monthly Revenue at Risk</span>
              <strong className="text-sm font-mono text-rose-600 dark:text-rose-400">
                ₹{(monthlyAtRiskRupees / 100000).toFixed(2)} Lakhs
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Prevented Doomed Retries</span>
              <strong className="text-sm font-mono text-indigo-600 dark:text-indigo-400">
                ~{doomedRetriesPreventedMonthly} / month
              </strong>
            </div>
          </div>

        </div>

        {/* Projected ROI Results Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-xl p-5 text-white shadow-xl border border-indigo-800/50 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Projected Annual Net Financial Gain</span>
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">
              +₹{annualGainLakhs} Lakhs
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              Additional net revenue recovered per year using RecoverPay AI vs. standard retries.
            </p>
          </div>

          <div className="border-t border-indigo-800/60 pt-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span>Standard Baseline Recovered:</span>
              <span className="font-mono text-slate-400">₹{((baselineMonthlyRecovered * 12) / 100000).toFixed(2)}L / yr</span>
            </div>
            <div className="flex items-center justify-between text-emerald-300 font-semibold">
              <span>RecoverPay AI Recovered:</span>
              <span className="font-mono text-emerald-400">₹{((aiMonthlyRecovered * 12) / 100000).toFixed(2)}L / yr</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
