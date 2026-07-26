"use client";

import { useEffect } from "react";
import { SITE_URL } from "@/lib/site-config";

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

export function buildProductJsonLd(product: {
  id: string; name: string; description: string; price: number;
  image: string; category: string; colors: string[];
  url: string; rating?: number; reviewCount?: number; inStock?: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image,
    sku: product.id,
    brand: { "@type": "Brand", name: "SAMAQU" },
    category: product.category,
    color: product.colors.join(", "),
    offers: {
      "@type": "Offer",
      url: product.url,
      priceCurrency: "IDR",
      price: product.price,
      availability: product.inStock !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "SAMAQU" },
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "ID",
        },
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "25000",
          currency: "IDR",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
        },
      },
    },
    aggregateRating: product.rating ? {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount || 0,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SAMAQU",
    description: "Premium Muslim Menswear — Busana pria muslim premium berkualitas tinggi.",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+62-85212150100",
      contactType: "customer service",
      availableLanguage: "Indonesian",
    },
    sameAs: [],
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SAMAQU",
    url: SITE_URL,
    description: "Premium Muslim Menswear — Busana pria muslim premium berkualitas tinggi.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/katalog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      name: "SAMAQU",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.svg` },
    },
  };
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildCollectionJsonLd(products: { id: string; name: string; price: number; image: string; url: string; category: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Katalog Produk SAMAQU",
    description: "Koleksi busana pria muslim premium dari SAMAQU — Thobe, Kandora, Koko, Vest, Kabak, dan Cover Hanger.",
    url: `${SITE_URL}/katalog`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.name,
          sku: p.id,
          category: p.category,
          image: p.image,
          offers: {
            "@type": "Offer",
            priceCurrency: "IDR",
            price: p.price,
            availability: "https://schema.org/InStock",
          },
        },
      })),
    },
  };
}

export function buildFAQJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
