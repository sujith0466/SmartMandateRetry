import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { CasesPage } from '../features/cases/CasesPage';
import { CaseDetailPage } from '../features/cases/CaseDetailPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { PoliciesPage } from '../features/policies/PoliciesPage';
import { AuditPage } from '../features/audit/AuditPage';
import { ObservabilityPage } from '../features/observability/ObservabilityPage';
import { EvaluationPage } from '../features/evaluation/EvaluationPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:caseId" element={<CaseDetailPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="observability" element={<ObservabilityPage />} />
        <Route path="evaluation" element={<EvaluationPage />} />
      </Route>
    </Routes>
  );
};
