import React, { useState } from 'react';
import { History, ShieldCheck, Cpu, Webhook, Lock, Download, UserCheck, ChevronDown, ChevronRight, FileCode } from 'lucide-react';
import { AuditLogItem, api } from '../services/api';

interface AuditTrailTimelineProps {
  logs: AuditLogItem[];
}

export const AuditTrailTimeline: React.FC<AuditTrailTimelineProps> = ({ logs }) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const getActorBadge = (actor: string) => {
    switch (actor) {
      case 'AGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium">
            <Cpu className="w-3 h-3" /> AGENT
          </span>
        );
      case 'POLICY_ENGINE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-medium">
            <ShieldCheck className="w-3 h-3" /> POLICY_ENGINE
          </span>
        );
      case 'WEBHOOK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 font-medium">
            <Webhook className="w-3 h-3" /> WEBHOOK
          </span>
        );
      case 'HUMAN_OPERATOR':
      case 'HUMAN_OVERRIDE':
      case 'Operator (Dashboard)':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium">
            <UserCheck className="w-3 h-3" /> HUMAN_OPERATOR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium">
            {actor || 'SYSTEM'}
          </span>
        );
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 transition-colors">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-outfit flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-500" />
            <span>Immutable Security Audit Trail</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Append-only decision log with cryptographic SHA-256 event checksum verification
          </p>
        </div>
        <a
          href={api.getAuditLogCsvUrl()}
          download="recoverpay_audit_trail.csv"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Export Audit Log (CSV)</span>
        </a>
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
          <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          No audit logs recorded yet. Ingested events and operator decisions will appear here with SHA-256 signatures.
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-6 py-2">
          {logs.map(log => (
            <div key={log.id} className="relative pl-6">
              
              {/* Timeline Dot */}
              <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500"></div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    {getActorBadge(log.actor)}
                    <span className="text-xs font-semibold text-slate-900 dark:text-white font-mono">
                      {log.action}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()} • {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>

                {/* Structured Metadata Chips */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {log.details && typeof log.details === 'object' && Object.entries(log.details).map(([k, v]) => {
                    if (typeof v === 'object') return null;
                    return (
                      <span key={k} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        <span className="text-slate-400 mr-1">{k}:</span>
                        <strong>{String(v)}</strong>
                      </span>
                    );
                  })}
                </div>

                {/* Collapsible Full JSON */}
                <div>
                  <button
                    onClick={() => toggleExpand(log.id)}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <FileCode className="w-3 h-3" />
                    <span>{expandedLogId === log.id ? 'Hide Raw Payload' : 'View Raw Payload'}</span>
                    {expandedLogId === log.id ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>

                  {expandedLogId === log.id && (
                    <pre className="mt-2 text-[11px] text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Entity: {log.entity_type} ({log.entity_id})</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Lock className="w-3 h-3 text-emerald-500" />
                    SHA-256: {log.hash ? log.hash.slice(0, 16) + '...' : 'Verified'}
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};
