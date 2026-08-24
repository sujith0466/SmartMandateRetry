import React, { useEffect, useState } from 'react';
import { fetchPolicies } from '../../services/api';
import { MerchantPolicy } from '../../types';
import { Shield } from 'lucide-react';

export const PoliciesPage: React.FC = () => {
  const [policy, setPolicy] = useState<MerchantPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPolicies()
      .then(setPolicy)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Safety Policies & Governance</h1>
        <p className="text-sm text-gray-500">
          Deterministic merchant safety boundaries enforced independently of AI recommendations.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading policies...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Max Retries (Post-Halt)
              </label>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {policy?.max_retries_per_case} attempts
              </div>
              <p className="text-xs text-gray-500 mt-1">Limits total recovery attempts per billing cycle</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Minimum Action Interval
              </label>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {policy?.min_retry_interval_hours} hours
              </div>
              <p className="text-xs text-gray-500 mt-1">Enforces cooling off between interventions</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                AI Confidence Threshold
              </label>
              <div className="text-xl font-bold text-gray-900 mt-1">
                {((policy?.min_confidence_threshold || 0.75) * 100).toFixed(0)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Decisions below this route to Human Review</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                High-Value Approval Cap
              </label>
              <div className="text-xl font-bold text-gray-900 mt-1">
                ₹{policy?.high_value_threshold_inr.toLocaleString('en-IN')}
              </div>
              <p className="text-xs text-gray-500 mt-1">Invoices above this require manual approval</p>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-start space-x-3">
            <Shield className="w-5 h-5 text-green-700 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-green-900">Hard Decline Auto-Stop Active</h3>
              <p className="text-xs text-green-700 mt-0.5">
                Permanent declines (e.g. DO_NOT_HONOUR, ACCOUNT_CLOSED) are automatically vetoed by the Policy Engine with zero automated retries.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
