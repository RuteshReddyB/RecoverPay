import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { RevenueFunnel } from '../services/api';

interface RevenueFunnelChartProps {
  funnel: RevenueFunnel;
}

export const RevenueFunnelChart: React.FC<RevenueFunnelChartProps> = ({ funnel }) => {
  const data = [
    {
      stage: '1. At Risk',
      amount: funnel.revenue_at_risk_rupees || 1880374,
      color: '#F43F5E', // Rose
    },
    {
      stage: '2. Eligible',
      amount: funnel.eligible_for_recovery_rupees || 1598317,
      color: '#F59E0B', // Amber
    },
    {
      stage: '3. Executed',
      amount: funnel.interventions_executed_rupees || 1316261,
      color: '#4F46E5', // Indigo
    },
    {
      stage: '4. Recovered',
      amount: funnel.successfully_recovered_rupees || 796230,
      color: '#10B981', // Emerald
    },
  ];

  const formatLakhs = (val: number) => `₹${(val / 100000).toFixed(1)}L`;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-outfit">
            Autonomous Revenue Funnel
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Conversion efficiency from initial failure detection to final bank settlement
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
            <XAxis type="number" tickFormatter={formatLakhs} stroke="#94A3B8" fontSize={12} />
            <YAxis dataKey="stage" type="category" stroke="#94A3B8" fontSize={12} tickLine={false} />
            <Tooltip
              formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
              contentStyle={{
                backgroundColor: '#1E293B',
                borderColor: '#334155',
                color: '#F8FAFC',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={28}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
