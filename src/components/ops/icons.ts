import * as Lucide from "lucide-react";

/**
 * Beberapa ikon lucide ada di runtime tapi belum ada di definisi tipe versi ini,
 * jadi diambil lewat namespace (dengan fallback nama lain) supaya tetap type-safe.
 */
const pick = (...names: string[]): any => {
  for (const n of names) {
    const icon = (Lucide as any)[n];
    if (icon) return icon;
  }
  return (Lucide as any).Circle;
};

export const IconCalendarClock = pick("CalendarClock", "Clock");
export const IconCheckCircle = pick("CheckCircle2", "CheckCircle");
export const IconExternalLink = pick("ExternalLink", "ArrowUpRight");
export const IconPhoneCall = pick("PhoneCall", "Phone");
export const IconBoxes = pick("Boxes", "Package");
export const IconLayers = pick("Layers", "Layers3", "Boxes", "Package");
export const IconPackageX = pick("PackageX", "PackageMinus", "Package");
export const IconArrowDownToLine = pick("ArrowDownToLine", "Download");
export const IconAlertTriangle = pick("AlertTriangle", "TriangleAlert");
