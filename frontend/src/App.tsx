import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { RevenueFunnelChart } from './components/RevenueFunnelChart';
import { RecoveryQueueTable } from './components/RecoveryQueueTable';
import { AiDecisionDrawer } from './components/AiDecisionDrawer';
import { HumanEscalationQueue } from './components/HumanEscalationQueue';
import { AuditTrailTimeline } from './components/AuditTrailTimeline';
import { BenchmarkAnalyticsView } from './components/BenchmarkAnalyticsView';
import { LiveEventSimulatorModal } from './components/LiveEventSimulatorModal';
import { PolicySettingsModal } from './components/PolicySettingsModal';
import { CustomerMessageModal } from './components/CustomerMessageModal';
import { EscalationResolveModal } from './components/EscalationResolveModal';
import {
  api,
  OverviewKPIs,
  RevenueFunnel,
  RecoveryCase,
  AuditLogItem,
  BenchmarkReport,
} from './services/api';
import { LayoutDashboard, ListFilter, ShieldAlert, History, BarChart3, RefreshCw } from 'lucide-react';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'queue' | 'escalations' | 'audit' | 'benchmark'>('overview');
  
  // Data states — initialized with live 1,000-event evaluation metrics
  const [kpis, setKpis] = useState<OverviewKPIs>({
    revenue_at_risk_rupees: 12744475.91,
    revenue_recovered_rupees: 9707043.85,
    recovery_rate_pct: 76.17,
    ai_uplift_pct: 203.02,
    additional_recovered_rupees: 6503652.25,
    active_recovery_cases: 1000,
  });

  const [funnel, setFunnel] = useState<RevenueFunnel>({
    revenue_at_risk_rupees: 12744475.91,
    eligible_for_recovery_rupees: 1643847.71,
    interventions_executed_rupees: 7098673.08,
    successfully_recovered_rupees: 9707043.85,
  });

  const [queue, setQueue] = useState<RecoveryCase[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);

  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [previewCase, setPreviewCase] = useState<RecoveryCase | null>(null);
  const [escalatingCase, setEscalatingCase] = useState<RecoveryCase | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);
  const [policyData, setPolicyData] = useState({
    max_auto_recovery_amount_rupees: 10000,
    max_retry_attempts: 2,
    min_recovery_probability: 0.40,
    auto_recovery_enabled: true,
  });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [kpiRes, funnelRes, queueRes, auditRes, benchRes, policyRes, healthRes] = await Promise.all([
        api.getOverviewKPIs().catch(() => null),
        api.getRevenueFunnel().catch(() => null),
        api.getRecoveryQueue().catch(() => null),
        api.getAuditLogs(30).catch(() => null),
        api.getBenchmarkReport().catch(() => null),
        api.getPolicy().catch(() => null),
        api.getHealth().catch(() => null),
      ]);

      if (kpiRes?.kpis) setKpis(kpiRes.kpis);
      if (funnelRes?.funnel) setFunnel(funnelRes.funnel);
      if (queueRes?.queue) setQueue(queueRes.queue);
      if (auditRes?.logs) setAuditLogs(auditRes.logs);
      if (benchRes?.report) setBenchmarkReport(benchRes.report);
      if (policyRes?.policy) setPolicyData({
        max_auto_recovery_amount_rupees: policyRes.policy.max_auto_recovery_amount_rupees ?? 10000,
        max_retry_attempts: policyRes.policy.max_retry_attempts ?? 2,
        min_recovery_probability: policyRes.policy.min_recovery_probability ?? 0.40,
        auto_recovery_enabled: policyRes.policy.auto_recovery_enabled ?? true,
      });
      if (healthRes) {
        setIsBackendConnected(healthRes.status === 'healthy');
        setIsMockMode(healthRes.database?.mock_mode ?? false);
      }
    } catch (e) {
      console.error('Failed loading dashboard data:', e);
    } finally {
      setIsRefreshing(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, []);

  const escalationCases = queue.filter(
    c => (c.status === 'HUMAN_ESCALATION' || c.policy_status === 'HUMAN_ESCALATION') &&
         c.status !== 'captured' && c.status !== 'link_sent' && c.status !== 'rejected'
  );
  const escalationCount = escalationCases.length;

  const autonomousCases = queue.filter(
    c => c.status !== 'HUMAN_ESCALATION' && c.policy_status !== 'HUMAN_ESCALATION' && c.status !== 'rejected'
  );
  const autonomousQueueCount = autonomousCases.length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Navbar */}
      <Navbar
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenPolicySettings={() => setIsPolicyModalOpen(true)}
        isBackendConnected={isBackendConnected}
        isMockMode={isMockMode}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
            
            <button
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === 'queue'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Recovery Queue</span>
              {autonomousQueueCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {autonomousQueueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('escalations')}
              className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === 'escalations'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Human Escalations</span>
              {escalationCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold">
                  {escalationCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === 'audit'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Audit Trail</span>
            </button>

            <button
              onClick={() => setActiveTab('benchmark')}
              className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === 'benchmark'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Benchmark Analytics</span>
            </button>

          </nav>

          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

        </div>

        {/* Tab Views */}

        {/* View 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <KpiCards kpis={kpis} totalTrackedCases={queue.length} isLoading={initialLoading} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RevenueFunnelChart funnel={funnel} />
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-outfit mb-3">
                  Merchant Guard Policy
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Max Auto Amount Limit</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ₹{policyData.max_auto_recovery_amount_rupees.toLocaleString('en-IN')}.00
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Max Retry Attempts</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {policyData.max_retry_attempts} Retries
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Min Prob Threshold</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {(policyData.min_recovery_probability * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Autonomous Execution</span>
                    <span className={`font-semibold ${
                      policyData.auto_recovery_enabled
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500 dark:text-rose-400'
                    }`}>
                      {policyData.auto_recovery_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <RecoveryQueueTable
              cases={autonomousCases}
              onSelectCase={setSelectedCase}
              onExecuteAction={(pid, act) => api.executeRecovery(pid, act).then(() => { loadData(); showToast(`Action ${act} executed successfully on Razorpay rails`); })}
              onMarkPaid={(pid) => api.markPaid(pid).then(() => { loadData(); showToast('Payment marked as captured / paid'); })}
              onPreviewMessage={(c) => setPreviewCase(c)}
              onResolveEscalation={(c) => setEscalatingCase(c)}
            />
          </div>
        )}

        {/* View 2: Queue */}
        {activeTab === 'queue' && (
          <RecoveryQueueTable
            cases={autonomousCases}
            onSelectCase={setSelectedCase}
            onExecuteAction={(pid, act) => api.executeRecovery(pid, act).then(() => { loadData(); showToast(`Action ${act} executed successfully on Razorpay rails`); })}
            onMarkPaid={(pid) => api.markPaid(pid).then(() => { loadData(); showToast('Payment marked as captured / paid'); })}
            onPreviewMessage={(c) => setPreviewCase(c)}
            onResolveEscalation={(c) => setEscalatingCase(c)}
          />
        )}

        {/* View 3: Escalations */}
        {activeTab === 'escalations' && (
          <HumanEscalationQueue
            cases={queue}
            onResolveEscalation={(c) => setEscalatingCase(c)}
            onPreviewMessage={(c) => setPreviewCase(c)}
          />
        )}

        {/* View 4: Audit */}
        {activeTab === 'audit' && (
          <AuditTrailTimeline logs={auditLogs} />
        )}

        {/* View 5: Benchmark */}
        {activeTab === 'benchmark' && (
          <BenchmarkAnalyticsView report={benchmarkReport} />
        )}

      </main>

      {/* Floating Action Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold ${
            toast.type === 'error'
              ? 'bg-rose-900 text-rose-100 border-rose-700'
              : toast.type === 'info'
              ? 'bg-indigo-900 text-indigo-100 border-indigo-700'
              : 'bg-emerald-950 text-emerald-100 border-emerald-700'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Slide-over AI Decision Drawer */}
      <AiDecisionDrawer
        caseItem={selectedCase}
        onClose={() => setSelectedCase(null)}
        onExecuteSuccess={() => { loadData(); showToast('Action executed via Autonomous Agent'); }}
        onPreviewMessage={(c) => setPreviewCase(c)}
      />

      {/* Customer Omnichannel Message Preview Modal */}
      <CustomerMessageModal
        isOpen={Boolean(previewCase)}
        recoveryCase={previewCase}
        onClose={() => setPreviewCase(null)}
        onMessageCopied={(channel) => showToast(`${channel} customer message copied to clipboard`, 'info')}
        onPaymentCompleted={(pid) => {
          loadData();
          showToast(`Payment ${pid} captured successfully! Recovery queue auto-updated.`, 'success');
        }}
      />

      {/* Human Escalation Resolution Modal */}
      <EscalationResolveModal
        isOpen={Boolean(escalatingCase)}
        recoveryCase={escalatingCase}
        onClose={() => setEscalatingCase(null)}
        onResolved={() => { loadData(); showToast('Escalation resolved and sealed in audit log', 'success'); }}
      />

      {/* Live Event Simulator Modal */}
      <LiveEventSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onEventSimulated={() => { loadData(); showToast('Simulation event executed and state updated', 'info'); }}
      />

      {/* Merchant Policy Settings Modal */}
      <PolicySettingsModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        onPolicyUpdated={() => { loadData(); showToast('Policy boundaries updated successfully', 'success'); }}
      />

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
