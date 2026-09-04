import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertTriangle, CheckCircle, ShieldAlert, FileText, Send, ArrowRight, Lock } from 'lucide-react';
import { RecoveryCase, api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface EscalationResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryCase: RecoveryCase | null;
  onResolved: () => void;
}

export const EscalationResolveModal: React.FC<EscalationResolveModalProps> = ({
  isOpen,
  onClose,
  recoveryCase,
  onResolved,
}) => {
  const { isAuditor, user } = useAuth();
  const [resolutionAction, setResolutionAction] = useState<string>('SEND_VIP_LINK');
  const [notes, setNotes] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>(user?.name || 'Operations Lead');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isOpen || !recoveryCase) return null;

  const amountFormatted = `₹${(recoveryCase.amount_rupees || 0).toLocaleString('en-IN')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please provide operator resolution notes for the compliance audit trail.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.resolveEscalation(recoveryCase.payment_id, {
        resolution_action: resolutionAction,
        operator_notes: notes.trim(),
        resolved_by: operatorName.trim() || 'Operations Lead',
      });
      onResolved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve escalation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                Human-in-the-Loop Resolution
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                  Escalated Case
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized override for {recoveryCase.payment_id} ({recoveryCase.customer_name})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Case Summary Card */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Transaction Value:</span>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{amountFormatted}</p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Escalation Trigger:</span>
              <p className="font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                {recoveryCase.policy_reason || 'Transaction exceeds high-value threshold ₹100,000'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Failure Reason:</span>
              <p className="font-medium text-slate-700 dark:text-slate-300 capitalize mt-0.5">
                {(recoveryCase.failure_reason || '').replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">AI Recommendation:</span>
              <p className="font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                {recoveryCase.recommended_action} ({recoveryCase.probability_pct}% prob)
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Authorized Resolution Action
            </label>
            <div className="space-y-2">
              {[
                {
                  id: 'SEND_VIP_LINK',
                  title: 'Send VIP Concierge Payment Link',
                  desc: 'Dispatches high-priority WhatsApp & Email payment link with custom expiry.',
                },
                {
                  id: 'MANUAL_RETRY',
                  title: 'Trigger Approved Gateway Retry',
                  desc: 'Overrides policy gate and triggers immediate server retry on Razorpay rails.',
                },
                {
                  id: 'MARK_RESOLVED_OFFLINE',
                  title: 'Mark Resolved via Offline Wire (NEFT/RTGS)',
                  desc: 'Marks the transaction as captured after manual payment verification.',
                },
                {
                  id: 'WRITE_OFF',
                  title: 'Mark as Unrecoverable / Write-Off',
                  desc: 'Rejects recovery attempt and logs uncollectible balance to audit ledger.',
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    resolutionAction === opt.id
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-500 text-slate-900 dark:text-white ring-1 ring-indigo-500/50'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="resolution_action"
                    value={opt.id}
                    checked={resolutionAction === opt.id}
                    onChange={(e) => setResolutionAction(e.target.value)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-semibold">{opt.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Operator Resolution Notes (Mandatory for Audit Trail)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Spoke with customer via phone concierge. Customer confirmed funds ready; dispatched VIP WhatsApp link."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              required
            />
          </div>

          {/* Operator Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Resolved By (Operator ID / Name)
            </label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Immutable SHA-256 Audit Log</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || isAuditor}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors ${
                  isAuditor
                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title={isAuditor ? 'Auditor Persona: Read-Only Compliance Mode' : 'Submit Resolution'}
              >
                {isAuditor ? <Lock className="w-3.5 h-3.5" /> : null}
                <span>{isAuditor ? 'Auditor (Read-Only)' : loading ? 'Executing...' : 'Submit Resolution'}</span>
                {!isAuditor && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
