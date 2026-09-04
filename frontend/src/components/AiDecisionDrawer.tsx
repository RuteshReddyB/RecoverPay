import React, { useState, useEffect } from 'react';
import { X, Play, Cpu, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api, AgentExecution, RecoveryCase } from '../services/api';

interface AiDecisionDrawerProps {
  caseItem: RecoveryCase | null;
  onClose: () => void;
  onExecuteSuccess: () => void;
}

export const AiDecisionDrawer: React.FC<AiDecisionDrawerProps> = ({
  caseItem,
  onClose,
  onExecuteSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [agentResult, setAgentResult] = useState<AgentExecution | null>(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (caseItem) {
      setLoading(true);
      setAgentResult(null);
      api.runAutonomousAgent(caseItem.payment_id, caseItem.customer_id)
        .then((res) => {
          setAgentResult(res.agent_execution);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed agent execution:', err);
          setLoading(false);
        });
    }
  }, [caseItem]);

  if (!caseItem) return null;

  const formatRupees = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const handleExecute = async () => {
    if (!caseItem || !agentResult) return;
    setExecuting(true);
    try {
      await api.executeRecovery(caseItem.payment_id, agentResult.recommended_action);
      setExecuting(false);
      onExecuteSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      setExecuting(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!caseItem) return;
    setExecuting(true);
    try {
      await api.markPaid(caseItem.payment_id);
      setExecuting(false);
      onExecuteSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      setExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-colors">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-outfit">
                AI Autonomous Reasoning Trace
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                7-stage decision cycle for Payment: <span className="font-mono font-semibold">{caseItem.payment_id}</span>
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
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {loading ? (
            <div className="py-20 text-center text-slate-500 dark:text-slate-400 text-sm">
              <Cpu className="w-8 h-8 text-indigo-500 animate-pulse mx-auto mb-3" />
              Running 7-step autonomous agent diagnosis...
            </div>
          ) : agentResult ? (
            <>
              {/* Outcome Banner */}
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                    Recommended Recovery Action
                  </span>
                  <h3 className="text-lg font-bold text-indigo-950 dark:text-indigo-100 font-outfit">
                    {agentResult.recommended_action}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-indigo-600 dark:text-indigo-400">Expected Value</span>
                  <p className="text-base font-bold text-indigo-950 dark:text-indigo-100">
                    {formatRupees(agentResult.expected_recovery_rupees)} ({agentResult.probability_pct}%)
                  </p>
                </div>
              </div>

              {/* Policy Validation Banner */}
              <div className={`p-4 rounded-xl border ${agentResult.policy_status === 'APPROVED' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'}`}>
                <div className="flex items-center space-x-2 font-semibold text-sm">
                  {agentResult.policy_status === 'APPROVED' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  <span>Policy Check Status: {agentResult.policy_status}</span>
                </div>
                <p className="text-xs mt-1 opacity-90">{agentResult.policy_reason}</p>
              </div>

              {/* 7-Step Reasoning Trace Timeline */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Step-by-Step Tool Invocations
                </h3>
                
                <div className="space-y-3">
                  {agentResult.reasoning_trace.map((step, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                          Step {step.step_index}: {step.tool_name}()
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                          TOOL OK
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        {step.reasoning}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

        </div>

        {/* Drawer Footer Actions */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>

          {caseItem?.status === 'LINK_SENT' ? (
            <button
              onClick={handleMarkPaid}
              disabled={executing}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-all shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{executing ? 'Updating...' : 'Simulate Customer Paid Link'}</span>
            </button>
          ) : agentResult && agentResult.policy_status === 'APPROVED' ? (
            <button
              onClick={handleExecute}
              disabled={executing}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-all shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{executing ? 'Executing Razorpay API...' : 'Execute Recovery Action'}</span>
            </button>
          ) : null}
        </div>

      </div>
    </div>
  );
};
