import React from 'react';
import { FileText } from 'lucide-react';

export const AuditPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Append-Only Audit Trail</h1>
        <p className="text-sm text-gray-500">
          Immutable ledger recording all webhook events, AI proposals, policy gate checks, and financial actions.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-gray-900">Audit Ledger Initialized</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
          Every automated and manual decision in SmartMandateRetry is recorded in the append-only <code>audit_events</code> PostgreSQL table. Full search and export will be enabled in Phase 15.
        </p>
      </div>
    </div>
  );
};
