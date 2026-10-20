import BioLinkPage from "@/components/BioLinkPage";
import { plusJakarta } from "@/lib/bio-font";
import { fetchBioPageContent } from "@/lib/bio-page-content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bio Link (Video)",
  description: "Link resmi SAMAQU — koleksi Thobe, Koko, Vest, dan Kandora.",
};

export default async function Page() {
  const content = await fetchBioPageContent();

  return (
    <div
      className={plusJakarta.variable}
      style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
    >
      <BioLinkPage content={content} variant="v2" />
    </div>
  );
}
