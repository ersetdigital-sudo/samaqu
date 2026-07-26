"use client";

import { useEffect } from "react";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site-config";

interface SEOProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  type?: string;
  jsonLd?: Record<string, any>;
}

export function SEOHead({ title, description, url, image, type = "website", jsonLd }: SEOProps) {
  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`) as HTMLMetaElement;
      if (!el) { el = document.createElement("meta"); document.head.appendChild(el); }
      el.setAttribute(name.startsWith("og:") ? "property" : "name", name);
      el.setAttribute("content", content);
    };
    setMeta("description", description);
    setMeta("og:title", title);
    setMeta("og:description", description);
    setMeta("og:url", url);
    setMeta("og:type", type);
    setMeta("og:site_name", SITE_NAME);
    setMeta("og:locale", "id_ID");
    if (image) setMeta("og:image", image);
    setMeta("twitter:card", image ? "summary_large_image" : "summary");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    if (image) setMeta("twitter:image", image);
  }, [title, description, url, image, type]);

  useEffect(() => {
    if (!jsonLd) return;
    const id = "seo-jsonld";
    let script = document.getElementById(id) as HTMLScriptElement;
    if (!script) { script = document.createElement("script"); script.id = id; script.type = "application/ld+json"; document.head.appendChild(script); }
    script.textContent = JSON.stringify(jsonLd);
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, [jsonLd]);

  return null;
}

// Consolidated @graph builder
export function buildGraph(...schemas: Record<string, any>[]) {
  return { "@context": "https://schema.org", "@graph": schemas };
}

export function buildOrganization() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}#organization`,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg`, width: 200, height: 60 },
    contactPoint: { "@type": "ContactPoint", telephone: "+62-85212150100", contactType: "customer service", availableLanguage: "Indonesian" },
  };
}

export function buildWebSite() {
  return {
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
  };
}

export function buildProduct(product: {
  id: string; name: string; description: string; price: number;
  image: string; category: string; colors: string[]; inStock?: boolean;
}) {
  return {
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.id,
    brand: { "@type": "Brand", name: SITE_NAME },
    category: product.category,
    color: product.colors.join(", "),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/katalog/${product.id}`,
      priceCurrency: "IDR",
      price: product.price,
      availability: product.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": `${SITE_URL}#organization` },
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function buildBreadcrumb(items: { name: string; url?: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function buildItemList(products: { id: string; name: string; price: number; image: string; category: string }[]) {
  return {
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/katalog/${p.id}`,
      item: { "@type": "Product", name: p.name, sku: p.id, image: p.image, offers: { "@type": "Offer", priceCurrency: "IDR", price: p.price, availability: "https://schema.org/InStock" } },
    })),
  };
}

export function buildFAQPage(faqs: { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
