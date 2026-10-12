import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

/**
 * Agen AI yang kita izinkan masuk (SEO + GEO).
 * OAI-SearchBot penting untuk ChatGPT Search, Google-CloudVertexBot untuk Vertex AI Agent.
 * Crawler "user-triggered" (ChatGPT-User, Google-Agent, dll) memang tidak menghiraukan
 * robots.txt — didaftarkan tetap supaya niat kita eksplisit.
 */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Google-CloudVertexBot",
  "Applebot",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "cohere-ai",
  "Meta-ExternalAgent",
  "Amazonbot",
  "YouBot",
  "DuckAssistBot",
  "MistralAI-User",
];

const PRIVATE_PATHS = ["/admin", "/api/", "/checkout", "/cart", "/akun", "/open-order"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: AI_AGENTS,
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
