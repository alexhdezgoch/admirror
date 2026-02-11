import {
  MarketingNav,
  HeroSection,
  ProblemSection,
  SolutionSection,
  StatsSection,
  PricingSection,
  CTASection,
  DemoForm,
  Footer,
} from '@/components/marketing';

export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <StatsSection />
        <PricingSection />
        <CTASection />
        <DemoForm />
      </main>
      <Footer />
    </>
  );
}
