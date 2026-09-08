"use client";

import Hero from "@/components/Hero";
import TrustMarquee from "@/components/TrustMarquee";
import CaraPemesanan from "@/components/CaraPemesanan";
import Koleksi from "@/components/Koleksi";
import CreateYourPrice from "@/components/CreateYourPrice";
import Garansi from "@/components/Garansi";
import Instagram from "@/components/Instagram";
import AboutSamaquLinks from "@/components/AboutSamaquLinks";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import AutoCTA from "@/components/AutoCTA";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function Home() {
  useScrollReveal();

  return (
    <>
      <main>
        <Hero />
        <TrustMarquee />
        <CaraPemesanan />
        <Koleksi />
        <CreateYourPrice />
        <Garansi />
        <Instagram />
        <AboutSamaquLinks />
        <FinalCta />
      </main>
      <Footer />
      <AutoCTA />
    </>
  );
}
