import type { JntConfig } from "./types";

const BASE_URLS = {
  testing: {
    order: "https://demo-ecommerce.inuat-jntexpress.id/jts-idn-ecommerce-api/api/order/create",
    cancel: "https://demo-ecommerce.inuat-jntexpress.id/jts-idn-ecommerce-api/api/order/cancel",
    tariff: "https://demo-general.inuat-jntexpress.id/jandt_track/inquiry.action",
    track: "https://demo-general.inuat-jntexpress.id/jandt_track/track/trackAction!tracking.action",
  },
  production: {
    order: "https://ecommerce.jntexpress.id/jts-idn-ecommerce-api/api/order/create",
    cancel: "https://api.jet.co.id/jts-idn-ecommerce-api/api/order/cancel",
    tariff: "https://partner-track.jet.co.id/jandt_track/inquiry.action",
    track: "https://secure-jk.jet.co.id/jandt-order-web/track/trackAction!tracking.action",
  },
} as const;

export function getJntConfig(): JntConfig {
  return {
    env: (process.env.JNT_ENV as "testing" | "production") || "testing",
    orderUsername: process.env.JNT_ORDER_USERNAME || "",
    orderApiKey: process.env.JNT_ORDER_API_KEY || "",
    orderKey: process.env.JNT_ORDER_KEY || "",
    tariffKey: process.env.JNT_TARIFF_KEY || "",
    tariffCusName: process.env.JNT_TARIFF_CUS_NAME || "",
    trackUsername: process.env.JNT_TRACK_USERNAME || "",
    trackPassword: process.env.JNT_TRACK_PASSWORD || "",
    companyId: process.env.JNT_COMPANY_ID || "",
  };
}

export function getJntBaseUrl(endpoint: "order" | "cancel" | "tariff" | "track"): string {
  const env = (process.env.JNT_ENV as "testing" | "production") || "testing";
  return BASE_URLS[env][endpoint];
}
