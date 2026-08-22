import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { ProblemStatement } from "@/components/landing/ProblemStatement";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhoItsFor } from "@/components/landing/WhoItsFor";
import { Features } from "@/components/landing/Features";
import { CtaBanner } from "@/components/landing/CtaBanner";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <ProblemStatement />
      <HowItWorks />
      <WhoItsFor />
      <Features />
      <CtaBanner />
      <Footer />
    </main>
  );
}
