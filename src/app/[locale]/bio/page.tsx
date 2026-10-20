import BioLinkPage from "@/components/BioLinkPage";
import { plusJakarta } from "@/lib/bio-font";
import { fetchBioPageContent } from "@/lib/bio-page-content";

export const dynamic = "force-dynamic";

export default async function Page() {
  const content = await fetchBioPageContent();

  return (
    <div
      className={plusJakarta.variable}
      style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
    >
      <BioLinkPage content={content} />
    </div>
  );
}