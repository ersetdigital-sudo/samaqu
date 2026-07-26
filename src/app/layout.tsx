import type { Metadata } from "next";
import localFont from "next/font/local";
import Providers from "@/components/Providers";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site-config";
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
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
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
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${SITE_URL}#organization`,
              name: SITE_NAME,
              description: SITE_DESCRIPTION,
              url: SITE_URL,
              logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
              contactPoint: { "@type": "ContactPoint", telephone: "+62-85212150100", contactType: "customer service", availableLanguage: "Indonesian" },
            },
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}#website`,
              name: SITE_NAME,
              url: SITE_URL,
              publisher: { "@id": `${SITE_URL}#organization` },
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/katalog?q={search_term_string}` },
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }) }} />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
