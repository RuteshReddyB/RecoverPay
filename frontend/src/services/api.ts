const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 
  (typeof window !== 'undefined' && window.location.port === '5174' ? 'http://127.0.0.1:8010' : 'http://127.0.0.1:8000');

export interface HealthResponse {
  status: string;
  timestamp: string;
  database: {
    type: string;
    mock_mode: boolean;
    connected: boolean;
  };
  environment: string;
}

export interface OverviewKPIs {
  revenue_at_risk_rupees: number;
  revenue_recovered_rupees: number;
  recovery_rate_pct: number;
  ai_uplift_pct: number;
  additional_recovered_rupees: number;
  active_recovery_cases: number;
}

export interface RevenueFunnel {
  revenue_at_risk_rupees: number;
  eligible_for_recovery_rupees: number;
  interventions_executed_rupees: number;
  successfully_recovered_rupees: number;
}

export interface RecoveryCase {
  id: string;
  payment_id: string;
  customer_id: string;
  customer_name: string;
  amount_rupees: number;
  amount_paisa: number;
  failure_reason: string;
  payment_method: string;
  status: 'PENDING' | 'READY' | 'EXECUTED' | 'BLOCKED' | 'HUMAN_ESCALATION';
  recommended_action: string;
  probability_pct: number;
  expected_recovery_rupees: number;
  created_at: string;
}

export interface ReasoningStep {
  step_index: number;
  tool_name: string;
  input_args: Record<string, any>;
  tool_output: Record<string, any>;
  reasoning: string;
}

export interface AgentExecution {
  payment_id: string;
  status: string;
  recommended_action: string;
  policy_status: string;
  policy_reason: string;
  expected_recovery_rupees: number;
  probability_pct: number;
  execution_result: Record<string, any>;
  reasoning_trace: ReasoningStep[];
  completed_at: string;
}

export interface AuditLogItem {
  id: string;
  event_id: string;
  timestamp: string;
  entity_type: string;
  entity_id: string;
  actor: string;
  action: string;
  details: Record<string, any>;
  hash: string;
}

export interface BenchmarkReport {
  summary: {
    events_evaluated: number;
    timestamp: string;
    winning_strategy: string;
    revenue_uplift_pct: number;
  };
  financial_metrics: {
    total_revenue_at_risk_rupees: number;
    baseline: {
      strategy_name: string;
      recovered_rupees: number;
      recovery_rate_pct: number;
      avg_recovery_per_event_rupees: number;
    };
    revenueguard_ai: {
      strategy_name: string;
      recovered_rupees: number;
      recovery_rate_pct: number;
      avg_recovery_per_event_rupees: number;
    };
    financial_uplift: {
      additional_revenue_recovered_rupees: number;
      revenue_uplift_pct: number;
    };
  };
  operational_metrics: {
    baseline_total_retries_attempted: number;
    baseline_doomed_retries_failed: number;
    ai_interventions_executed: number;
    ai_human_escalations_triggered: number;
    ai_blocked_actions: number;
    ai_avoided_doomed_retries: number;
    action_breakdown: Record<string, number>;
  };
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export const api = {
  getHealth: () => fetchJson<HealthResponse>('/api/health'),
  getOverviewKPIs: () => fetchJson<{ status: string; kpis: OverviewKPIs }>('/api/analytics/overview'),
  getRevenueFunnel: () => fetchJson<{ status: string; funnel: RevenueFunnel }>('/api/analytics/funnel'),
  getBenchmarkReport: () => fetchJson<{ status: string; report: BenchmarkReport }>('/api/analytics/benchmark'),
  
  getRecoveryQueue: async () => {
    const data = await fetchJson<{
      status: string;
      recovery_queue: any[];
      escalations_queue: any[];
    }>('/api/recovery/queue');

    const mappedQueue: RecoveryCase[] = (data.recovery_queue || []).map((item, idx) => ({
      id: item.payment_id || `case_${idx}`,
      payment_id: item.payment_id,
      customer_id: item.customer_id,
      customer_name: item.customer_name || 'Customer',
      amount_rupees: item.amount_rupees,
      amount_paisa: item.amount_paisa,
      failure_reason: item.failure_reason,
      payment_method: 'card',
      status: (item.policy_status === 'APPROVED' ? 'READY' : item.policy_status) as any,
      recommended_action: item.recommended_action,
      probability_pct: item.probability_pct,
      expected_recovery_rupees: item.expected_recovery_rupees,
      created_at: new Date().toISOString(),
    }));

    const mappedEscalations: RecoveryCase[] = (data.escalations_queue || []).map((item, idx) => ({
      id: item.payment_id || `esc_${idx}`,
      payment_id: item.payment_id,
      customer_id: item.customer_id,
      customer_name: item.customer_name || 'Customer',
      amount_rupees: item.amount_rupees,
      amount_paisa: item.amount_paisa,
      failure_reason: item.failure_reason,
      payment_method: 'card',
      status: 'HUMAN_ESCALATION',
      recommended_action: item.recommended_action,
      probability_pct: item.probability_pct,
      expected_recovery_rupees: item.expected_recovery_rupees,
      created_at: new Date().toISOString(),
    }));

    return {
      status: 'success',
      count: mappedQueue.length + mappedEscalations.length,
      queue: [...mappedQueue, ...mappedEscalations],
    };
  },
  
  evaluateRecovery: (paymentId: string, customerId?: string) =>
    fetchJson<{ status: string; evaluation: any }>('/api/recovery/evaluate', {
      method: 'POST',
      body: JSON.stringify({ payment_id: paymentId, customer_id: customerId }),
    }),

  executeRecovery: (paymentId: string, action: string) =>
    fetchJson<{ status: string; execution: any }>('/api/recovery/execute', {
      method: 'POST',
      body: JSON.stringify({ payment_id: paymentId, action: action }),
    }),

  runAutonomousAgent: (paymentId: string, customerId?: string) =>
    fetchJson<{ status: string; agent_execution: AgentExecution }>('/api/agent/run', {
      method: 'POST',
      body: JSON.stringify({ payment_id: paymentId, customer_id: customerId }),
    }),

  getAuditLogs: (limit: number = 50) =>
    fetchJson<{ status: string; count: number; logs: AuditLogItem[] }>(`/api/recovery/audit-logs?limit=${limit}`),

  simulateEvent: (eventType: 'bank_timeout' | 'card_expired' | 'high_value' | 'duplicate_webhook') =>
    fetchJson<{ status: string; simulated_event: any; agent_result: AgentExecution; agent_execution?: AgentExecution }>('/api/agent/run', {
      method: 'POST',
      body: JSON.stringify({
        payment_id: `pay_sim_${eventType}_${Date.now().toString().slice(-4)}`,
        customer_id: eventType === 'high_value' ? 'c_vip_808' : 'c_demo_101',
      }),
    }),
};
