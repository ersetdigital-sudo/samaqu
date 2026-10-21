import type { ReactNode } from "react";

interface OrderDetailPanelProps {
  order: any;
  theme?: "panel" | "mono";
  latestTracking?: { status: string; location?: string | null; dateTime?: string | null } | null;
  trackingState?: string;
  shippingContent?: ReactNode;
  onOpenTrack?: () => void;
  /** Kode layanan J&T dari tracking (EZ/ECO) — fallback ke order.shipping_method. */
  serviceCode?: string | null;
}

export default function OrderDetailPanel(props: OrderDetailPanelProps): ReactNode;
