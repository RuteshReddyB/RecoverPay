import React, { useState, useEffect } from 'react';
import { X, Play, Zap, ShieldAlert, Cpu, CheckCircle2, CopyCheck, ShieldCheck } from 'lucide-react';
import { api, AgentExecution } from '../services/api';

interface LiveEventSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventSimulated: () => void;
}

export const LiveEventSimulatorModal: React.FC<LiveEventSimulatorModalProps> = ({
  isOpen,
  onClose,
  onEventSimulated,
}) => {
  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState<AgentExecution | null>(null);
  const [isDuplicateTest, setIsDuplicateTest] = useState(false);
  const [showTrace, setShowTrace] = useState(false);

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

  const handleSimulate = async (type: 'bank_timeout' | 'card_expired' | 'high_value' | 'duplicate_webhook') => {
    setLoading(true);
    setSimulationResult(null);
    setShowTrace(false);
    setIsDuplicateTest(type === 'duplicate_webhook');

    try {
      const res = await api.simulateEvent(type);
      const agentRes = res.agent_result || res.agent_execution;
      setSimulationResult(agentRes);
      setLoading(false);
      onEventSimulated();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-colors max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-outfit">
                Live Payment Event Simulator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trigger mock payment failure webhooks to evaluate RecoverPay AI in real-time
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

        {/* Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Select a payment failure scenario to dispatch through the webhook receiver and autonomous AI agent loop:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <button
              onClick={() => handleSimulate('bank_timeout')}
              disabled={loading}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/40 dark:hover:bg-indigo-950/40 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Bank Timeout (₹4,999)
                </span>
                <Play className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Temporary network crash. Agent selects instant Razorpay RETRY.
              </p>
            </button>

            <button
              onClick={() => handleSimulate('card_expired')}
              disabled={loading}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/40 dark:hover:bg-indigo-950/40 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Expired Card (₹7,999)
                </span>
                <Play className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Doomed retry prevented. Agent generates Payment Link via SMS.
              </p>
            </button>

            <button
              onClick={() => handleSimulate('high_value')}
              disabled={loading}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-amber-50 dark:bg-slate-800/40 dark:hover:bg-amber-950/40 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                  High Value Case (₹15,000)
                </span>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Exceeds ₹10k auto-limit. Policy Engine escalates to human queue.
              </p>
            </button>

            <button
              onClick={() => handleSimulate('duplicate_webhook')}
              disabled={loading}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-purple-50 dark:bg-slate-800/40 dark:hover:bg-purple-950/40 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400">
                  Duplicate Webhook Event
                </span>
                <CopyCheck className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Tests idempotency filter. Prevents duplicate charges & messages.
              </p>
            </button>

          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <Cpu className="w-6 h-6 animate-spin mx-auto mb-1 text-indigo-500" />
              Dispatching webhook & executing AI agent...
            </div>
          ) : simulationResult ? (
            <div className="space-y-3">
              {isDuplicateTest && (
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Idempotency Filter Verified:</span>
                    <p className="mt-0.5 opacity-90">
                      Gateway replay detected with matching <code className="px-1 py-0.5 bg-purple-200/60 dark:bg-purple-900 rounded font-mono">event_id</code>. Second webhook silently acknowledged with <code className="px-1 py-0.5 bg-purple-200/60 dark:bg-purple-900 rounded font-mono">status: "ignored_duplicate"</code> without double-messaging customer.
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 font-bold text-emerald-800 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Simulation Executed Successfully!</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                    {simulationResult.recommended_action}
                  </span>
                </div>
                
                <p className="text-slate-700 dark:text-slate-300">
                  Recommended Action: <strong className="text-indigo-600 font-mono">{simulationResult.recommended_action}</strong> ({simulationResult.probability_pct}% probability). Expected Value: ₹{simulationResult.expected_recovery_rupees?.toLocaleString() || '4,249.15'}.
                </p>
                
                <p className="text-slate-600 dark:text-slate-400">
                  Policy Check: <strong className={simulationResult.policy_status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'}>{simulationResult.policy_status}</strong>. Reason: {simulationResult.policy_reason}
                </p>

                {simulationResult.reasoning_trace && simulationResult.reasoning_trace.length > 0 && (
                  <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
                    <button
                      onClick={() => setShowTrace(!showTrace)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <span>{showTrace ? 'Hide' : 'View'} 7-Step AI Reasoning Trace ({simulationResult.reasoning_trace.length} Steps)</span>
                    </button>

                    {showTrace && (
                      <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] space-y-2 max-h-48 overflow-y-auto">
                        {simulationResult.reasoning_trace.map((step, idx) => (
                          <div key={idx} className="border-b border-slate-800 pb-1.5 last:border-none last:pb-0">
                            <span className="text-indigo-400 font-bold">Step {step.step_index} [{step.tool_name}]:</span> {step.reasoning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}

        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            {simulationResult ? 'Dashboard updated with new event' : ''}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Close Simulator
          </button>
        </div>

      </div>
    </div>
  );
};
