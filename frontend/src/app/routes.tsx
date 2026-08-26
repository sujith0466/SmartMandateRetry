import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { CasesPage } from '../features/cases/CasesPage';
import { CaseDetailPage } from '../features/cases/CaseDetailPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { PoliciesPage } from '../features/policies/PoliciesPage';
import { AuditPage } from '../features/audit/AuditPage';
import { EvaluationPage } from '../features/evaluation/EvaluationPage';
import { LandingPage } from '../features/landing/LandingPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Enterprise Landing Page Route */}
      <Route path="/landing" element={<LandingPage />} />

      {/* Merchant Console Operational App Shell */}
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<Navigate to="/" replace />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:caseId" element={<CaseDetailPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="evaluation" element={<EvaluationPage />} />
        {/* Redirect legacy /observability to dashboard */}
        <Route path="observability" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
