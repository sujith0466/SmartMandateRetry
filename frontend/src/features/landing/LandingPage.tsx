import React, { useEffect } from 'react';
import { LandingNavbar } from './components/LandingNavbar';
import { HeroSection } from './components/HeroSection';
import { ProblemSection } from './components/ProblemSection';
import { ArchitectureSection } from './components/ArchitectureSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { FinancialImpactSection } from './components/FinancialImpactSection';
import { ProductConsoleShowcase } from './components/ProductConsoleShowcase';
import { ExplainabilitySection } from './components/ExplainabilitySection';
import { EnterpriseTrustSection } from './components/EnterpriseTrustSection';
import { CtaSection } from './components/CtaSection';
import { LandingFooter } from './components/LandingFooter';

export const LandingPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#111827] antialiased selection:bg-[#EEF2FF] selection:text-[#3B5BDB] font-sans">
      <LandingNavbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <ArchitectureSection />
        <HowItWorksSection />
        <FinancialImpactSection />
        <ProductConsoleShowcase />
        <ExplainabilitySection />
        <EnterpriseTrustSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
};
