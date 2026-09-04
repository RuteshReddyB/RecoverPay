import React from 'react';
import { ShieldCheck, Sun, Moon, Play, Database, Sliders } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-outfit font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                RecoverPay AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Autonomous Revenue Recovery Control Center
            </p>
          </div>
        </div>

        {/* Status Badges & Controls */}
        <div className="flex items-center space-x-3">
          
          {/* Environment Badges */}
          <div className="hidden md:flex items-center space-x-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Razorpay Sandbox API
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
              <Database className="w-3.5 h-3.5 text-indigo-500" />
              {isMockMode ? 'Mock Firestore' : 'Firebase Firestore Live'}
            </span>
          </div>

          {/* Policy Settings Button */}
          <button
            onClick={onOpenPolicySettings}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5 text-xs font-semibold"
            title="Merchant Policy Rules"
          >
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden sm:inline">Policy Engine</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-slate-700" />
            ) : (
              <Sun className="w-5 h-5 text-amber-400" />
            )}
          </button>

          {/* Live Event Simulator Trigger */}
          <button
            onClick={onOpenSimulator}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm shadow-sm transition-all shadow-indigo-500/20 active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Simulate Event</span>
          </button>
        </div>

      </div>
    </header>
  );
};
