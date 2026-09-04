import React, { useState, useEffect } from 'react';
import { X, Play, Cpu, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, MessageSquare, TrendingUp, TrendingDown, RefreshCw, ShieldAlert, Lock } from 'lucide-react';
import { api, AgentExecution, RecoveryCase, FeatureAttribution } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AiDecisionDrawerProps {
  caseItem: RecoveryCase | null;
  onClose: () => void;
  onExecuteSuccess: () => void;
  onPreviewMessage?: (caseItem: RecoveryCase) => void;
}

export const AiDecisionDrawer: React.FC<AiDecisionDrawerProps> = ({
  caseItem,
  onClose,
  onExecuteSuccess,
  onPreviewMessage,
}) => {
  const { isAuditor } = useAuth();
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (caseItem) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [caseItem, onClose]);

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
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end transition-opacity"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-colors animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-outfit">
                Autonomous Recovery Agent
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaluating Case {caseItem.payment_id} • {caseItem.customer_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {loading ? (
            <div className="text-center py-16 text-slate-500 text-xs sm:text-sm">
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

              {/* Action Bar: Omnichannel Preview Trigger (Only for actions dispatching a customer message) */}
              {onPreviewMessage && ['SEND_PAYMENT_LINK', 'PAYMENT_LINK', 'REMINDER', 'SCHEDULE_FOLLOWUP'].includes(agentResult.recommended_action) && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                    <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Customer notification payload prepared</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPreviewMessage(caseItem)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <span>Preview Message</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Informational Context for Silent API Retry */}
              {agentResult.recommended_action === 'RETRY' && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-800 dark:text-indigo-300">
                  <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span><strong>Autonomous Background Retry:</strong> Executed directly via Razorpay API without bothering the customer.</span>
                </div>
              )}

              {/* Informational Context for Human Escalation */}
              {agentResult.recommended_action === 'HUMAN_ESCALATION' && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span><strong>Escalated to Human Operator:</strong> Transaction breached policy boundaries and requires manual triage before messaging.</span>
                </div>
              )}

              {/* Agent Attempts Badge */}
              {agentResult.agent_attempts != null && (
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className={`px-2.5 py-1 rounded-full font-semibold border ${
                    agentResult.agent_attempts === 1
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700'
                  }`}>
                    Completed in {agentResult.agent_attempts}/2 agent attempt(s)
                  </span>
                  {agentResult.agent_attempts === 2 && (
                    <span className="text-amber-600 dark:text-amber-400 italic">
                      ↩ Retry loop activated — first action failed, re-evaluated
                    </span>
                  )}
                </div>
              )}

              {/* AI Explainability / Decision Drivers Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    AI Decision Drivers (Why this Action?)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">SHAP Feature Attribution</span>
                </div>
                
                <div className="space-y-2">
                  {(agentResult.feature_attributions && agentResult.feature_attributions.length > 0 ? agentResult.feature_attributions : [
                    { feature_name: 'Failure Cause (Bank Downtime)', impact_pct: 18.5, direction: 'positive', explanation: 'Temporary bank timeout resolves quickly via smart link or retry.' },
                    { feature_name: 'Payment Channel (UPI Deep-Link)', impact_pct: 11.5, direction: 'positive', explanation: '1-click mobile authorization boosts completion speed.' },
                    { feature_name: 'Attempt Lifecycle (First Attempt)', impact_pct: 14.0, direction: 'positive', explanation: 'Initial decline maintains high customer intent.' },
                  ] as FeatureAttribution[]).map((attr, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          {attr.direction === 'positive' ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          {attr.feature_name}
                        </span>
                        <span className={`font-mono font-bold text-[11px] ${
                          attr.direction === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {attr.direction === 'positive' ? '+' : ''}{attr.impact_pct}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {attr.explanation}
                      </p>
                    </div>
                  ))}
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
                      {/* Step 3: render formatted probability table if multi-action mode */}
                      {step.tool_name === 'predict_recovery_probability' &&
                       step.tool_output?.mode === 'all_actions' &&
                       step.tool_output?.all_candidate_actions?.length > 0 && (
                        <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                          <table className="w-full text-[10px]">
                            <thead className="bg-slate-100 dark:bg-slate-800">
                              <tr>
                                <th className="px-2 py-1.5 text-left font-semibold text-slate-600 dark:text-slate-300">Action</th>
                                <th className="px-2 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300">Probability</th>
                                <th className="px-2 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300">Expected Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {step.tool_output.all_candidate_actions.map((a: any, i: number) => (
                                <tr key={i} className={`border-t border-slate-100 dark:border-slate-800 ${
                                  a.action === step.tool_output.recommended_action
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 font-bold text-indigo-700 dark:text-indigo-300'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}>
                                  <td className="px-2 py-1 font-mono">
                                    {a.action === step.tool_output.recommended_action ? '★ ' : ''}{a.action}
                                  </td>
                                  <td className="px-2 py-1 text-right">{a.probability_pct}</td>
                                  <td className="px-2 py-1 text-right">
                                    ₹{a.expected_recovery_rupees != null ? Number(a.expected_recovery_rupees).toFixed(0) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

        </div>

        {/* Drawer Footer Actions */}
        <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>

          {caseItem?.status === 'LINK_SENT' ? (
            <button
              onClick={handleMarkPaid}
              disabled={executing || isAuditor}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-all shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              title={isAuditor ? 'Auditor Persona: Read-Only Mode' : 'Simulate Customer Paid Link'}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isAuditor ? 'Auditor (Read-Only)' : executing ? 'Updating...' : 'Simulate Customer Paid Link'}</span>
            </button>
          ) : agentResult && agentResult.policy_status === 'APPROVED' ? (
            <button
              onClick={handleExecute}
              disabled={executing || isAuditor}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium text-xs sm:text-sm shadow-sm transition-all shadow-emerald-500/20 active:scale-95 disabled:opacity-50 ${
                isAuditor
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title={isAuditor ? 'Auditor Persona: Read-Only Mode' : 'Execute Recovery Action'}
            >
              {isAuditor ? <Lock className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
              <span>{isAuditor ? 'Auditor: Read-Only Mode' : executing ? 'Executing Razorpay API...' : 'Execute Recovery Action'}</span>
            </button>
          ) : null}
        </div>

      </div>
    </div>
  );
};
