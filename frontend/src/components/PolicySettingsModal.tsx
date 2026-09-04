import React, { useState, useEffect } from 'react';
import { X, Sliders, ShieldCheck, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface PolicySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPolicyUpdated?: () => void;
}

export const PolicySettingsModal: React.FC<PolicySettingsModalProps> = ({
  isOpen,
  onClose,
  onPolicyUpdated,
}) => {
  const [maxAmount, setMaxAmount] = useState<number>(10000);
  const [maxRetries, setMaxRetries] = useState<number>(2);
  const [minProbability, setMinProbability] = useState<number>(0.4);
  const [autoEnabled, setAutoEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getPolicy().then((res) => {
        if (res.policy) {
          setMaxAmount(res.policy.max_auto_recovery_amount_rupees || (res.policy.max_auto_recovery_amount_paisa ? res.policy.max_auto_recovery_amount_paisa / 100 : 10000));
          setMaxRetries(res.policy.max_retry_attempts || 2);
          setMinProbability(res.policy.min_recovery_probability || 0.4);
          setAutoEnabled(res.policy.auto_recovery_enabled !== false);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    try {
      await api.updatePolicy({
        max_auto_recovery_amount_rupees: maxAmount,
        max_retry_attempts: maxRetries,
        min_recovery_probability: minProbability,
        max_contact_attempts: 2,
        auto_recovery_enabled: autoEnabled,
      });
      setSaving(false);
      setSuccessMsg('Policy Engine boundaries updated successfully!');
      if (onPolicyUpdated) onPolicyUpdated();
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-outfit">
                Merchant Policy Engine Rules
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure deterministic AI safety caps and human escalation boundaries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {/* Master Toggle */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Autonomous Recovery Engine</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Master switch for AI automated workflows</p>
              </div>
            </div>
            <button
              onClick={() => setAutoEnabled(!autoEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Slider 1: Max Auto Recovery Amount Cap */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-900 dark:text-slate-100">
                Max Auto-Recovery Cap (Rupees)
              </label>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                ₹{maxAmount.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="50000"
              step="1000"
              value={maxAmount}
              onChange={(e) => setMaxAmount(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Transactions exceeding ₹{maxAmount.toLocaleString()} will automatically trigger <strong>Human Escalation</strong> for merchant ops review.
            </p>
          </div>

          {/* Slider 2: Minimum Probability Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-900 dark:text-slate-100">
                Min Probability Threshold
              </label>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                {Math.round(minProbability * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={minProbability}
              onChange={(e) => setMinProbability(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              AI blocks actions if predicted recovery chance is below {Math.round(minProbability * 100)}%.
            </p>
          </div>

          {/* Selector: Max Retries */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
              Max Automated Retry Attempts
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxRetries(num)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                    maxRetries === num
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {num} {num === 1 ? 'Attempt' : 'Attempts'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Prevents card issuer fraud flagging by capping card re-try attempts.
            </p>
          </div>

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Policy Rules'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
