import React from 'react';
import { FlaskConical } from 'lucide-react';

export const EvaluationPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Evaluation Lab</h1>
        <p className="text-sm text-gray-500">
          Empirical benchmarking environment comparing SmartMandateRetry against Razorpay native and rule-based baselines across 5,000 synthetic failure scenarios.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
        <FlaskConical className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-gray-900">Benchmark Lab Initialized</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
          Synthetic dataset runner and comparative uplift measurement pipelines will be fully connected in Phase 18 per the evaluation plan.
        </p>
      </div>
    </div>
  );
};
