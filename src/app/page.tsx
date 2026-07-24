"use client";

import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustMarquee from "@/components/TrustMarquee";
import CaraPemesanan from "@/components/CaraPemesanan";
import Koleksi from "@/components/Koleksi";
import CreateYourPrice from "@/components/CreateYourPrice";
import Garansi from "@/components/Garansi";
import Instagram from "@/components/Instagram";
import Testimoni from "@/components/Testimoni";
import Tentang from "@/components/Tentang";
import PanduanSize from "@/components/PanduanSize";
import Faq from "@/components/Faq";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import AutoCTA from "@/components/AutoCTA";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function Home() {
  useScrollReveal();

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustMarquee />
        <CaraPemesanan />
        <Koleksi />
        <CreateYourPrice />
        <Garansi />
        <Instagram />
        <Testimoni />
        <Tentang />
        <PanduanSize />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <AutoCTA />
    </>
  );
}
