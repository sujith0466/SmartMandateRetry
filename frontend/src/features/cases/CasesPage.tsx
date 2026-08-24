import React, { useEffect, useState } from 'react';
import { fetchCases } from '../../services/api';
import { RecoveryCase } from '../../types';

export const CasesPage: React.FC = () => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCases()
      .then((res) => setCases(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recovery Cases</h1>
        <p className="text-sm text-gray-500">
          Operational triage queue for failed subscription payments across Stage 1 (Pending) and Stage 2 (Halted).
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">All Cases ({cases.length})</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading cases...</div>
        ) : cases.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-gray-900">No active recovery cases</p>
            <p className="text-xs text-gray-500 mt-1">
              New cases will appear automatically upon webhook ingestion of payment failures.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">AI Strategy</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                  <td className="px-4 py-3">₹{c.amount_inr}</td>
                  <td className="px-4 py-3 text-xs">{c.stage}</td>
                  <td className="px-4 py-3 text-xs">{c.state}</td>
                  <td className="px-4 py-3 text-xs">{c.ai_recommended_action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
