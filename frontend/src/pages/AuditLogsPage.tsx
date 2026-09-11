import React, { useEffect, useState } from 'react';
import { ApiClient } from '../services/api';
import { AuditLogItem } from '../types';
import { ScrollText, ShieldAlert, RefreshCw } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.get<AuditLogItem[]>('/audit-logs?limit=50');
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs. (Requires ADMIN or MANAGEMENT role)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-brand-400" />
            Append-Only Financial Audit Trail
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Every financial query, balance check, demand creation, and approval is permanently recorded.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg border border-gray-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {error ? (
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-6 text-center space-y-2">
          <ShieldAlert className="w-8 h-8 text-red-400 mx-auto" />
          <div className="text-sm font-semibold text-red-300">Access Restricted by RBAC</div>
          <p className="text-xs text-red-400 max-w-md mx-auto">{error}</p>
        </div>
      ) : (
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-900/80 border-b border-gray-800 text-gray-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Resource ID</th>
                  <th className="py-3 px-4">Actor Role</th>
                  <th className="py-3 px-4">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300">
                {logs.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono font-semibold text-[10px] bg-brand-950 text-brand-300 border border-brand-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-white">{log.resource_type}</td>
                      <td className="py-3 px-4 font-mono text-gray-400 truncate max-w-[120px]" title={log.resource_id}>
                        {log.resource_id || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400">{log.role || 'SYSTEM'}</td>
                      <td className="py-3 px-4 text-gray-400 max-w-xs truncate" title={log.reason || log.new_value}>
                        {log.reason || log.new_value || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
