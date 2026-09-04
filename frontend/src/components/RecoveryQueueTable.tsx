import React, { useState } from 'react';
import { Search, Filter, Cpu, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';
import { RecoveryCase } from '../services/api';

interface RecoveryQueueTableProps {
  cases: RecoveryCase[];
  onSelectCase: (caseItem: RecoveryCase) => void;
  onExecuteAction: (paymentId: string, action: string) => void;
  onMarkPaid?: (paymentId: string) => void;
}

export const RecoveryQueueTable: React.FC<RecoveryQueueTableProps> = ({
  cases,
  onSelectCase,
  onExecuteAction,
  onMarkPaid,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredCases = cases.filter(item => {
    const matchesSearch =
      item.payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.failure_reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Executed
          </span>
        );
      case 'HUMAN_ESCALATION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3" /> Escalated
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3 h-3" /> Blocked
          </span>
        );
      case 'LINK_SENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Clock className="w-3 h-3" /> Link Sent
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Clock className="w-3 h-3" /> Ready
          </span>
        );
    }
  };

  const formatRupees = (val: number) => `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
      
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payment, customer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="READY">Ready for AI Action</option>
            <option value="EXECUTED">Executed</option>
            <option value="HUMAN_ESCALATION">Human Escalation</option>
            <option value="BLOCKED">Policy Blocked</option>
          </select>
        </div>

      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Payment ID</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Failure Reason</th>
              <th className="py-3 px-4">AI Recommended Action</th>
              <th className="py-3 px-4">Success Prob</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredCases.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                
                <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                  {item.payment_id}
                </td>

                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                  {item.customer_name}
                </td>

                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                  {formatRupees(item.amount_rupees)}
                </td>

                <td className="py-3 px-4">
                  <span className="inline-block px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                    {item.failure_reason}
                  </span>
                </td>

                <td className="py-3 px-4 font-medium text-indigo-600 dark:text-indigo-400">
                  {item.recommended_action}
                </td>

                <td className="py-3 px-4">
                  <span className={`font-semibold ${item.probability_pct >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {item.probability_pct}%
                  </span>
                </td>

                <td className="py-3 px-4">
                  {getStatusBadge(item.status)}
                </td>

                <td className="py-3 px-4 text-right space-x-2">
                  {item.status === 'LINK_SENT' && onMarkPaid && (
                    <button
                      onClick={() => onMarkPaid(item.payment_id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors shadow-xs"
                      title="Simulate customer completing payment link"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simulate Paid</span>
                    </button>
                  )}
                  <button
                    onClick={() => onSelectCase(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 text-xs font-medium transition-colors border border-indigo-200 dark:border-indigo-800"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Inspect AI</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};
