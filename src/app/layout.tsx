import type { Metadata } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
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
  title: {
    default: "SAMAQU — Busana Muslim Pria Premium | Thobe, Kandora, Koko",
    template: "%s | SAMAQU",
  },
  description:
    "SAMAQU — busana muslim pria premium. Thobe, Kandora, Koko, Vest, Kabak, Cover Hanger. Bahan pilihan, jahitan rapi, cocok untuk ibadah dan acara istimewa. Pesan via WhatsApp.",
  keywords: ["SAMAQU", "busana muslim pria", "thobe", "kandora", "baju koko", "vest muslim", "premium menswear", "muslim fashion"],
  metadataBase: new URL("https://samaqu.vercel.app"),
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "SAMAQU",
    title: "SAMAQU — Busana Muslim Pria Premium",
    description: "Thobe, Kandora, Koko, Vest, Kabak. Bahan pilihan, jahitan rapi, dibuat untuk momen istimewa.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SAMAQU — Busana Muslim Pria Premium",
    description: "Thobe, Kandora, Koko, Vest, Kabak. Bahan pilihan, jahitan rapi, dibuat untuk momen istimewa.",
  },
  robots: { index: true, follow: true },
  other: {
    "theme-color": "#2A211B",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
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
          {children}
        </Providers>
      </body>
    </html>
  );
}
