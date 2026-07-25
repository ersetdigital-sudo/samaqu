import type { Metadata } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import "./globals.css";

const inter = localFont({
  src: [
    { path: "../../public/fonts/inter_24pt-light.ttf", weight: "300", style: "normal" },
    { path: "../../public/fonts/inter_24pt-lightitalic.ttf", weight: "300", style: "italic" },
    { path: "../../public/fonts/inter_24pt-regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/inter_24pt-italic.ttf", weight: "400", style: "italic" },
    { path: "../../public/fonts/inter_24pt-medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/inter_24pt-mediumitalic.ttf", weight: "500", style: "italic" },
    { path: "../../public/fonts/inter_24pt-semibold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/inter_24pt-semibolditalic.ttf", weight: "600", style: "italic" },
    { path: "../../public/fonts/inter_24pt-bold.ttf", weight: "700", style: "normal" },
    { path: "../../public/fonts/inter_24pt-bolditalic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = localFont({
  src: [
    { path: "../../public/fonts/cormorantgaramond-wght--light.ttf", weight: "300", style: "normal" },
    { path: "../../public/fonts/cormorantgaramond-wght--lightitalic.ttf", weight: "300", style: "italic" },
    { path: "../../public/fonts/cormorantgaramond-wght--regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/cormorantgaramond-wght--italic.ttf", weight: "400", style: "italic" },
    { path: "../../public/fonts/cormorantgaramond-wght--medium.ttf", weight: "500", style: "normal" },
    { path: "../../public/fonts/cormorantgaramond-wght--mediumitalic.ttf", weight: "500", style: "italic" },
    { path: "../../public/fonts/cormorantgaramond-wght--semibold.ttf", weight: "600", style: "normal" },
    { path: "../../public/fonts/cormorantgaramond-wght--semibolditalic.ttf", weight: "600", style: "italic" },
    { path: "../../public/fonts/cormorantgaramond-wght--bold.ttf", weight: "700", style: "normal" },
    { path: "../../public/fonts/cormorantgaramond-wght--bolditalic.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SAMAQU — Busana Muslim Pria Premium",
  description:
    "SAMAQU — busana muslim pria premium. Thobe, Kandora, Koko, Vest, Kabak, Cover Hanger. Elegan, berkelas, dibuat dengan bahan pilihan. Pesan langsung via WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${cormorant.variable}`}>
      <body>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
