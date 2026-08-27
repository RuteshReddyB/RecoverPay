import React from 'react';
import { CheckCircle, XCircle, ShieldAlert } from 'lucide-react';
import { RecoveryCase } from '../services/api';

interface HumanEscalationQueueProps {
  cases: RecoveryCase[];
  onApprove: (paymentId: string) => void;
  onReject: (paymentId: string) => void;
}

export const HumanEscalationQueue: React.FC<HumanEscalationQueueProps> = ({
  cases,
  onApprove,
  onReject,
}) => {
  const escalatedCases = cases.filter(c => c.status === 'HUMAN_ESCALATION' || c.amount_rupees > 10000);

  const formatRupees = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      
      {/* Banner */}
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs sm:text-sm">
          <span className="font-bold">Policy Safety Escalation Workspace</span>
          <p className="mt-0.5 opacity-90">
            These payment failure events breached merchant policy boundaries (e.g. transaction amount &gt; ₹10,000 threshold or retry limits reached). Merchant ops approval is required before dispatching Razorpay recovery links.
          </p>
        </div>
      </div>

      {/* Escalated Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {escalatedCases.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No pending human escalations. All transactions processed within automated policy bounds!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Payment ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Escalation Reason</th>
                  <th className="py-3 px-4">AI Recommendation</th>
                  <th className="py-3 px-4 text-right">Merchant Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {escalatedCases.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                      {item.payment_id}
                    </td>

                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {item.customer_name}
                    </td>

                    <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">
                      {formatRupees(item.amount_rupees)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium">
                        Amount &gt; ₹10,000 threshold
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-indigo-600 dark:text-indigo-400">
                      {item.recommended_action} ({item.probability_pct}%)
                    </td>

                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => onApprove(item.payment_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => onReject(item.payment_id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors shadow-xs"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
