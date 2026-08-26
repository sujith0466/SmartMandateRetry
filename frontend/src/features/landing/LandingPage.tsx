import React, { useEffect } from 'react';
import { LandingNavbar } from './components/LandingNavbar';
import { HeroSection2 } from './components/HeroSection2';
import { ProblemTransformationSection } from './components/ProblemTransformationSection';
import { ProductIntelligenceSection } from './components/ProductIntelligenceSection';
import { DualBrainArchitectureSection } from './components/DualBrainArchitectureSection';
import { LifecycleScrollSection } from './components/LifecycleScrollSection';
import { FinancialImpactSection2 } from './components/FinancialImpactSection2';
import { ProductConsoleShowcase2 } from './components/ProductConsoleShowcase2';
import { ExplainabilityTrustSection } from './components/ExplainabilityTrustSection';
import { CinematicCtaSection } from './components/CinematicCtaSection';
import { MinimalFooter } from './components/MinimalFooter';

export const LandingPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#111827] antialiased selection:bg-[#EEF2FF] selection:text-[#3B5BDB] font-sans">
      <LandingNavbar />
      <main>
        <HeroSection2 />
        <ProblemTransformationSection />
        <ProductIntelligenceSection />
        <DualBrainArchitectureSection />
        <LifecycleScrollSection />
        <FinancialImpactSection2 />
        <ProductConsoleShowcase2 />
        <ExplainabilityTrustSection />
        <CinematicCtaSection />
      </main>
      <MinimalFooter />
    </div>
  );
};
