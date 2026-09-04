import React, { useState } from 'react';
import { ShieldCheck, Sun, Moon, Play, Database, Sliders, ChevronDown, Check, Lock } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenSimulator: () => void;
  onOpenPolicySettings: () => void;
  isBackendConnected: boolean;
  isMockMode: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSimulator,
  onOpenPolicySettings,
  isBackendConnected,
  isMockMode,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, roles, switchRole, isAdmin } = useAuth();
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const getRoleShortLabel = (role?: string) => {
    switch (role) {
      case 'MERCHANT_ADMIN':
        return 'Admin';
      case 'OPERATIONS_LEAD':
        return 'Ops Lead';
      case 'COMPLIANCE_AUDITOR':
        return 'Auditor';
      default:
        return 'Operator';
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'MERCHANT_ADMIN':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/70';
      case 'OPERATIONS_LEAD':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/70';
      case 'COMPLIANCE_AUDITOR':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/70';
      default:
        return 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity & Compact Tag */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-outfit font-bold text-lg text-slate-900 dark:text-white tracking-tight">
              RecoverPay
            </span>
            <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/70 tracking-wide">
              AI
            </span>
            <span className="hidden lg:inline text-xs text-slate-400 dark:text-slate-500 font-normal pl-2 border-l border-slate-200 dark:border-slate-800">
              Autonomous Recovery
            </span>
          </div>
        </div>

        {/* Center / Context: Sleek Unified Environment Capsule */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-rose-500'}`} />
            <span>{isBackendConnected ? 'Razorpay Sandbox' : 'Disconnected'}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Database className="w-3 h-3 text-indigo-500" />
            <span>{isMockMode ? 'Mock DB' : 'Firestore Live'}</span>
          </span>
        </div>

        {/* Right: Harmonized Action Controls (All standard h-9) */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          
          {/* RBAC Operator Switcher */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="h-9 flex items-center space-x-2 px-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-all"
              title="Switch Active Operator Role (RBAC)"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                {user?.name ? user.name[0] : 'U'}
              </div>
              <span className="hidden sm:inline font-medium text-slate-800 dark:text-slate-200 max-w-[90px] truncate text-[12px]">
                {user?.name?.split(' ')[0] || 'Operator'}
              </span>
              <span className={`hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getRoleBadgeStyle(user?.role)}`}>
                {getRoleShortLabel(user?.role)}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setRoleDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Role-Based Access Control
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Switch active persona to test multi-tenant permissions
                    </p>
                  </div>

                  {(roles.length > 0 ? roles : [
                    { key: 'admin', role: 'MERCHANT_ADMIN', name: 'Sarah Chen (Merchant Admin)', description: 'Full access: Policy rules, simulation, overrides' },
                    { key: 'operator', role: 'OPERATIONS_LEAD', name: 'David Miller (Operations Lead)', description: 'Human Escalation resolution & review' },
                    { key: 'auditor', role: 'COMPLIANCE_AUDITOR', name: 'Elena Rostova (Compliance Auditor)', description: 'Read-only audit trail & reports' },
                  ]).map((r) => (
                    <button
                      key={r.key}
                      onClick={() => {
                        switchRole(r.key);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-start justify-between ${
                        user?.role === r.role
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{r.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{r.description}</p>
                      </div>
                      {user?.role === r.role && <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Policy Settings Button */}
          <button
            onClick={onOpenPolicySettings}
            className="h-9 px-2.5 sm:px-3 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 text-xs font-semibold"
            title="Merchant Policy Engine Configuration"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Policies</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-center"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-slate-700" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Live Event Simulator Trigger */}
          <button
            onClick={onOpenSimulator}
            disabled={!isAdmin}
            className={`h-9 inline-flex items-center space-x-1.5 px-3 sm:px-3.5 rounded-lg font-medium text-xs sm:text-xs shadow-sm transition-all active:scale-95 ${
              !isAdmin
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white shadow-indigo-500/25'
            }`}
            title={!isAdmin ? 'Merchant Admin permission required to inject simulated failure events' : 'Simulate Live Razorpay Payment Failure'}
          >
            {!isAdmin ? <Lock className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="hidden sm:inline">{!isAdmin ? 'Simulation (Admin Only)' : 'Simulate Event'}</span>
            <span className="sm:hidden">{!isAdmin ? 'Locked' : 'Simulate'}</span>
          </button>
        </div>

      </div>
    </header>
  );
};
