import React, { useState, useEffect } from 'react';
import { X, Sliders, ShieldCheck, Save, CheckCircle2, AlertCircle, Zap, Building2, ShoppingBag, Layers, Lock } from 'lucide-react';
import { api, PolicyPreset } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  const { isAdmin, user } = useAuth();
  const [maxAmount, setMaxAmount] = useState<number>(10000);
  const [maxRetries, setMaxRetries] = useState<number>(2);
  const [minProbability, setMinProbability] = useState<number>(0.4);
  const [autoEnabled, setAutoEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [presets, setPresets] = useState<PolicyPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

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

      api.getPolicyPresets().then((res) => {
        if (res.presets) {
          setPresets(res.presets);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  const applyPreset = (preset: PolicyPreset) => {
    setSelectedPresetId(preset.id);
    setMaxAmount(preset.policy.max_auto_recovery_amount_rupees);
    setMaxRetries(preset.policy.max_retry_attempts);
    setMinProbability(preset.policy.min_recovery_probability);
    setAutoEnabled(preset.policy.auto_recovery_enabled);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white shrink-0">
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
            aria-label="Close modal"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* RBAC Read-Only Notification for Non-Admins */}
          {!isAdmin && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Policy Safety Mode (Read-Only)</span>
                <p className="mt-0.5 opacity-90 text-[11px]">
                  Logged in as <strong>{user?.name || user?.role || 'Operator'}</strong>. Only <strong>Merchant Admins</strong> can alter autonomous recovery thresholds and policy boundaries.
                </p>
              </div>
            </div>
          )}

          {/* Industry Preset Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Industry Policy Presets
              </label>
              <span className="text-[10px] text-slate-400">1-click configuration</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(presets.length > 0 ? presets : [
                { id: 'saas', name: 'SaaS Subscriptions', badge: 'High Retention', policy: { max_auto_recovery_amount_rupees: 50000, max_retry_attempts: 3, min_recovery_probability: 0.15, max_contact_attempts: 3, auto_recovery_enabled: true }, description: '' },
                { id: 'ecommerce', name: 'E-Commerce Retail', badge: 'Instant Link', policy: { max_auto_recovery_amount_rupees: 25000, max_retry_attempts: 2, min_recovery_probability: 0.20, max_contact_attempts: 2, auto_recovery_enabled: true }, description: '' },
                { id: 'b2b', name: 'B2B High-Ticket', badge: 'High Touch', policy: { max_auto_recovery_amount_rupees: 75000, max_retry_attempts: 1, min_recovery_probability: 0.35, max_contact_attempts: 2, auto_recovery_enabled: true }, description: '' },
                { id: 'default', name: 'Default Balanced', badge: 'Balanced', policy: { max_auto_recovery_amount_rupees: 100000, max_retry_attempts: 2, min_recovery_probability: 0.20, max_contact_attempts: 2, auto_recovery_enabled: true }, description: '' },
              ]).map((pst) => (
                <button
                  key={pst.id}
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => applyPreset(pst as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedPresetId === pst.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-slate-900 dark:text-white ring-1 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{pst.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-medium">
                      {pst.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Cap: ₹{(pst.policy.max_auto_recovery_amount_rupees || 0).toLocaleString()} • {pst.policy.max_retry_attempts} Retries
                  </div>
                </button>
              ))}
            </div>
          </div>

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
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isAdmin}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1.5 shadow-sm ${
              !isAdmin
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title={!isAdmin ? 'Merchant Admin role required to save policies' : 'Save Policy Rules'}
          >
            {!isAdmin ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{!isAdmin ? 'Admin Role Required' : saving ? 'Saving...' : 'Save Policy Rules'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
