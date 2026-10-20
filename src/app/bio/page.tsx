import BioLinkPage from "@/components/BioLinkPage";
import { plusJakarta } from "@/lib/bio-font";

export default function Page() {
  return (
    <div
      className={plusJakarta.variable}
      style={{ fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}
    >
      <BioLinkPage />
    </div>
  );
}
