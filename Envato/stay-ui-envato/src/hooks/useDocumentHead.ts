import { useEffect } from "react";

export interface DocumentHeadOptions {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  twitterCard?: string;
}

function ensureMeta(
  attr: "name" | "property",
  key: string,
  content: string
): { selector: string; prev: string | null } {
  const selector = attr === "name" ? `meta[name="${key}"]` : `meta[property="${key}"]`;
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  const prev = el?.content ?? null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
  return { selector, prev };
}

export function useDocumentHead(options: DocumentHeadOptions): void {
  useEffect(() => {
    const toRestore: Array<{ selector: string; prev: string | null }> = [];
    let titlePrev: string | null = null;
    let canonicalPrev: string | null = null;

    if (options.title !== undefined) {
      titlePrev = document.title;
      document.title = options.title;
    }

    const mappings: Array<[string, "name" | "property", string | undefined]> = [
      ["description", "name", options.description],
      ["keywords", "name", options.keywords],
      ["og:title", "property", options.ogTitle],
      ["og:description", "property", options.ogDescription],
      ["og:image", "property", options.ogImage],
      ["og:type", "property", options.ogType],
      ["twitter:card", "name", options.twitterCard ?? (options.ogImage ? "summary_large_image" : undefined)],
      ["twitter:title", "name", options.ogTitle],
      ["twitter:description", "name", options.ogDescription],
      ["twitter:image", "name", options.ogImage],
    ];

    for (const [key, attr, value] of mappings) {
      if (value === undefined || value === "") continue;
      toRestore.push(ensureMeta(attr, key, value));
    }

    if (options.canonicalUrl) {
      let canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (canon) canonicalPrev = canon.href;
      else {
        canon = document.createElement("link");
        canon.rel = "canonical";
        document.head.appendChild(canon);
      }
      canon.href = options.canonicalUrl;
    }

    return () => {
      if (titlePrev != null) document.title = titlePrev;
      for (const { selector, prev } of toRestore) {
        const el = document.querySelector(selector) as HTMLMetaElement | null;
        if (el) el.content = prev ?? "";
      }
      if (canonicalPrev !== null) {
        const canon = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
        if (canon) canon.href = canonicalPrev;
      }
    };
  }, [
    options.title,
    options.description,
    options.keywords,
    options.ogTitle,
    options.ogDescription,
    options.ogImage,
    options.ogType,
    options.canonicalUrl,
    options.twitterCard,
  ]);
}
