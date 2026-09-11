import React from 'react';
import { PageHeader } from '../components/PageHeader';
import {
  Database,
  Key,
  Calendar,
  Building,
  CheckCircle2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header */}
      <PageHeader
        title="System Parameters & Institutional Settings"
        subtitle="Global platform configuration, database connections, security parameters, and engine flags"
        breadcrumbs={[
          { label: 'ERP Shell', href: '#' },
          { label: 'Administration', href: '#' },
          { label: 'Settings' }
        ]}
      />

      {/* 2. Institutional Information Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
          <Building className="w-5 h-5 text-brand-600" />
          <h3 className="text-sm font-bold text-slate-900">Institution & Branding Master</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block">Institution Name</span>
            <span className="font-bold text-slate-900 text-xs">
              Vignan's Foundation for Science, Technology & Research
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block">Campus / Location</span>
            <span className="font-semibold text-slate-900">Vadlamudi, Guntur, Andhra Pradesh</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block">Accreditation Status</span>
            <span className="font-semibold text-amber-700">NAAC A+ Accredited • NIRF Rank 70</span>
          </div>
        </div>
      </div>

      {/* 3. Security & Cryptographic Config */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
          <Key className="w-5 h-5 text-brand-600" />
          <h3 className="text-sm font-bold text-slate-900">Security & Authentication Parameters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block">Password Hashing Algorithm</span>
            <span className="font-mono font-bold text-slate-900">Native Python bcrypt (cost 12)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block">JWT Token Signing</span>
            <span className="font-mono font-bold text-slate-900">HS256 (64-byte institutional key)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block">Access Token Expiration</span>
            <span className="font-mono font-bold text-emerald-700">1440 Minutes (24 Hours)</span>
          </div>
        </div>
      </div>

      {/* 4. Database & Storage */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
          <Database className="w-5 h-5 text-brand-600" />
          <h3 className="text-sm font-bold text-slate-900">Database Engine & Alembic Migrations</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block">Database Engine</span>
            <span className="font-mono font-bold text-slate-900">SQLite 3 (agent40.db) via SQLAlchemy</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block">Migration Revision Head</span>
            <span className="font-mono font-bold text-brand-700">3777183ae3dd (Initial 33 Tables)</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-slate-400 text-[10px] block">Audit Trail Integrity</span>
            <span className="font-semibold text-emerald-700">Append-Only SHA-256 Active</span>
          </div>
        </div>
      </div>

      {/* 5. Phase Roadmap Status */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-900">Agent 40 System Implementation Phases</h3>
          </div>
          <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
            Phase 1 Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Phase 1: Foundation & Shell
            </div>
            <p className="text-slate-600 text-[11px]">
              Database Schema, 35 Seeded Users, JWT Auth, RBAC, Append-only Audit, Enterprise ERP Shell.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-semibold text-slate-800">Phase 2: Fee Engine & Demands</div>
            <p className="text-slate-500 text-[11px]">
              Deterministic demand generation, scholarships, concessions, waivers, installments.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-semibold text-slate-800">Phase 3: Payments & Reconciler</div>
            <p className="text-slate-500 text-[11px]">
              Priority allocation, bank statement parser, mismatch triage, gateway sync.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
