import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { KpiCards } from './components/KpiCards';
import { RevenueFunnelChart } from './components/RevenueFunnelChart';
import { RecoveryQueueTable } from './components/RecoveryQueueTable';
import { AiDecisionDrawer } from './components/AiDecisionDrawer';
import { HumanEscalationQueue } from './components/HumanEscalationQueue';
import { AuditTrailTimeline } from './components/AuditTrailTimeline';
import { BenchmarkAnalyticsView } from './components/BenchmarkAnalyticsView';
import { LiveEventSimulatorModal } from './components/LiveEventSimulatorModal';
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
  
  // Data states
  const [kpis, setKpis] = useState<OverviewKPIs>({
    revenue_at_risk_rupees: 1880374,
    revenue_recovered_rupees: 796230,
    recovery_rate_pct: 42.34,
    ai_uplift_pct: 66.1,
    additional_recovered_rupees: 316870,
    active_recovery_cases: 127,
  });

  const [funnel, setFunnel] = useState<RevenueFunnel>({
    revenue_at_risk_rupees: 1880374,
    eligible_for_recovery_rupees: 1598317,
    interventions_executed_rupees: 1316261,
    successfully_recovered_rupees: 796230,
  });

  const [queue, setQueue] = useState<RecoveryCase[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [benchmarkReport, setBenchmarkReport] = useState<BenchmarkReport | null>(null);

  const [selectedCase, setSelectedCase] = useState<RecoveryCase | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [kpiRes, funnelRes, queueRes, auditRes, benchRes] = await Promise.all([
        api.getOverviewKPIs().catch(() => null),
        api.getRevenueFunnel().catch(() => null),
        api.getRecoveryQueue().catch(() => null),
        api.getAuditLogs(30).catch(() => null),
        api.getBenchmarkReport().catch(() => null),
      ]);

      if (kpiRes?.kpis) setKpis(kpiRes.kpis);
      if (funnelRes?.funnel) setFunnel(funnelRes.funnel);
      if (queueRes?.queue) setQueue(queueRes.queue);
      if (auditRes?.logs) setAuditLogs(auditRes.logs);
      if (benchRes?.report) setBenchmarkReport(benchRes.report);
    } catch (e) {
      console.error('Failed loading dashboard data:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Top Navbar */}
      <Navbar
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        isBackendConnected={true}
        isMockMode={false}
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
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-800'
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
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Recovery Queue</span>
              {queue.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {queue.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('escalations')}
              className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === 'escalations'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs border border-slate-200 dark:border-slate-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Human Escalations</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                activeTab === 'audit'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-800'
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
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-800'
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
            <KpiCards kpis={kpis} />
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
                    <span className="font-semibold text-slate-900 dark:text-white">₹10,000.00</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Max Retry Attempts</span>
                    <span className="font-semibold text-slate-900 dark:text-white">2 Retries</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Min Prob Threshold</span>
                    <span className="font-semibold text-slate-900 dark:text-white">40.0%</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Autonomous Execution</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Enabled</span>
                  </div>
                </div>
              </div>
            </div>
            <RecoveryQueueTable
              cases={queue}
              onSelectCase={setSelectedCase}
              onExecuteAction={(pid, act) => api.executeRecovery(pid, act).then(loadData)}
            />
          </div>
        )}

        {/* View 2: Queue */}
        {activeTab === 'queue' && (
          <RecoveryQueueTable
            cases={queue}
            onSelectCase={setSelectedCase}
            onExecuteAction={(pid, act) => api.executeRecovery(pid, act).then(loadData)}
          />
        )}

        {/* View 3: Escalations */}
        {activeTab === 'escalations' && (
          <HumanEscalationQueue
            cases={queue}
            onApprove={(pid) => api.executeRecovery(pid, 'PAYMENT_LINK').then(loadData)}
            onReject={(pid) => loadData()}
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

      {/* Slide-over AI Decision Drawer */}
      <AiDecisionDrawer
        caseItem={selectedCase}
        onClose={() => setSelectedCase(null)}
        onExecuteSuccess={loadData}
      />

      {/* Live Event Simulator Modal */}
      <LiveEventSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onEventSimulated={loadData}
      />

    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
