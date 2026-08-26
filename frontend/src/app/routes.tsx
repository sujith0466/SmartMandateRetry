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
      {/* Public Flagship Enterprise Landing Page at root */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<Navigate to="/" replace />} />

      {/* Merchant Console Operational App Shell */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/:caseId" element={<CaseDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/evaluation" element={<EvaluationPage />} />
        {/* Legacy redirect */}
        <Route path="/observability" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};
