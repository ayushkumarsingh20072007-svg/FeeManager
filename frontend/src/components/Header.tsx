import React from 'react';
import { UserProfile, HealthStatus } from '../types';
import { RoleBadge } from './StatusBadge';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  health: HealthStatus | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, health, onLogout }) => {
  return (
    <header className="h-16 bg-[#111827] border-b border-gray-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Brand / System Status */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-brand-500/20">
            40
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              AGENT 40 <span className="text-xs text-brand-400 font-normal">| FEE MANAGEMENT SYSTEM</span>
            </h1>
          </div>
        </div>

        {/* Live Backend Health Tag */}
        {health && (
          <div className="hidden md:flex items-center space-x-2 px-2.5 py-1 rounded-md bg-gray-900 border border-gray-800 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${health.status === 'healthy' ? 'bg-emerald-400 opacity-75' : 'bg-red-400 opacity-75'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${health.status === 'healthy' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            </span>
            <span className="text-gray-300 font-mono">FastAPI API v{health.version} ({health.database})</span>
          </div>
        )}
      </div>

      {/* Right: User Profile & Logout */}
      {user && (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3 text-right">
            <div>
              <div className="text-sm font-medium text-white">{user.full_name}</div>
              <div className="text-xs text-gray-400">{user.email}</div>
            </div>
            <RoleBadge role={user.role} />
          </div>

          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-red-400 border border-gray-700 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
};
