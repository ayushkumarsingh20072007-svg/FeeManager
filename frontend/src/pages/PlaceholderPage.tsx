import React from 'react';
import { Layers, CheckCircle } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  phase: number;
  description: string;
  features: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  phase,
  description,
  features,
}) => {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 space-y-6 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-400">
              Phase {phase} Module
            </div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed">{description}</p>

        <div className="border-t border-gray-800 pt-6 space-y-3">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Planned Authoritative Capabilities
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-2.5 p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-gray-300"
              >
                <CheckCircle className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 flex items-center justify-between text-xs text-gray-400">
          <span>Backend ORM models & database tables for this module are already initialized in Phase 1.</span>
          <span className="font-mono text-brand-400 font-medium">Ready for Phase {phase}</span>
        </div>
      </div>
    </div>
  );
};
