"use client";

// ── Types ──

export interface MetaPixelConfig {
  pixelId: string;
  enabled: boolean;
  accessToken?: string;
  testEventCode?: string;
}

interface TrackResult {
  eventId: string;
}

// ── Globals ──

let _config: MetaPixelConfig | null = null;

export function setMetaPixelConfig(config: MetaPixelConfig | null) {
  _config = config;
}

export function getMetaPixelConfig(): MetaPixelConfig | null {
  return _config;
}

// ── Event ID Generator ──

export function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ── Internal helpers ──

function isReady(): boolean {
  if (!_config || !_config.enabled || !_config.pixelId) return false;
  if (typeof window === "undefined") return false;
  return typeof (window as any).fbq === "function";
}

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
    (window as any).fbq(...args);
  }
}

// ── CAPI Sender ──

export async function sendCAPIEvent(
  eventName: string,
  eventId: string,
  customData: Record<string, any>,
  userData?: { email?: string; phone?: string; externalId?: string }
): Promise<void> {
  if (!_config || !_config.enabled || !_config.accessToken) return;

  try {
    await fetch("/api/meta-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventId,
        customData,
        userData,
      }),
      keepalive: true,
    });
  } catch {
    // Fire-and-forget — errors must not affect UX
  }
}

// ── Standard Events ──

export function trackPageView(): TrackResult {
  const eventId = generateEventId();
  if (isReady()) {
    fbq("track", "PageView", {}, { eventID: eventId });
  }
  return { eventId };
}

export function trackViewContent(product: {
  id: string;
  name: string;
  price: number;
  category: string;
  content_type?: string;
}): TrackResult {
  const eventId = generateEventId();
  if (isReady()) {
    fbq(
      "track",
      "ViewContent",
      {
        content_ids: [product.id],
        content_name: product.name,
        content_type: product.content_type || "product",
        content_category: product.category,
        value: product.price,
        currency: "IDR",
      },
      { eventID: eventId }
    );
  }
  return { eventId };
}

export function trackSearch(searchString: string): TrackResult {
  const eventId = generateEventId();
  if (isReady()) {
    fbq("track", "Search", { search_string: searchString }, { eventID: eventId });
  }
  return { eventId };
}

export function trackAddToCart(product: {
  id: string;
  name: string;
  price: number;
  quantity: number;
  currency?: string;
}): TrackResult {
  const eventId = generateEventId();
  if (isReady()) {
    fbq(
      "track",
      "AddToCart",
      {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        value: product.price * product.quantity,
        currency: product.currency || "IDR",
        contents: [{ id: product.id, quantity: product.quantity, item_price: product.price }],
      },
      { eventID: eventId }
    );
  }
  return { eventId };
}

export function trackInitiateCheckout(value: number, numItems: number, contentIds: string[]): TrackResult {
  const eventId = generateEventId();
  if (isReady()) {
    fbq(
      "track",
      "InitiateCheckout",
      {
        content_ids: contentIds,
        content_type: "product",
        value,
        currency: "IDR",
        num_items: numItems,
      },
      { eventID: eventId }
    );
  }
  return { eventId };
}

export function trackPurchase(value: number, orderId: string, contentIds: string[], numItems: number): TrackResult {
  const eventId = generateEventId();
  if (isReady()) {
    fbq(
      "track",
      "Purchase",
      {
        content_ids: contentIds,
        content_type: "product",
        value,
        currency: "IDR",
        num_items: numItems,
        order_id: orderId,
      },
      { eventID: eventId }
    );
  }
  return { eventId };
}

export function trackLead(contentName: string): TrackResult {
  const eventId = generateEventId();
  if (isReady()) {
    fbq("track", "Lead", { content_name: contentName, currency: "IDR" }, { eventID: eventId });
  }
  return { eventId };
}

export function trackCompleteRegistration(method: string): TrackResult {
  const eventId = generateEventId();
  if (isReady()) {
    fbq(
      "track",
      "CompleteRegistration",
      { content_name: "Customer Account", status: "registered", registration_method: method },
      { eventID: eventId }
    );
  }
  return { eventId };
}

// ── Custom Events ──

export function trackWhatsAppClick(source: string, productId?: string): TrackResult {
  const eventId = generateEventId();
  if (isReady()) {
    fbq(
      "trackCustom",
      "WhatsAppClick",
      {
        source,
        ...(productId ? { content_ids: [productId], content_type: "product" } : {}),
      },
      { eventID: eventId }
    );
  }
  return { eventId };
}

export function trackFormSubmit(formName: string): TrackResult {
  const eventId = generateEventId();
  if (isReady()) {
    fbq("trackCustom", "FormSubmit", { form_name: formName }, { eventID: eventId });
  }
  return { eventId };
}
